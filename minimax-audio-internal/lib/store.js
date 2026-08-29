const fs = require("node:fs/promises");
const path = require("node:path");

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(filePath, value, mode = 0o600) {
  await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, { mode });
  await fs.rename(tempPath, filePath);
  await fs.chmod(filePath, mode);
}

class LocalStore {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.settingsPath = path.join(dataDir, "settings.json");
    this.voicesPath = path.join(dataDir, "voices.json");
  }

  async getSettings() {
    return readJson(this.settingsPath, { apiKey: "", provider: "" });
  }

  async saveSettings(settings) {
    await writeJson(this.settingsPath, { apiKey: settings.apiKey.trim(), provider: "bailian" });
  }

  async clearSettings() {
    await writeJson(this.settingsPath, { apiKey: "", provider: "bailian" });
  }

  async getVoices() {
    const voices = await readJson(this.voicesPath, []);
    return Array.isArray(voices) ? voices : [];
  }

  async saveVoices(voices) {
    await writeJson(this.voicesPath, voices);
    return voices;
  }

  async upsertVoice(voice) {
    const voices = await this.getVoices();
    const index = voices.findIndex((item) => item.id === voice.id);
    const next = {
      ...(index >= 0 ? voices[index] : {}),
      ...voice,
      updatedAt: new Date().toISOString(),
    };
    if (index >= 0) voices[index] = next;
    else voices.unshift(next);
    await this.saveVoices(voices);
    return next;
  }

  async removeVoice(id) {
    const voices = await this.getVoices();
    const next = voices.filter((voice) => voice.id !== id);
    await this.saveVoices(next);
    return next.length !== voices.length;
  }
}

module.exports = { LocalStore, readJson, writeJson };
