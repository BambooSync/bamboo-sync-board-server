<p align="center">
  <img src="./assets/banner.jpg" alt="BambooSync — Board Server API" width="100%" />
</p>

<br/>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-11.x-E0234E?style=flat-square&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-6.x-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Socket.IO-4.x-010101?style=flat-square&logo=socket.io&logoColor=white" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/License-UNLICENSED-lightgrey?style=flat-square" alt="License" />
</p>

<br/>

---

## 1. Giới thiệu

**BambooSync Server** là thành phần Backend cốt lõi thuộc hệ sinh thái ứng dụng quản lý bảng công việc cộng tác theo thời gian thực (**BambooSync Kanban**). 

Hệ thống chịu trách nhiệm:
- Cung cấp giao diện **RESTful API** cho các thao tác quản trị dữ liệu (xác thực người dùng, quản lý bảng công việc, cột trạng thái và thẻ công việc).
- Cung cấp cổng **WebSocket (Socket.IO Gateway)** phục vụ các tính năng cộng tác trực tiếp: đồng bộ con trỏ chuột thời gian thực (cursor tracking), chỉ báo đang soạn thảo (typing indicator) và danh sách thành viên trực tuyến (realtime presence).
- Đảm bảo tính toàn vẹn và nhất quán của dữ liệu nghiệp vụ thông qua cơ chế khóa ngoại và transaction của cơ sở dữ liệu PostgreSQL.

---

## 2. Tech Stack

| Thành phần | Công nghệ | Phiên bản | Ghi chú & Vai trò |
|------------|-----------|-----------|-------------------|
| **Ngôn ngữ** | TypeScript | ^5.7.3 | Ngôn ngữ phát triển chính |
| **Framework** | NestJS | ^11.0.1 | Kiến trúc ứng dụng Modular Monolith |
| **ORM** | Prisma ORM | ^6.19.3 | Quản lý schema, migrations và truy vấn SQL an toàn |
| **Cơ sở dữ liệu** | PostgreSQL | 16-alpine | Lưu trữ dữ liệu quan hệ chính |
| **Giao tiếp Thời gian thực** | Socket.IO / `@nestjs/websockets` | ^4.8.3 | Quản lý kết nối hai chiều WebSocket |
| **Xác thực & Bảo mật** | Passport, Passport-JWT, bcrypt | ^0.7 / ^6.0 | Xác thực Bearer Token (JWT) và mã hóa mật khẩu |
| **Xác thực Dữ liệu** | class-validator, class-transformer | ^0.15 / ^0.5 | Kiểm tra định dạng dữ liệu đầu vào (DTOs) |
| **Container & Orchestration**| Docker & Docker Compose | — | Đóng gói môi trường và chạy cụm DB phụ trợ |
| **Message Queue / Cache** | Redis (Docker Compose) | 7-alpine | Đã cấu hình container trong Compose, sẵn sàng tích hợp |

---

## 3. Yêu Cầu Môi Trường (Prerequisites)

Trước khi cài đặt và chạy ứng dụng, hãy đảm bảo môi trường phát triển của bạn đã cài đặt các công cụ sau:

- **Node.js**: Phiên bản `>= 20.x` (khuyến nghị bản LTS).
- **pnpm**: Phiên bản `>= 9.x` (Package manager chính của repo). Cài đặt qua lệnh:
  ```bash
  npm install -g pnpm
  ```
- **PostgreSQL**: Phiên bản `>= 15.x` hoặc `>= 16.x` (khuyến nghị chạy trực tiếp qua Docker Compose có sẵn trong repo).
- **Docker & Docker Compose**: Dùng để khởi chạy cụm dịch vụ phụ trợ (PostgreSQL 16 và Redis 7) hoặc chạy container ứng dụng.

---

## 4. Hướng Dẫn Cài Đặt & Chạy Local Từng Bước

### Bước 1: Clone repository và chuyển vào thư mục server
```bash
git clone <repository-url>
cd BambooSync/server
```

### Bước 2: Cài đặt các gói phụ thuộc (Dependencies)
```bash
pnpm install
```

### Bước 3: Cấu hình biến môi trường
Tạo file `.env` từ file mẫu `.env.example`:
```bash
cp .env.example .env
```
Điền các giá trị thích hợp cho `.env` (tham khảo mục [Biến Môi Trường](#5-danh-sách-biến-môi-trường)).

### Bước 4: Khởi động cơ sở dữ liệu phụ trợ
Khởi chạy PostgreSQL và Redis bằng Docker Compose:
```bash
docker-compose up -d
```
*(Lưu ý: PostgreSQL chạy trên cổng host `5433:5432`, khớp với cấu hình trong `.env`)*.

### Bước 5: Đồng bộ hóa cơ sở dữ liệu và sinh Prisma Client
```bash
# Áp dụng migrations vào database
pnpm prisma migrate dev

# Sinh mã nguồn TypeScript cho Prisma Client
pnpm prisma generate
```

### Bước 6: Khởi động server
```bash
# Chế độ phát triển (Development với tính năng tự động reload khi sửa code)
pnpm run start:dev

# Hoặc chế độ thông thường
pnpm run start

# Hoặc chế độ Production (sau khi build)
pnpm run build
pnpm run start:prod
```

Server sẽ lắng nghe tại: **`http://localhost:3000`** (hoặc port được định cấu hình).

Kiểm tra trạng thái server:
```bash
curl http://localhost:3000/health
# Phản hồi: {"status":"ok","userCount":0}
```

---

## 5. Danh Sách Biến Môi Trường (Environment Variables)

Các biến môi trường được định nghĩa tại file `.env` (dựa theo `.env.example` và mã nguồn thực tế):

| Tên Biến | Bắt Buộc | Giá Trị Mặc Định / Mẫu | Ý Nghĩa & Hướng Dẫn |
|----------|----------|------------------------|---------------------|
| `PORT` | Không | `3000` | Cổng lắng nghe HTTP & WebSocket của server |
| `DATABASE_URL` | **Có** | `postgresql://bamboo:bamboo123@127.0.0.1:5433/bamboosyncboard?schema=public` | Chuỗi kết nối PostgreSQL dùng bởi Prisma ORM |
| `JWT_ACCESS_SECRET` | **Có** | `your_super_secret_access_key` | Khóa bí mật dùng để ký và giải mã JWT Access Token |
| `JWT_REFRESH_SECRET` | **Có** | `your_super_secret_refresh_key` | Khóa bí mật dùng để ký và giải mã JWT Refresh Token |
| `JWT_ACCESS_EXPIRES_IN`| **Có** | `15m` | Thời gian sống của Access Token (ví dụ: `15m`, `1h`, `1d`) |
| `JWT_REFRESH_EXPIRES_IN`| **Có** | `7d` | Thời gian sống của Refresh Token (ví dụ: `7d`, `30d`) |

> [!CAUTION]
> Tuyệt đối **không commit file `.env`** chứa thông tin nhạy cảm lên Git repository. File này đã được thêm vào `.gitignore`.

---

## 6. Cách Chạy Kiểm Thử (Testing)

Dự án được cấu hình kiểm thử bằng **Jest** và **Supertest**:

```bash
# Chạy toàn bộ Unit Tests
pnpm run test

# Chạy Unit Tests ở chế độ Watch (tự chạy lại khi file thay đổi)
pnpm run test:watch

# Xem báo cáo độ bao phủ mã nguồn (Code Coverage)
pnpm run test:cov

# Chạy kiểm thử tích hợp End-to-End (E2E)
pnpm run test:e2e

# Chạy test ở chế độ debug
pnpm run test:debug
```

---

## 7. Cấu Trúc Thư Mục Dự Án (Project Structure)

```
server/
├── assets/                     # Tài nguyên hình ảnh tĩnh (banner, logo)
├── docs/                       # BỘ TÀI LIỆU KỸ THUẬT ĐẦY ĐỦ
│   ├── architecture.md         # Kiến trúc hệ thống, data flow & module design
│   ├── api.md                  # Tài liệu chi tiết HTTP API & WebSocket events
│   ├── database.md             # Schema DB, quan hệ thực thể (ERD) & migrations
│   ├── CONTRIBUTING.md         # Quy tắc code style, git flow & review checklist
│   ├── deployment.md           # Hướng dẫn build Docker, compose & vận hành
│   └── techniques.md           # Báo cáo đối chiếu kỹ thuật & patterns thực tế
├── prisma/
│   ├── schema.prisma           # Định nghĩa cấu trúc Schema và Models của Prisma
│   └── migrations/             # Lịch sử các bản migration SQL đã sinh
├── src/
│   ├── auth/                   # Module xác thực: Đăng ký, đăng nhập, JWT Passport Strategy
│   ├── board/                  # Module quản lý Bảng: CRUD, phân quyền & mã mời
│   ├── collumn/                # Module quản lý Cột: Thêm, xóa và sắp xếp thứ tự (reorder)
│   ├── task/                   # Module quản lý Công việc: CRUD, di chuyển cột & đổi thứ tự
│   ├── realtime/               # Module thời gian thực: Socket.IO Gateway & Presence Service
│   ├── common/                 # Tiện ích dùng chung: JwtAuthGuard, CurrentUser Decorator
│   ├── prisma/                 # PrismaService & PrismaModule kết nối Database
│   ├── app.controller.ts       # Controller gốc (chứa endpoint /health)
│   ├── app.module.ts           # Root Module của ứng dụng NestJS
│   ├── app.service.ts          # Root Service
│   └── main.ts                 # Điểm khởi động ứng dụng (Bootstrap)
├── test/                       # Cấu hình và kịch bản kiểm thử End-to-End (E2E)
├── .env.example                # Mẫu cấu hình biến môi trường
├── docker-compose.yml          # Cấu hình dịch vụ Docker (PostgreSQL 16 & Redis 7)
├── Dockerfile                  # Cấu hình Multi-stage Docker Build cho Production
├── eslint.config.mjs           # Cấu hình linter ESLint 9 Flat Config
├── package.json                # Định nghĩa dependencies và scripts chạy dự án
└── tsconfig.json               # Cấu hình TypeScript compiler
```

---

## 8. Tài Liệu Kỹ Thuật Chi Tiết (Documentation Index)

Để tìm hiểu sâu hơn về từng khía cạnh kỹ thuật, vui lòng tham khảo các tài liệu chuyên biệt trong thư mục `/docs`:

1. [docs/architecture.md](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/docs/architecture.md): Sơ đồ luồng dữ liệu, cấu trúc module, luồng xác thực và các quyết định thiết kế cốt lõi.
2. [docs/api.md](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/docs/api.md): Danh mục toàn bộ HTTP REST Endpoints, WebSocket Events, Request/Response payloads và mã lỗi.
3. [docs/database.md](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/docs/database.md): Schema 6 bảng dữ liệu, sơ đồ ERD trực quan, các kiểu Enums và quy trình migration.
4. [docs/CONTRIBUTING.md](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/docs/CONTRIBUTING.md): Hướng dẫn viết mã, chuẩn format Prettier, cấu hình ESLint, quy ước nhánh và commit.
5. [docs/deployment.md](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/docs/deployment.md): Hướng dẫn đóng gói Multi-stage Docker, vận hành với Docker Compose, cấu hình môi trường và rollback.
6. [docs/techniques.md](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/docs/techniques.md): Báo cáo đối chiếu 4 nhóm kỹ thuật backend (Database, Caching, Async/Distributed, Patterns) kèm trích dẫn dòng code thực tế và phân tích khoảng trống kỹ thuật.

---

<p align="center">
  <sub>BambooSync Server — Built with NestJS · Prisma · PostgreSQL · Socket.IO</sub>
</p>
