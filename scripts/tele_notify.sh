#!/bin/bash

# Kiểm tra xem có cấu hình chưa
if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_ADMIN_CHAT_ID" ]; then
    echo "⚠️ Bỏ qua gửi thông báo: Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_ADMIN_CHAT_ID trong Secrets."
    exit 0
fi

# Nhận tin nhắn từ tham số đầu tiên gán vào biến MESSAGE
MESSAGE="$1"

# Gọi API Telegram
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_ADMIN_CHAT_ID}" \
    -d "parse_mode=HTML" \
    --data-urlencode "text=${MESSAGE}" > /dev/null

echo "✅ Đã push Notify tới Telegram."
