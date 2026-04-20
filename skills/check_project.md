# Skill: Kiểm tra sức khoẻ dự án (Init Check)

**Mô tả:** Skill này hướng dẫn AI tự động quét dự án, kiểm tra type TypeScript, đọc các biến môi trường và chạy thử build.

## Hướng dẫn thực thi (Dành cho AI):
Khi USER yêu cầu chạy Skill này, Mày (AI) phải lập tức làm tuần tự các bước sau KHÔNG ĐƯỢC BỎ QUA:

1. **Check Compiler:** Tự động chạy lệnh `npm run build` ở background. Đọc kết quả log ra xem có bị dính lỗi Type nào (Error TS...) không.
2. **Scan Package:** Mở file `package.json` và phân tích xem dự án phiên bản thư viện: `hono`, `telegraf`, `@ai-sdk/...` có quá cũ không.
3. **Phân tích CSDL:** Đọc file `migrations/0000_init.sql` và so sánh các Column bên trong với interface ở `src/db/repository.ts` xem có bị lệch (thiếu cột) không.
4. **Báo cáo cuối cùng:** Sau khi thu thập hết, hãy hiện một chiếc Bảng Report (Bằng Markdown format) rất ngầu cho USER, đi kèm cờ Trạng thái 🟢 🟡 🔴 tương ứng với độ an toàn của dự án.
