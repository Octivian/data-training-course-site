const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { Readable } = require("node:stream");
const { BailianMiniMaxClient, BailianError } = require("./lib/bailian");
const { LocalStore } = require("./lib/store");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const store = new LocalStore(process.env.DATA_DIR || path.join(ROOT, ".data"));
const SESSION_COOKIE = "minimax_session";

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

function secureHeaders(extra = {}) {
  return {
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    ...extra,
  };
}

function sendJson(res, status, payload) {
  res.writeHead(status, secureHeaders({ "Content-Type": "application/json; charset=utf-8" }));
  res.end(JSON.stringify(payload));
}

function sendError(res, error) {
  const status = error.statusCode || 500;
  sendJson(res, status, {
    ok: false,
    error: error.message || "服务器发生错误",
    traceId: error.traceId || "",
  });
}

async function readJsonBody(req, maxBytes = 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      const error = new Error("请求内容过大");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    const error = new Error("请求 JSON 格式不正确");
    error.statusCode = 400;
    throw error;
  }
}

async function readMultipart(req) {
  const contentLength = Number(req.headers["content-length"] || 0);
  if (contentLength > 25 * 1024 * 1024) {
    const error = new Error("音频文件不能超过 20 MB");
    error.statusCode = 413;
    throw error;
  }
  const request = new Request(`http://${HOST}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: Readable.toWeb(req),
    duplex: "half",
  });
  return request.formData();
}

function managedApiKey() {
  return String(process.env.BAILIAN_API_KEY || "").trim();
}

function accessCode() {
  return String(process.env.APP_ACCESS_CODE || "").trim();
}

function constantTimeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function sessionToken() {
  const code = accessCode();
  if (!code) return "";
  const secret = String(process.env.SESSION_SECRET || crypto.createHash("sha256").update(code).digest("hex"));
  return crypto.createHmac("sha256", secret).update("minimax-audio-internal").digest("hex");
}

function cookieValue(req, name) {
  const cookies = String(req.headers.cookie || "").split(";");
  for (const cookie of cookies) {
    const [key, ...parts] = cookie.trim().split("=");
    if (key === name) return decodeURIComponent(parts.join("="));
  }
  return "";
}

function isAuthenticated(req) {
  if (!accessCode()) return true;
  return constantTimeEqual(cookieValue(req, SESSION_COOKIE), sessionToken());
}

function sessionCookie(req, value, maxAge) {
  const secure = req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

async function getClient() {
  const environmentKey = managedApiKey();
  if (environmentKey) return new BailianMiniMaxClient({ apiKey: environmentKey });
  const settings = await store.getSettings();
  if (!settings.apiKey || settings.provider !== "bailian") {
    throw new BailianError("请先在 API 设置中重新保存阿里云百炼 API Key", { statusCode: 401 });
  }
  return new BailianMiniMaxClient({ apiKey: settings.apiKey });
}

function validVoiceId(value) {
  return /^[A-Za-z][A-Za-z0-9_-]{6,254}[A-Za-z0-9]$/.test(value);
}

function audioType(format) {
  return {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    flac: "audio/flac",
  }[format] || "application/octet-stream";
}

function safeFilename(value) {
  const cleaned = value.replace(/[^\p{L}\p{N}_-]+/gu, "_").replace(/^_+|_+$/g, "");
  return cleaned.slice(0, 60) || "minimax_audio";
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    return sendJson(res, 200, { ok: true, service: "百炼 MiniMax 配音" });
  }

  if (req.method === "GET" && url.pathname === "/api/session") {
    return sendJson(res, 200, {
      ok: true,
      required: Boolean(accessCode()),
      authenticated: isAuthenticated(req),
    });
  }

  if (req.method === "POST" && url.pathname === "/api/session") {
    const body = await readJsonBody(req);
    if (!accessCode() || constantTimeEqual(String(body.accessCode || ""), accessCode())) {
      res.setHeader("Set-Cookie", sessionCookie(req, sessionToken(), 7 * 24 * 60 * 60));
      return sendJson(res, 200, { ok: true });
    }
    const error = new Error("访问口令不正确");
    error.statusCode = 401;
    throw error;
  }

  if (req.method === "DELETE" && url.pathname === "/api/session") {
    res.setHeader("Set-Cookie", sessionCookie(req, "", 0));
    return sendJson(res, 200, { ok: true });
  }

  if (!isAuthenticated(req)) {
    const error = new Error("请先输入公司内部访问口令");
    error.statusCode = 401;
    throw error;
  }

  if (req.method === "GET" && url.pathname === "/api/settings") {
    const environmentKey = managedApiKey();
    const settings = environmentKey ? { apiKey: environmentKey, provider: "bailian" } : await store.getSettings();
    const configured = Boolean(settings.apiKey && settings.provider === "bailian");
    return sendJson(res, 200, {
      ok: true,
      configured,
      managed: Boolean(environmentKey),
      maskedKey: configured && !environmentKey ? `${settings.apiKey.slice(0, 4)}••••${settings.apiKey.slice(-4)}` : "",
    });
  }

  if (req.method === "POST" && url.pathname === "/api/settings") {
    if (managedApiKey()) {
      const error = new Error("公司 API Key 由服务器统一管理，页面不可修改");
      error.statusCode = 403;
      throw error;
    }
    const body = await readJsonBody(req);
    const apiKey = String(body.apiKey || "").trim();
    if (apiKey.length < 12) {
      const error = new Error("API Key 格式不正确");
      error.statusCode = 400;
      throw error;
    }
    const client = new BailianMiniMaxClient({ apiKey });
    await client.validateConnection();
    await store.saveSettings({ apiKey });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "DELETE" && url.pathname === "/api/settings") {
    if (managedApiKey()) {
      const error = new Error("公司 API Key 由服务器统一管理，页面不可清除");
      error.statusCode = 403;
      throw error;
    }
    await store.clearSettings();
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "GET" && url.pathname === "/api/voices") {
    return sendJson(res, 200, { ok: true, voices: await store.getVoices() });
  }

  if (req.method === "POST" && url.pathname === "/api/voices/sync") {
    await getClient();
    return sendJson(res, 200, { ok: true, voices: await store.getVoices() });
  }

  if (req.method === "POST" && url.pathname === "/api/voices/clone") {
    const form = await readMultipart(req);
    const file = form.get("audio");
    const voiceId = String(form.get("voiceId") || "").trim();
    const name = String(form.get("name") || "").trim();
    const model = String(form.get("model") || "speech-2.8-hd");
    const activationText = String(form.get("activationText") || "你好，这是我的专属声音。欢迎再次听见我。由此刻开始，让声音替我表达。")
      .trim()
      .slice(0, 500);

    if (!file || typeof file.arrayBuffer !== "function") {
      const error = new Error("请选择待克隆的音频文件");
      error.statusCode = 400;
      throw error;
    }
    if (file.size > 20 * 1024 * 1024) {
      const error = new Error("音频文件不能超过 20 MB");
      error.statusCode = 413;
      throw error;
    }
    if (!/\.(mp3|m4a|wav)$/i.test(file.name || "")) {
      const error = new Error("仅支持 MP3、M4A 或 WAV 文件");
      error.statusCode = 400;
      throw error;
    }
    if (!name) {
      const error = new Error("请填写音色名称");
      error.statusCode = 400;
      throw error;
    }
    if (!validVoiceId(voiceId)) {
      const error = new Error("音色 ID 需以字母开头，长度 8–256，只能包含字母、数字、- 和 _");
      error.statusCode = 400;
      throw error;
    }

    const client = await getClient();
    const { audioUrl } = await client.uploadVoice(file, model);
    await client.cloneVoice({
      audioUrl,
      voiceId,
      model,
      noiseReduction: form.get("noiseReduction") !== "false",
      volumeNormalization: form.get("volumeNormalization") !== "false",
      text: activationText,
    });

    const createdAt = new Date().toISOString();
    await store.upsertVoice({
      id: voiceId,
      name,
      model,
      activated: false,
      createdAt,
      source: "百炼 MiniMax",
    });

    try {
      const generated = await client.synthesize({
        text: activationText,
        voiceId,
        model,
        format: "mp3",
      });
      const voice = await store.upsertVoice({
        id: voiceId,
        name,
        model,
        activated: true,
        activatedAt: new Date().toISOString(),
        createdAt,
        source: "百炼 MiniMax",
      });
      return sendJson(res, 200, {
        ok: true,
        voice,
        activated: true,
        audioBase64: generated.audio.toString("base64"),
        mimeType: "audio/mpeg",
        usageCharacters: generated.extraInfo.usage_characters || activationText.length,
      });
    } catch (error) {
      return sendJson(res, 207, {
        ok: true,
        activated: false,
        voice: (await store.getVoices()).find((voice) => voice.id === voiceId),
        warning: `音色已克隆，但首次解锁合成失败：${error.message}。请稍后在配音页使用此音色完成首次合成。`,
      });
    }
  }

  if (req.method === "PATCH" && url.pathname.startsWith("/api/voices/")) {
    const id = decodeURIComponent(url.pathname.slice("/api/voices/".length));
    const body = await readJsonBody(req);
    const voices = await store.getVoices();
    const existing = voices.find((voice) => voice.id === id);
    if (!existing) {
      const error = new Error("未找到该音色");
      error.statusCode = 404;
      throw error;
    }
    const voice = await store.upsertVoice({ ...existing, name: String(body.name || existing.name).trim() });
    return sendJson(res, 200, { ok: true, voice });
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/voices/")) {
    const id = decodeURIComponent(url.pathname.slice("/api/voices/".length));
    await store.removeVoice(id);
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/synthesize") {
    const body = await readJsonBody(req, 2 * 1024 * 1024);
    const text = String(body.text || "").trim();
    const voiceId = String(body.voiceId || "").trim();
    const model = ["speech-2.8-hd", "speech-2.8-turbo"].includes(body.model)
      ? body.model
      : "speech-2.8-hd";
    const format = ["mp3", "wav", "flac"].includes(body.format) ? body.format : "mp3";
    if (!text || text.length >= 10_000) {
      const error = new Error("配音文本需为 1–9999 个字符");
      error.statusCode = 400;
      throw error;
    }
    if (!voiceId) {
      const error = new Error("请选择音色");
      error.statusCode = 400;
      throw error;
    }

    const client = await getClient();
    const generated = await client.synthesize({
      text,
      voiceId,
      model,
      speed: Math.min(2, Math.max(0.5, Number(body.speed || 1))),
      volume: Math.min(10, Math.max(0.1, Number(body.volume || 1))),
      pitch: Math.min(12, Math.max(-12, Number(body.pitch || 0))),
      emotion: String(body.emotion || ""),
      language: String(body.language || "auto"),
      format,
      sampleRate: Number(body.sampleRate || 32000),
    });

    const voices = await store.getVoices();
    const existing = voices.find((voice) => voice.id === voiceId);
    if (existing && !existing.activated) {
      await store.upsertVoice({ ...existing, activated: true, activatedAt: new Date().toISOString() });
    }

    const filename = `${safeFilename(body.filename || existing?.name || "minimax_audio")}_${Date.now()}.${format}`;
    res.writeHead(200, secureHeaders({
      "Content-Type": audioType(format),
      "Content-Length": generated.audio.length,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "X-Usage-Characters": String(generated.extraInfo.usage_characters || text.length),
      "X-Audio-Length": String(generated.extraInfo.audio_length || 0),
      "X-Trace-Id": generated.traceId,
      "X-Filename": encodeURIComponent(filename),
    }));
    return res.end(generated.audio);
  }

  return sendJson(res, 404, { ok: false, error: "接口不存在" });
}

async function serveStatic(req, res, url) {
  const requestPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const resolved = path.resolve(PUBLIC_DIR, `.${requestPath}`);
  if (!resolved.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
    return sendJson(res, 403, { ok: false, error: "禁止访问" });
  }
  try {
    const content = await fs.readFile(resolved);
    res.writeHead(200, secureHeaders({ "Content-Type": CONTENT_TYPES[path.extname(resolved)] || "application/octet-stream" }));
    res.end(content);
  } catch (error) {
    if (error.code === "ENOENT") return sendJson(res, 404, { ok: false, error: "页面不存在" });
    throw error;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    if (url.pathname.startsWith("/api/")) await handleApi(req, res, url);
    else await serveStatic(req, res, url);
  } catch (error) {
    if (!error.statusCode || error.statusCode >= 500) console.error(error);
    sendError(res, error);
  }
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`百炼 MiniMax 配音已启动：http://${HOST}:${PORT}`);
  });
}

module.exports = {
  server,
  handleApi,
  safeFilename,
  validVoiceId,
  constantTimeEqual,
  isAuthenticated,
  sessionToken,
};
