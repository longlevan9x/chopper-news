# Skill: Nâng cấp / Cập nhật Database D1 (Migration)

**Mục tiêu:** Hướng dẫn AI sửa hoặc thêm bảng (tables), thêm cột (columns) vào kiến trúc cơ sở dữ liệu hiện tại một cách an toàn và đúng workflow của CI/CD hiện tại.

## Bối cảnh Project (Ngữ cảnh):
- Dự án gắn Cơ sở dữ liệu Cloudflare D1. 
- Auto-deploy gắn trong Github Action với file trạng thái là `migration.json`. 

## Các quy tắc Mở Data BẮT BUỘC (Constraints):
1. **Không sửa đồ cũ:** TUYỆT ĐỐI không được quyền lùi sửa nội dung bên trong các file đã có ở thư mục `migrations/` (`0000..`).
2. **Tạo mốc mới:** Phải tạo 1 file `.sql` MỚI, gắn prefix số thứ tự kế tiếp (Ví dụ `0001_add_author.sql`), chứa lệnh `ALTER TABLE` hoặc `CREATE TABLE IF NOT EXISTS`.
3. **Cập nhật TypeScript:** Sau khi làm file SQL xong, NGHĨA VỤ PHẢI CHẠY sang file `src/db/repository.ts` để điền hoặc thay đổi interface Typescript (`SummaryRecord` / `UserPreference`).
4. **Trigger Github Actions:** Phải mở file gốc `migration.json` lên, TĂNG giá trị số của cột `current` lên 1 đơn vị (Để sau đó hệ thống tự Auto-Deploy Github Actions kích hoạt).

## Xác nhận kiểm tra (Checklist):
- [ ] Kiểm tra coi thư mục `migrations/` đã có file prefix mới chưa?
- [ ] So sánh `interface` trong TypeScript đã chuẩn khớp với lệnh SQL chưa?
