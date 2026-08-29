const DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com";
const DEFAULT_MODEL = "MiniMax/speech-2.8-hd";

class BailianError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "BailianError";
    this.statusCode = options.statusCode || 502;
    this.traceId = options.traceId || "";
    this.details = options.details || null;
  }
}

function normalizeModel(model = DEFAULT_MODEL) {
  return model.startsWith("MiniMax/") ? model : `MiniMax/${model}`;
}

function errorCode(payload) {
  return payload?.code || payload?.output?.base_resp?.status_code || payload?.base_resp?.status_code;
}

function apiMessage(payload, fallback) {
  const code = errorCode(payload);
  const rawMessage = payload?.message || payload?.output?.base_resp?.status_msg || payload?.base_resp?.status_msg || "";
  if (code === "InvalidParameter" && /product is not activated/i.test(rawMessage)) {
    return "阿里云百炼模型服务尚未开通。请在华北 2（北京）地域开通百炼模型服务及 MiniMax Speech 模型后重试";
  }
  const friendlyMessages = {
    InvalidApiKey: "百炼 API Key 无效，请确认使用的是华北 2（北京）地域的百炼 Key",
    InvalidParameter: "请求参数不符合百炼接口要求，请检查音频和输入内容",
    DataInspectionFailed: "音频或文字未通过百炼内容安全检查，请更换内容后重试",
    Arrearage: "阿里云百炼账户欠费或余额不足，请充值后重试",
    AccessDenied: "当前百炼账号无权调用该模型，请在百炼控制台开通 MiniMax 模型",
    "Model.AccessDenied": "当前百炼账号无权调用 MiniMax 模型，请检查模型授权和 Key 所属地域",
    1004: "百炼转发的 MiniMax 鉴权失败，请稍后重试或联系阿里云百炼客服",
    1008: "阿里云百炼账户余额不足，请充值后重试",
    1043: "录音内容与校验文本不一致，请检查后重试",
    2013: "请求参数不符合 MiniMax 模型要求，请检查音频和输入内容",
    2038: "百炼侧 MiniMax 音色复刻权限不可用，请确认使用北京地域百炼 Key并已开通该模型",
  };
  return friendlyMessages[code] || rawMessage || fallback;
}

function assertApiSuccess(payload, fallback = "阿里云百炼 API 调用失败") {
  const code = errorCode(payload);
  const failed = typeof code === "number" ? code !== 0 : Boolean(code);
  if (failed) {
    throw new BailianError(`${apiMessage(payload, fallback)}（错误码 ${code}）`, {
      traceId: payload?.request_id || payload?.output?.trace_id || payload?.trace_id,
      details: payload,
    });
  }
}

async function parseJsonResponse(response) {
  const raw = await response.text();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new BailianError(`百炼返回了无法解析的响应（HTTP ${response.status}）`, {
      statusCode: response.status || 502,
      details: raw.slice(0, 500),
    });
  }

  if (!response.ok) {
    throw new BailianError(apiMessage(payload, `百炼请求失败（HTTP ${response.status}）`), {
      statusCode: response.status,
      traceId: payload?.request_id,
      details: payload,
    });
  }
  assertApiSuccess(payload);
  return payload;
}

function safeUploadName(name) {
  const cleaned = String(name || "voice.wav").replace(/[^A-Za-z0-9._-]+/g, "_");
  return `${Date.now()}_${cleaned.slice(-100) || "voice.wav"}`;
}

class BailianMiniMaxClient {
  constructor({ apiKey, baseUrl = DEFAULT_BASE_URL, fetchImpl = fetch }) {
    if (!apiKey) throw new BailianError("尚未配置阿里云百炼 API Key", { statusCode: 401 });
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetch = fetchImpl;
  }

  headers(extra = {}) {
    return { Authorization: `Bearer ${this.apiKey}`, ...extra };
  }

  async getUploadPolicy(model = DEFAULT_MODEL) {
    const url = new URL(`${this.baseUrl}/api/v1/uploads`);
    url.searchParams.set("action", "getPolicy");
    url.searchParams.set("model", normalizeModel(model));
    const response = await this.fetch(url, {
      method: "GET",
      headers: this.headers({ "Content-Type": "application/json" }),
      signal: AbortSignal.timeout(60_000),
    });
    const payload = await parseJsonResponse(response);
    if (!payload?.data?.upload_host || !payload?.data?.upload_dir) {
      throw new BailianError("百炼已验证 Key，但没有返回临时文件上传凭证", { details: payload });
    }
    return payload.data;
  }

  async validateConnection() {
    await this.getUploadPolicy(DEFAULT_MODEL);
    return true;
  }

  async uploadVoice(file, model = DEFAULT_MODEL) {
    const policy = await this.getUploadPolicy(model);
    const fileName = safeUploadName(file.name);
    const key = `${policy.upload_dir}/${fileName}`;
    const body = new FormData();
    body.append("OSSAccessKeyId", policy.oss_access_key_id);
    body.append("Signature", policy.signature);
    body.append("policy", policy.policy);
    if (policy.x_oss_object_acl) body.append("x-oss-object-acl", policy.x_oss_object_acl);
    if (policy.x_oss_forbid_overwrite) body.append("x-oss-forbid-overwrite", policy.x_oss_forbid_overwrite);
    body.append("key", key);
    body.append("success_action_status", "200");
    body.append("file", file, fileName);

    const response = await this.fetch(policy.upload_host, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(180_000),
    });
    if (!response.ok) {
      const details = (await response.text()).slice(0, 500);
      throw new BailianError(`声音样本上传到百炼临时存储失败（HTTP ${response.status}）`, {
        statusCode: response.status,
        details,
      });
    }
    return {
      audioUrl: `oss://${key}`,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    };
  }

  async cloneVoice({
    audioUrl,
    voiceId,
    model = DEFAULT_MODEL,
    noiseReduction = true,
    volumeNormalization = true,
    text = "你好，这是我的专属声音。",
    language = "auto",
  }) {
    const input = {
      action: "voice_clone",
      voice_id: voiceId,
      audio_url: audioUrl,
      text,
      language_boost: language,
      need_noise_reduction: Boolean(noiseReduction),
      need_volume_normalization: Boolean(volumeNormalization),
      aigc_watermark: false,
    };
    const response = await this.fetch(`${this.baseUrl}/api/v1/services/aigc/multimodal-generation/generation`, {
      method: "POST",
      headers: this.headers({
        "Content-Type": "application/json; charset=utf-8",
        ...(audioUrl.startsWith("oss://") ? { "X-DashScope-OssResourceResolve": "enable" } : {}),
      }),
      body: JSON.stringify({ model: normalizeModel(model), input }),
      signal: AbortSignal.timeout(180_000),
    });
    const payload = await parseJsonResponse(response);
    return { demoAudioUrl: payload?.output?.demo_audio || "", payload };
  }

  async synthesize({
    text,
    voiceId,
    model = DEFAULT_MODEL,
    speed = 1,
    volume = 1,
    pitch = 0,
    emotion = "",
    language = "auto",
    format = "mp3",
    sampleRate = 32000,
  }) {
    const voiceSetting = {
      voice_id: voiceId,
      speed: Number(speed),
      vol: Number(volume),
      pitch: Number(pitch),
    };
    if (emotion) voiceSetting.emotion = emotion;

    const input = {
      text,
      voice_setting: voiceSetting,
      audio_setting: {
        sample_rate: Number(sampleRate),
        bitrate: format === "mp3" ? 128000 : undefined,
        format,
        channel: 1,
      },
      language_boost: language || "auto",
      subtitle_enable: false,
      output_format: "hex",
      aigc_watermark: false,
    };
    const response = await this.fetch(`${this.baseUrl}/api/v1/services/aigc/multimodal-generation/generation`, {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ model: normalizeModel(model), input }),
      signal: AbortSignal.timeout(180_000),
    });
    const payload = await parseJsonResponse(response);
    const audioHex = payload?.output?.data?.audio;
    if (!audioHex || !/^[0-9a-f]+$/i.test(audioHex) || audioHex.length % 2 !== 0) {
      throw new BailianError("百炼已返回结果，但音频数据格式异常", {
        traceId: payload?.request_id || payload?.output?.trace_id,
        details: payload,
      });
    }
    return {
      audio: Buffer.from(audioHex, "hex"),
      extraInfo: payload.output.extra_info || {},
      usage: payload.usage || {},
      traceId: payload.output.trace_id || payload.request_id || "",
      payload,
    };
  }
}

module.exports = {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  BailianMiniMaxClient,
  BailianError,
  normalizeModel,
  assertApiSuccess,
};
