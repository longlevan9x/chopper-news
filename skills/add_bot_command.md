# Skill: Thêm lệnh Mới (Command) vào Bot Telegram

**Mục tiêu:** Hướng dẫn AI cách triển khai và đi dây một lệnh (command) hoặc hành vi (action callback) mới vào Telegram Bot để đảm bảo tính đồng bộ kiến trúc.

## Bối cảnh Project (Ngữ cảnh):
- Dự án dùng thư viện `telegraf` chạy trên môi trường Edge/Cloudflare Workers.
- Entrypoint xử lý request gửi qua Webhook.

## Các quy tắc Lập Trình BẮT BUỘC theo (Constraints):
1. **Định dạng tin nhắn:** KHÔNG DÙNG Fetch chay. Luôn gọi `ctx.reply` hoặc dùng hàm wrapper `replyWithChunks` trong nhánh `services/telegram.ts`. Khi trả về Markdown cho Telegram, luôn dùng \`parse_mode: 'HTML'\` (chỉ xài `<b>`, `<i>`, `<a>`, `<code>`). Tuyệt đối không dùng `**` hoặc `##`.
2. **Nơi để Code logic:** Mọi chức năng hàm xử lý mới đều PHẢI bỏ vào `src/bot/commands.ts`.
3. **Cập nhật Router:** Phải nhớ mở file `src/bot/handler.ts` để móc hàm đó vào `setupBot(bot: Telegraf, env)`. Vd: `bot.command('newcmd', ...)` 
4. **Đồng bộ hóa User:** Luôn tự động tìm hằng số `HELP_MESSAGE` hoặc Menu trợ giúp trong `commands.ts` để bổ sung mô tả lệnh mới cho người dùng.

## Xác nhận kiểm tra lỗi cuối (Pre-flight Checks):
- [ ] Hàm bắt lệnh trong `commands.ts` có export để handler xài chưa?
- [ ] Chạy ngầm `npm run build` xem Type `Context` có sai lệch không?
