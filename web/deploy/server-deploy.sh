#!/usr/bin/env bash
# 在服务器 /opt/leadspace-unicom 目录执行
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "缺少 .env，请先：cp deploy/env.production.example .env && 编辑密码与 AUTH_SECRET"
  exit 1
fi

set -a
source .env
set +a

echo "==> 启动数据库..."
sudo docker compose -f docker-compose.prod.yml up -d postgres

echo "==> 等待数据库就绪..."
sleep 5

echo "==> 同步数据库 schema..."
sudo docker compose -f docker-compose.prod.yml --profile init build db-init
sudo docker compose -f docker-compose.prod.yml --profile init run --rm \
  --entrypoint sh db-init -c "npx prisma db push"

if [[ "${RUN_DB_SEED:-0}" == "1" ]]; then
  echo "==> 完整种子（RUN_DB_SEED=1，需 data/*.xlsx 已上传到服务器）..."
  sudo docker compose -f docker-compose.prod.yml --profile init run --rm \
    --entrypoint sh db-init -c "npm run db:seed" || true
fi

echo "==> 构建并启动应用（https://uni.orblead.com）..."
sudo docker compose -f docker-compose.prod.yml up -d --build app

echo "==> 部署完成。应用监听 127.0.0.1:3002"
sudo docker compose -f docker-compose.prod.yml ps
