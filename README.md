# 🚁 Chopper News Bot

**Chopper News Bot** là ứng dụng Telegram Bot đọc và tóm tắt tin tức tốc độ cao. Dự án được thiết kế theo kiến trúc **Edge-Native**, chạy thẳng trên hạ tầng máy chủ biên Cloudflare Workers thay vì server truyền thống, đảm bảo tốc độ phản hồi cực nhanh, độ trễ thấp và auto-scale cực kỳ mạnh mẽ.

## ✨ Điểm Nổi Bật (Features)
- 🧠 **Multi-AI & Fallback:** Hỗ trợ xoay vòng đa mô hình AI (`Groq Llama 3 70B`, `xAI Grok-Beta`, `Cloudflare AI Llama 8B`). Tích hợp hệ thống Auto-fallback, tự động bẻ lái sang AI dự phòng nếu API hết lượt quét.
- ⚡ **Siêu Tốc với Drizzle & D1:** Tương tác với Cấu trúc Dữ Liệu SQL Cloudflare D1 siêu tốc thông qua [Drizzle ORM], Type-safety 100%.
- 👮 **Telegram Telegraf:** Trải nghiệm bot nhắn tin mượt mà với UI Inline Keyboard (tích hợp nút bấm đổi AI).
- 🔄 **Webhooks Mượt Mà:** Sử dụng kĩ thuật Webhook thuần túy qua Hono App, không sử dụng kiến trúc Polling gây hao tốn băng thông.
- 🚀 **Tích hợp CI/CD tự động:** Build và Deploy lên Cloudflare ngay khi Push Code lên Github. Kèm theo tính năng Ping Log thông báo trực tiếp qua Telegram của DEV.

---

## 🛠️ Ngăn xếp công nghệ gốc (Tech Stack)
- **Runtime:** Cloudflare Workers (Node.js compat)
- **Framework:** Hono
- **Bot Engine:** Telegraf
- **Cơ sở dữ liệu:** Cloudflare D1 + Drizzle ORM / Drizzle Kit
- **Trích xuất nội Dung:** `@extractus/article-extractor` + Cloudflare `HTMLRewriter` (Lớp phụ trợ).
- **Hệ AI:** Vercel AI SDK 

---

## 🚀 Hướng Dẫn Cài Đặt Local (Dành cho Lập Trình Viên)

### Bước 1: Chuẩn bị cơ bản
Yêu cầu máy phải cài đặt sẵn [Node.js](https://nodejs.org) (v20+ khuyến nghị).
```bash
git clone <đường_dẫn_repo_của_bạn>
cd chopper-news
npm install
```

### Bước 2: Thiết lập Database ở Local (Drizzle ORM)
Dự án dùng SQLite phiên bản Local cho dev. Bạn chạy các lệnh để nạp DB của mình:
```bash
# 1. Gen ra file SQL nếu schema.ts thay đổi
npm run db:generate

# 2. Bắn cấu trúc file CSDL vào môi trường giả lập dev
npm run db:migrate
```

### Bước 3: Nạp Biến Môi Trường (.dev.vars)
Tạo 1 file tên là `.dev.vars` (Cloudflare không dùng `.env`) ở ngay gốc dự án:
```env
TELEGRAM_BOT_TOKEN="BOT_CUA_BAN_TOKEN"
GROQ_API_KEY="gsk_xxxxx"
XAI_API_KEY="xai-xxxxx"
```
*(Bật Webhook trên máy bạn qua Ngrok hoặc Cloudflare Tunnel để dẫn Request về cổng `8787`).*

### Bước 4: Chạy Máy Chủ
```bash
npm run dev
```

---

## ⚙️ Hướng dẫn Cấu Hình (Quản lý Tập Trung tại Github)

Để hệ thống Bot và CI/CD có thể kết nối được, bạn **CHỈ CẦN CẤU HÌNH Ở MỘT NƠI DUY NHẤT** là Github. Mỗi khi có lệnh Deploy, Github sẽ tự động đẩy các khóa này thẳng vào lòng máy chủ Cloudflare giúp bạn.

Truy cập web GitHub: `Settings` → `Secrets and variables` → `Actions`. Thêm đủ các biến sau vào **New Repository Secrets**:

### 1. Keys điều phối và CI/CD
| Tên Biến | Mô Tả |
| :--- | :--- |
| `CLOUDFLARE_API_TOKEN` | Token để được phép update code (Lấy ở Cloudflare Profile) |
| `CLOUDFLARE_ACCOUNT_ID` | Nhận diện tài khoản CF (Nằm trong URL thẻ trình duyệt web CF) |
| `TELEGRAM_ADMIN_CHAT_ID` | Nơi Github đâm log trạng thái Pipeline về. (ID cá nhân của bạn) |

### 2. Keys vận hành cho Bot (Tự động truyền qua Cloudflare)
| Tên Biến | Mô Tả |
| :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | Token điều khiển Bot (Qua BotFather) |
| `GROQ_API_KEY` | (Tuỳ chọn) Key AI Groq |
| `XAI_API_KEY` | (Tuỳ chọn) Key xAI |
| `GOOGLE_GENERATIVE_AI_API_KEY` | (Tuỳ chọn) Key cho AI phòng bị thứ 3 |

> **Lưu ý Migration CSDL từ xa:** Nếu CSDL `schema.ts` bị thay đổi, hãy sửa biến json `current > previous` trong vỏ tệp `migration.json` -> Github Actions sẽ thay bạn tự động chạy lệnh setup lại CSDL trước khi up code.

---
Mọi tuỳ chỉnh Bot nâng cao (Add Lệnh, Tối ưu DB, Sửa đổi Prompts), vui lòng check qua các File Bí thư AI (Skill prompts) tại thư mục `skills/` trong gốc dự án.
