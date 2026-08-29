#!/bin/zsh

set -e

APP_DIR="${0:A:h}"
APP_URL="http://127.0.0.1:4173"

cd "$APP_DIR"

if curl --noproxy '*' -fsS "$APP_URL/api/health" >/dev/null 2>&1; then
  open "$APP_URL"
  exit 0
fi

node server.js &
APP_PID=$!

cleanup() {
  kill "$APP_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

for ATTEMPT in {1..30}; do
  if curl --noproxy '*' -fsS "$APP_URL/api/health" >/dev/null 2>&1; then
    open "$APP_URL"
    wait "$APP_PID"
    exit $?
  fi
  sleep 0.2
done

echo "本地服务启动失败，请查看上方错误信息。"
wait "$APP_PID"
