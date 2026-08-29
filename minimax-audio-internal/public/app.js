const state = {
  configured: false,
  managed: false,
  sessionRequired: false,
  voices: [],
  selectedVoiceId: localStorage.getItem("minimax-selected-voice") || "",
  model: localStorage.getItem("minimax-model") || "speech-2.8-hd",
  audioUrl: "",
  cloneAudioUrl: "",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  apiStatus: $("#api-status"),
  voiceList: $("#voice-list"),
  voiceEmpty: $("#voice-empty"),
  voiceCount: $("#voice-count"),
  selectedVoiceName: $("#selected-voice-name"),
  speechText: $("#speech-text"),
  textCount: $("#text-count"),
  costEstimate: $("#cost-estimate"),
  synthesizeForm: $("#synthesize-form"),
  generateButton: $("#generate-button"),
  generationMeta: $("#generation-meta"),
  audioResult: $("#audio-result"),
  audioPlayer: $("#audio-player"),
  downloadAudio: $("#download-audio"),
  cloneForm: $("#clone-form"),
  cloneAudio: $("#clone-audio"),
  uploadTitle: $("#upload-title"),
  uploadMeta: $("#upload-meta"),
  dropZone: $("#drop-zone"),
  voiceName: $("#voice-name"),
  voiceId: $("#voice-id"),
  cloneButton: $("#clone-button"),
  cloneProgress: $("#clone-progress"),
  cloneResult: $("#clone-result"),
  clonePlayer: $("#clone-player"),
  cloneResultTitle: $("#clone-result-title"),
  accessDialog: $("#access-dialog"),
  accessForm: $("#access-form"),
  accessCode: $("#access-code"),
  accessSubmit: $("#access-submit"),
  settingsDialog: $("#settings-dialog"),
  settingsForm: $("#settings-form"),
  apiKey: $("#api-key"),
  savedKeyState: $("#saved-key-state"),
  toast: $("#toast"),
};

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.remove("show"), 3600);
}

async function api(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({ error: "服务器响应异常" }));
  if (!response.ok && response.status !== 207) {
    const trace = payload.traceId ? ` · Trace ${payload.traceId}` : "";
    throw new Error(`${payload.error || "请求失败"}${trace}`);
  }
  return payload;
}

function setBusy(button, busy, idleText, busyText) {
  button.disabled = busy;
  button.textContent = busy ? busyText : idleText;
}

function switchTab(name) {
  $$(".tab-button").forEach((button) => button.classList.toggle("active", button.dataset.tab === name));
  $$(".panel").forEach((panel) => panel.classList.toggle("active", panel.id === `panel-${name}`));
}

function selectedVoice() {
  return state.voices.find((voice) => voice.id === state.selectedVoiceId);
}

function selectVoice(id) {
  state.selectedVoiceId = id;
  localStorage.setItem("minimax-selected-voice", id);
  renderVoices();
}

function voiceInitial(name) {
  return (name || "音").trim().slice(0, 1).toUpperCase();
}

function renderVoices() {
  if (state.selectedVoiceId && !state.voices.some((voice) => voice.id === state.selectedVoiceId)) {
    state.selectedVoiceId = "";
  }
  if (!state.selectedVoiceId && state.voices.length) state.selectedVoiceId = state.voices[0].id;

  elements.voiceCount.textContent = state.voices.length;
  elements.voiceEmpty.hidden = state.voices.length > 0;
  elements.voiceList.innerHTML = "";
  for (const voice of state.voices) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `voice-item${voice.id === state.selectedVoiceId ? " active" : ""}`;
    button.dataset.voiceId = voice.id;
    button.title = voice.id;

    const avatar = document.createElement("span");
    avatar.className = "voice-avatar";
    avatar.textContent = voiceInitial(voice.name);

    const copy = document.createElement("span");
    copy.className = "voice-copy";
    const name = document.createElement("strong");
    name.textContent = voice.name || voice.id;
    const meta = document.createElement("span");
    meta.textContent = voice.activated ? "已解锁 · 共享音色" : "待解锁 · 首次合成收费";
    copy.append(name, meta);

    const status = document.createElement("span");
    status.className = `voice-state${voice.activated ? " active" : ""}`;
    status.title = voice.activated ? "已激活" : "待激活";
    button.append(avatar, copy, status);
    elements.voiceList.append(button);
  }

  const voice = selectedVoice();
  elements.selectedVoiceName.textContent = voice ? voice.name : "未选择";
}

async function loadSettings() {
  const settings = await api("/api/settings");
  state.configured = settings.configured;
  state.managed = settings.managed;
  elements.apiStatus.dataset.state = settings.configured ? "online" : "offline";
  elements.apiStatus.textContent = settings.configured
    ? (settings.managed ? "公司账号已连接" : "百炼已连接")
    : "未连接";
  elements.savedKeyState.textContent = settings.configured ? `已保存 ${settings.maskedKey}` : "尚未保存";
  $("#open-settings").hidden = settings.managed;
  return settings;
}

async function loadSession() {
  const session = await api("/api/session");
  state.sessionRequired = session.required;
  $("#logout").hidden = !session.required;
  return session;
}

async function loadVoices() {
  const result = await api("/api/voices");
  state.voices = result.voices || [];
  renderVoices();
}

function updateCost() {
  const count = [...elements.speechText.value].length;
  const rate = state.model === "speech-2.8-hd" ? 3.5 : 2;
  const cost = (count / 10_000) * rate;
  elements.textCount.textContent = `${count} / 9999`;
  elements.costEstimate.textContent = `预计 ¥${cost.toFixed(3)}`;
}

function updateRange(input, output, suffix = "") {
  $(output).textContent = `${Number($(input).value).toFixed(input === "#pitch" ? 0 : 1)}${suffix}`;
}

function createObjectUrl(blob, type) {
  if (type === "clone" && state.cloneAudioUrl) URL.revokeObjectURL(state.cloneAudioUrl);
  if (type === "speech" && state.audioUrl) URL.revokeObjectURL(state.audioUrl);
  const url = URL.createObjectURL(blob);
  if (type === "clone") state.cloneAudioUrl = url;
  else state.audioUrl = url;
  return url;
}

function base64ToBlob(value, type) {
  const bytes = atob(value);
  const chunks = [];
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    const slice = bytes.slice(offset, offset + 8192);
    chunks.push(Uint8Array.from(slice, (char) => char.charCodeAt(0)));
  }
  return new Blob(chunks, { type });
}

function generateVoiceId() {
  return `voice_${Date.now().toString(36)}_${crypto.getRandomValues(new Uint16Array(1))[0].toString(36)}`;
}

async function inspectAudioFile(file) {
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) throw new Error("音频文件不能超过 20 MB");
  if (!/\.(mp3|m4a|wav)$/i.test(file.name)) throw new Error("仅支持 MP3、M4A 或 WAV 文件");
  const objectUrl = URL.createObjectURL(file);
  try {
    const duration = await new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = "metadata";
      audio.onloadedmetadata = () => resolve(audio.duration);
      audio.onerror = () => reject(new Error("无法读取音频，请更换文件"));
      audio.src = objectUrl;
    });
    if (!Number.isFinite(duration) || duration < 10 || duration > 300) {
      throw new Error("音频时长需在 10 秒至 5 分钟之间");
    }
    elements.uploadTitle.textContent = file.name;
    elements.uploadMeta.textContent = `${(file.size / 1024 / 1024).toFixed(1)} MB · ${Math.round(duration)} 秒`;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function handleSynthesize(event) {
  event.preventDefault();
  if (!state.configured) {
    elements.settingsDialog.showModal();
    return;
  }
  const voice = selectedVoice();
  if (!voice) {
    switchTab("clone");
    showToast("请先创建一个音色");
    return;
  }
  const text = elements.speechText.value.trim();
  if (!text) return;

  setBusy(elements.generateButton, true, "生成配音", "正在生成");
  elements.generationMeta.textContent = "正在通过阿里云百炼调用 MiniMax Speech 2.8";
  try {
    const response = await fetch("/api/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voiceId: voice.id,
        filename: voice.name,
        model: state.model,
        emotion: $("#emotion").value,
        language: $("#language").value,
        format: $("#format").value,
        speed: $("#speed").value,
        pitch: $("#pitch").value,
        volume: $("#volume").value,
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "配音生成失败");
    }
    const blob = await response.blob();
    const url = createObjectUrl(blob, "speech");
    const filename = decodeURIComponent(response.headers.get("X-Filename") || `minimax_audio.${$("#format").value}`);
    const usage = response.headers.get("X-Usage-Characters") || [...text].length;
    const durationMs = Number(response.headers.get("X-Audio-Length") || 0);
    elements.audioPlayer.src = url;
    elements.downloadAudio.href = url;
    elements.downloadAudio.download = filename;
    elements.audioResult.hidden = false;
    elements.generationMeta.textContent = `${usage} 字符${durationMs ? ` · ${(durationMs / 1000).toFixed(1)} 秒` : ""}`;
    await loadVoices();
    showToast("配音已生成");
  } catch (error) {
    elements.generationMeta.textContent = error.message;
    showToast(error.message);
  } finally {
    setBusy(elements.generateButton, false, "生成配音", "正在生成");
  }
}

async function handleClone(event) {
  event.preventDefault();
  if (!state.configured) {
    elements.settingsDialog.showModal();
    return;
  }
  const file = elements.cloneAudio.files[0];
  if (!file) return;

  setBusy(elements.cloneButton, true, "克隆并激活", "正在处理");
  elements.cloneProgress.textContent = "正在上传到百炼临时存储";
  const form = new FormData();
  form.append("audio", file);
  form.append("name", elements.voiceName.value.trim());
  form.append("voiceId", elements.voiceId.value.trim());
  form.append("model", state.model);
  form.append("activationText", $("#activation-text").value.trim());
  form.append("noiseReduction", String($("#noise-reduction").checked));
  form.append("volumeNormalization", String($("#volume-normalization").checked));

  const progressTimer = setTimeout(() => {
    elements.cloneProgress.textContent = "正在创建音色并完成首次解锁合成";
  }, 8000);

  try {
    const result = await api("/api/voices/clone", { method: "POST", body: form });
    clearTimeout(progressTimer);
    state.selectedVoiceId = result.voice.id;
    localStorage.setItem("minimax-selected-voice", result.voice.id);
    await loadVoices();
    elements.cloneResultTitle.textContent = result.activated ? `${result.voice.name} · 已激活` : `${result.voice.name} · 待激活`;
    if (result.audioBase64) {
      const blob = base64ToBlob(result.audioBase64, result.mimeType || "audio/mpeg");
      elements.clonePlayer.src = createObjectUrl(blob, "clone");
      elements.clonePlayer.hidden = false;
    } else {
      elements.clonePlayer.hidden = true;
    }
    elements.cloneResult.hidden = false;
    elements.cloneProgress.textContent = result.activated ? "克隆与首次解锁已完成" : "音色已克隆，尚待首次解锁";
    showToast(result.warning || "音色已克隆并完成首次解锁");
  } catch (error) {
    clearTimeout(progressTimer);
    elements.cloneProgress.textContent = error.message;
    showToast(error.message);
  } finally {
    setBusy(elements.cloneButton, false, "克隆并激活", "正在处理");
  }
}

async function saveSettings(event) {
  event.preventDefault();
  const apiKey = elements.apiKey.value.trim();
  if (!apiKey) {
    showToast("请填写 API Key");
    return;
  }
  const button = $("#save-key");
  setBusy(button, true, "验证并保存", "正在验证");
  try {
    await api("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    elements.apiKey.value = "";
    await loadSettings();
    elements.settingsDialog.close();
    showToast("百炼 API Key 已验证并保存在本机");
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(button, false, "验证并保存", "正在验证");
  }
}

async function login(event) {
  event.preventDefault();
  const code = elements.accessCode.value.trim();
  if (!code) return;
  setBusy(elements.accessSubmit, true, "进入工具", "正在验证");
  try {
    await api("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessCode: code }),
    });
    elements.accessCode.value = "";
    elements.accessDialog.close();
    await startApp();
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(elements.accessSubmit, false, "进入工具", "正在验证");
  }
}

async function logout() {
  await api("/api/session", { method: "DELETE" });
  state.configured = false;
  state.voices = [];
  renderVoices();
  elements.accessDialog.showModal();
}

async function clearKey() {
  await api("/api/settings", { method: "DELETE" });
  await loadSettings();
  showToast("本机 API Key 已清除");
}

async function syncVoices() {
  const button = $("#sync-voices");
  setBusy(button, true, "刷新本地", "刷新中");
  try {
    await loadVoices();
    showToast("本地音色列表已刷新");
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(button, false, "刷新本地", "刷新中");
  }
}

function bindEvents() {
  $$(".tab-button").forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.tab)));
  $$('[data-open-clone]').forEach((button) => button.addEventListener("click", () => switchTab("clone")));
  elements.voiceList.addEventListener("click", (event) => {
    const item = event.target.closest(".voice-item");
    if (item) selectVoice(item.dataset.voiceId);
  });
  $$(".segment").forEach((button) => {
    button.classList.toggle("active", button.dataset.model === state.model);
    button.addEventListener("click", () => {
      state.model = button.dataset.model;
      localStorage.setItem("minimax-model", state.model);
      $$(".segment").forEach((item) => item.classList.toggle("active", item === button));
      updateCost();
    });
  });
  elements.speechText.addEventListener("input", updateCost);
  elements.synthesizeForm.addEventListener("submit", handleSynthesize);
  elements.cloneForm.addEventListener("submit", handleClone);
  elements.accessForm.addEventListener("submit", login);
  elements.accessDialog.addEventListener("cancel", (event) => event.preventDefault());
  elements.settingsForm.addEventListener("submit", saveSettings);
  $("#open-settings").addEventListener("click", () => elements.settingsDialog.showModal());
  $("#close-settings").addEventListener("click", () => elements.settingsDialog.close());
  $("#clear-key").addEventListener("click", clearKey);
  $("#sync-voices").addEventListener("click", syncVoices);
  $("#logout").addEventListener("click", logout);
  $("#choose-audio").addEventListener("click", () => elements.cloneAudio.click());
  elements.cloneAudio.addEventListener("change", async () => {
    try {
      await inspectAudioFile(elements.cloneAudio.files[0]);
    } catch (error) {
      elements.cloneAudio.value = "";
      showToast(error.message);
    }
  });
  elements.voiceName.addEventListener("input", () => {
    if (!elements.voiceId.dataset.edited) elements.voiceId.value = generateVoiceId();
  });
  elements.voiceId.addEventListener("input", () => {
    elements.voiceId.dataset.edited = "true";
  });
  for (const eventName of ["dragenter", "dragover"]) {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropZone.classList.add("dragging");
    });
  }
  for (const eventName of ["dragleave", "drop"]) {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropZone.classList.remove("dragging");
    });
  }
  elements.dropZone.addEventListener("drop", async (event) => {
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    elements.cloneAudio.files = transfer.files;
    try {
      await inspectAudioFile(file);
    } catch (error) {
      elements.cloneAudio.value = "";
      showToast(error.message);
    }
  });
  $("#use-cloned-voice").addEventListener("click", () => switchTab("synthesize"));
  $("#speed").addEventListener("input", () => updateRange("#speed", "#speed-value", "×"));
  $("#pitch").addEventListener("input", () => updateRange("#pitch", "#pitch-value"));
  $("#volume").addEventListener("input", () => updateRange("#volume", "#volume-value"));
}

async function startApp() {
  const settings = await loadSettings();
  await loadVoices();
  if (!settings.configured && !settings.managed) elements.settingsDialog.showModal();
}

async function initialize() {
  bindEvents();
  elements.voiceId.value = generateVoiceId();
  updateCost();
  try {
    const session = await loadSession();
    if (session.required && !session.authenticated) {
      elements.accessDialog.showModal();
      return;
    }
    await startApp();
  } catch (error) {
    showToast(`服务连接失败：${error.message}`);
  }
}

initialize();
