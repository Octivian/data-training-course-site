#!/usr/bin/env bash

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "缺少 Docker，请先安装 Docker Engine。"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "缺少 Docker Compose v2，请先安装 compose 插件。"
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  chmod 600 .env
  echo "已生成 .env。请填入 BAILIAN_API_KEY、APP_ACCESS_CODE、SESSION_SECRET 后重新运行。"
  exit 2
fi

for name in BAILIAN_API_KEY APP_ACCESS_CODE SESSION_SECRET; do
  if ! grep -Eq "^${name}=.+" .env; then
    echo ".env 中的 ${name} 尚未填写。"
    exit 2
  fi
done

chmod 600 .env
docker compose up -d --build

for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:4173/api/health >/dev/null 2>&1; then
    echo "MiniMax 智能配音已启动，内部端口：127.0.0.1:4173"
    docker compose ps
    exit 0
  fi
  sleep 1
done

echo "服务未通过健康检查，请运行：docker compose logs --tail=100"
exit 1
