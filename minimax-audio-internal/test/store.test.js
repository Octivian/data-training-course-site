const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { LocalStore } = require("../lib/store");

test("本地配置使用 0600 权限并可清除", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "minimax-store-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const store = new LocalStore(dir);
  await store.saveSettings({ apiKey: "secret-key" });
  assert.equal((await store.getSettings()).apiKey, "secret-key");
  assert.equal((await store.getSettings()).provider, "bailian");
  const stat = await fs.stat(path.join(dir, "settings.json"));
  assert.equal(stat.mode & 0o777, 0o600);
  await store.clearSettings();
  assert.equal((await store.getSettings()).apiKey, "");
});

test("音色记录按 ID 更新且不重复", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "minimax-store-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const store = new LocalStore(dir);
  await store.upsertVoice({ id: "voice_test_01", name: "初始音色", activated: false });
  await store.upsertVoice({ id: "voice_test_01", name: "正式音色", activated: true });
  const voices = await store.getVoices();
  assert.equal(voices.length, 1);
  assert.equal(voices[0].name, "正式音色");
  assert.equal(voices[0].activated, true);
});
