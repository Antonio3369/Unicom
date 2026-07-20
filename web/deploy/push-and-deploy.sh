#!/usr/bin/env bash
# 从本机 web/ 目录执行：同步代码到服务器并部署
set -euo pipefail

SERVER="${DEPLOY_SERVER:-sales-cloud}"
REMOTE_DIR="/opt/leadspace-unicom"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> 同步代码到 ${SERVER}:${REMOTE_DIR}"
rsync -avz --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude '.env*' \
  --exclude 'src/generated' \
  --exclude '*.db' \
  --exclude uploads \
  "${LOCAL_DIR}/" "${SERVER}:${REMOTE_DIR}/"

echo "==> 检查服务器 .env"
ssh "${SERVER}" "bash -s" <<'REMOTE'
set -euo pipefail
cd /opt/leadspace-unicom
if [[ ! -f .env ]]; then
  POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
  AUTH_SECRET=$(openssl rand -base64 32)
  cat > .env <<EOF
POSTGRES_USER=unicom
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=unicom
AUTH_SECRET=${AUTH_SECRET}
AUTH_URL=https://uni.orblead.com
EOF
  echo "已生成 .env（AUTH_URL=https://uni.orblead.com）"
fi
REMOTE

echo "==> 远程构建并启动..."
ssh "${SERVER}" "cd ${REMOTE_DIR} && chmod +x deploy/*.sh && ./deploy/server-deploy.sh"

echo "==> 完成。"
echo "    站点：https://uni.orblead.com"
echo "    若 DNS 未配 SSL：ssh ${SERVER} 'cd ${REMOTE_DIR} && ./deploy/setup-ssl.sh'"
