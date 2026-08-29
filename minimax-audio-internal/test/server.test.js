const test = require("node:test");
const assert = require("node:assert/strict");
const { constantTimeEqual, isAuthenticated, sessionToken } = require("../server");

test("内部访问口令未配置时默认允许本地访问", () => {
  const previous = process.env.APP_ACCESS_CODE;
  delete process.env.APP_ACCESS_CODE;
  try {
    assert.equal(isAuthenticated({ headers: {} }), true);
  } finally {
    if (previous === undefined) delete process.env.APP_ACCESS_CODE;
    else process.env.APP_ACCESS_CODE = previous;
  }
});

test("内部部署只接受服务器签发的会话 Cookie", () => {
  const previousCode = process.env.APP_ACCESS_CODE;
  const previousSecret = process.env.SESSION_SECRET;
  process.env.APP_ACCESS_CODE = "company-access-code";
  process.env.SESSION_SECRET = "test-session-secret-with-enough-length";
  try {
    assert.equal(isAuthenticated({ headers: {} }), false);
    assert.equal(isAuthenticated({ headers: { cookie: "minimax_session=wrong" } }), false);
    assert.equal(
      isAuthenticated({ headers: { cookie: `other=value; minimax_session=${sessionToken()}` } }),
      true,
    );
  } finally {
    if (previousCode === undefined) delete process.env.APP_ACCESS_CODE;
    else process.env.APP_ACCESS_CODE = previousCode;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
  }
});

test("常量时间比较同时校验长度与内容", () => {
  assert.equal(constantTimeEqual("same", "same"), true);
  assert.equal(constantTimeEqual("same", "diff"), false);
  assert.equal(constantTimeEqual("short", "longer"), false);
});
