#!/usr/bin/env bash
# 在腾讯云服务器安装联通业务过期批处理 cron（每天 10:00 北京时间）
set -euo pipefail

APP_DIR="/opt/leadspace-unicom"
CRON_LINE="0 10 * * * cd ${APP_DIR} && /usr/bin/sudo docker compose -f docker-compose.prod.yml --profile init run --rm --entrypoint sh db-init -c 'npm run expire:run' >> /var/log/unicom-expire.log 2>&1"

if crontab -l 2>/dev/null | grep -q "expire:run"; then
  echo "cron 已存在，跳过"
  crontab -l | grep "expire:run"
  exit 0
fi

( crontab -l 2>/dev/null || true
  echo "CRON_TZ=Asia/Shanghai"
  echo "$CRON_LINE"
) | crontab -

echo "已安装 cron（每天 10:00 CST）："
crontab -l | grep -E "CRON_TZ|expire:run"
