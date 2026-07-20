#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  cp .env.example .env
  echo "已创建 .env（来自 .env.example）"
fi

echo "→ 启动本地 PostgreSQL（5433）"
docker compose up -d
echo "→ 等待数据库就绪..."
sleep 3

echo "→ npm install"
npm install

echo "→ prisma generate + db push"
npm run db:generate
npm run db:push

PERSONNEL="./data/罗湖联通业务员名单.xlsx"
ORDERS="./data/业绩登记模版-上传数据系统.xlsx"

if [ -f "$PERSONNEL" ] && [ -f "$ORDERS" ]; then
  echo "→ seed（导入 web/data 样例表）"
  npm run db:seed
else
  echo "→ 跳过 seed（web/data 下无样例 Excel，可在「导入对账」页上传）"
fi

echo "→ 启动开发服务（监听局域网，供手机同 WiFi 访问）"
node scripts/print-lan-url.mjs
npm run dev
