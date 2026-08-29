const test = require("node:test");
const assert = require("node:assert/strict");
const { BailianMiniMaxClient, BailianError, assertApiSuccess } = require("../lib/bailian");

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("使用百炼 Key 获取上传凭证并上传声音样本", async () => {
  const calls = [];
  const client = new BailianMiniMaxClient({
    apiKey: "test-bailian-key-123",
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      if (calls.length === 1) {
        return jsonResponse({
          data: {
            upload_host: "https://example-bucket.oss-cn-beijing.aliyuncs.com",
            upload_dir: "dashscope-instant/test",
            oss_access_key_id: "temporary-id",
            signature: "temporary-signature",
            policy: "temporary-policy",
            x_oss_object_acl: "private",
            x_oss_forbid_overwrite: "true",
          },
          request_id: "request-policy",
        });
      }
      return new Response("", { status: 200 });
    },
  });

  const result = await client.uploadVoice(
    new File(["audio"], "voice.mp3", { type: "audio/mpeg" }),
    "speech-2.8-hd",
  );
  const policyUrl = new URL(calls[0].url);
  assert.equal(policyUrl.pathname, "/api/v1/uploads");
  assert.equal(policyUrl.searchParams.get("model"), "MiniMax/speech-2.8-hd");
  assert.equal(calls[0].options.headers.Authorization, "Bearer test-bailian-key-123");
  assert.equal(calls[1].url, "https://example-bucket.oss-cn-beijing.aliyuncs.com");
  assert.equal(calls[1].options.body.get("OSSAccessKeyId"), "temporary-id");
  assert.match(result.audioUrl, /^oss:\/\/dashscope-instant\/test\//);
});

test("音色复刻使用百炼 MiniMax 模型和临时资源解析头", async () => {
  let captured;
  const client = new BailianMiniMaxClient({
    apiKey: "test-bailian-key-123",
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return jsonResponse({
        output: {
          base_resp: { status_code: 0, status_msg: "success" },
          demo_audio: "https://example.com/demo.mp3",
        },
        usage: { characters: 4 },
        request_id: "request-clone",
      });
    },
  });

  const result = await client.cloneVoice({
    audioUrl: "oss://dashscope-instant/test/voice.mp3",
    voiceId: "voice_test_01",
    model: "speech-2.8-turbo",
    text: "测试试听",
  });
  const requestBody = JSON.parse(captured.options.body);
  assert.equal(requestBody.model, "MiniMax/speech-2.8-turbo");
  assert.equal(requestBody.input.action, "voice_clone");
  assert.equal(captured.options.headers["X-DashScope-OssResourceResolve"], "enable");
  assert.equal(result.demoAudioUrl, "https://example.com/demo.mp3");
});

test("语音合成解码 hex 音频并保留计费信息", async () => {
  let requestBody;
  const client = new BailianMiniMaxClient({
    apiKey: "test-bailian-key-123",
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return jsonResponse({
        output: {
          data: { audio: "494433", status: 2 },
          extra_info: { usage_characters: 4, audio_length: 1200 },
          trace_id: "trace-test",
          base_resp: { status_code: 0, status_msg: "success" },
        },
        usage: { characters: 4 },
        request_id: "request-synthesize",
      });
    },
  });
  const result = await client.synthesize({ text: "测试文本", voiceId: "voice_test_01" });
  assert.deepEqual(result.audio, Buffer.from("ID3"));
  assert.equal(result.extraInfo.usage_characters, 4);
  assert.equal(requestBody.model, "MiniMax/speech-2.8-hd");
  assert.equal(requestBody.input.voice_setting.voice_id, "voice_test_01");
  assert.equal(requestBody.input.output_format, "hex");
});

test("百炼业务错误转换为清晰异常", () => {
  assert.throws(
    () => assertApiSuccess({ code: "Arrearage", message: "Account is in arrears" }),
    (error) => error instanceof BailianError && error.message.includes("余额不足"),
  );
});

test("百炼产品未开通错误不会误报为参数问题", () => {
  assert.throws(
    () => assertApiSuccess({
      code: "InvalidParameter",
      message: "The product is not activated, please confirm that you have activated products and try again after activation.",
      request_id: "request-not-activated",
    }),
    (error) =>
      error instanceof BailianError &&
      error.message.includes("模型服务尚未开通") &&
      error.message.includes("MiniMax Speech"),
  );
});

test("百炼模型权限错误提供开通建议", () => {
  assert.throws(
    () => assertApiSuccess({ code: "Model.AccessDenied", message: "Access denied" }),
    (error) => error instanceof BailianError && error.message.includes("MiniMax") && error.message.includes("地域"),
  );
});
