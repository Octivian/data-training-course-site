# MiniMax 智能配音（公司内部版）

通过阿里云百炼调用 MiniMax Speech 2.8，支持音色克隆、首次解锁、文字转语音、试听和下载。

## 内部使用方式

服务器管理员统一配置公司百炼 Key。普通同事打开网页后只需输入公司内部访问口令，不需要接触或填写 API Key。

- `BAILIAN_API_KEY`：公司百炼华北 2（北京）地域 Key，仅存在服务器环境变量中。
- `APP_ACCESS_CODE`：公司内部访问口令。
- `SESSION_SECRET`：登录 Cookie 签名密钥，建议使用至少 32 位随机字符串。
- 音色库由公司成员共享，数据保存在服务器的 `.data/voices.json` 或 Docker 数据卷中。
- 真实 Key、访问口令、音色数据不会提交到 Git。

## Docker 部署

```bash
cp .env.example .env
```

在 `.env` 中填入三个密钥后启动：

```bash
docker compose up -d --build
```

默认访问地址为 `http://服务器地址:4173`。正式使用时应通过 HTTPS 反向代理对外提供服务，并只把访问口令发给公司成员。

## 本地模式

未设置 `BAILIAN_API_KEY` 时，应用保留原来的本地模式，可在页面“API 设置”中验证并保存个人 Key：

```bash
npm start
```

默认访问 `http://127.0.0.1:4173`。本地 Key 保存在 `.data/settings.json`，文件权限为 `0600`。

## 费用口径

- 音色解锁：首次正式合成时约 9.9 元/音色，无免费额度。
- `speech-2.8-turbo`：约 2 元/万字符。
- `speech-2.8-hd`：约 3.5 元/万字符。

实际费用以阿里云百炼当日价格和账单为准。仅克隆已获得本人明确授权的声音。

## 测试

```bash
npm test
```

不提供 API Key 时，自动测试使用模拟响应，不会调用百炼或产生费用。
