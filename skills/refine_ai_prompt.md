# Skill: Tối ưu hoá Hệ thống AI Prompt & Extractor

**Mục tiêu:** Hướng dẫn AI cách can thiệp, bảo trì và chỉnh sửa tính năng Tóm tắt Tin Tức (AI) và Nội dung Trích Xuất.

## Bối cảnh Project (Ngữ cảnh):
- Dự án sử dụng Multi-AI (Groq, xAI, Cloudflare) để tóm tắt các URL báo chí.
- Trả về kết quả qua Telegraf bot với setting \`parse_mode: 'HTML'\`.

## Quy định khi nâng cấp (Constraints):
1. **Tinh tỉnh SYSTEM_PROMPT:** Khi USER yêu cầu sửa cách AI tóm tắt (vd: đổi giọng văn, thêm tag, bỏ tóm tắt dài), luôn mở file `src/services/ai.ts`. Cập nhật biến chuỗi `SYSTEM_PROMPT`.
2. **LUÔN kiểm tra Format đầu ra:** Cấm ngặt việc model trả về các ký hiệu thẻ format không hợp lệ (như `**bold**`, `## Heading`, hoặc các HTML Tags không được Telegram hỗ trợ như `<span>`, `<br>`). Chỉ nhắc AI bám vào các thẻ an toàn: `<b>`, `<i>`, `<a>`, `<code>`, `<u>`.
3. **Mở rộng Extractor (Tùy chọn):** Nếu USER báo "Lấy thiếu chữ của báo ABC", thì phải mở `src/services/extractor.ts` để tối ưu CSS Selectors bổ sung vào vòng quét bằng hàm của tính năng Fallback `HTMLRewriter`.

## Kiểm thử sau khi Update (Pre-flight Checks):
- [ ] Hàm System Prompt có bị cồng kềnh quá không?
- [ ] Chạy ngầm `npm run build` để xác minh cú pháp chuỗi TS trong code chưa bị gãy.
