<p align="center">
  <img src="./docs/banner.jpg" alt="BambooSync — Board Server API" width="100%" />
</p>

<br/>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-11.x-E0234E?style=flat-square&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-6.x-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-Latest-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Socket.IO-4.x-010101?style=flat-square&logo=socket.io&logoColor=white" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/License-UNLICENSED-lightgrey?style=flat-square" alt="License" />
</p>

<br/>

---

## Giới thiệu

**BambooSync** là một ứng dụng quản lý bảng công việc theo thời gian thực (Kanban-style), được xây dựng theo kiến trúc RESTful API kết hợp WebSocket. Đây là phần **Backend Server** của hệ thống, chịu trách nhiệm xử lý toàn bộ logic nghiệp vụ, xác thực người dùng, quản lý dữ liệu và phát sóng sự kiện thời gian thực.

Dự án sử dụng **NestJS** làm framework chính với **TypeScript**, kết hợp **Prisma ORM** để tương tác với cơ sở dữ liệu **PostgreSQL**, và **Socket.IO** để xử lý kết nối thời gian thực.

---

## Mục lục

- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Yêu cầu môi trường](#yêu-cầu-môi-trường)
- [Cài đặt và chạy dự án](#cài-đặt-và-chạy-dự-án)
- [Biến môi trường](#biến-môi-trường)
- [Cơ sở dữ liệu](#cơ-sở-dữ-liệu)
- [Chạy kiểm thử](#chạy-kiểm-thử)
- [Triển khai với Docker](#triển-khai-với-docker)

---

## Công nghệ sử dụng

| Thành phần        | Công nghệ              | Phiên bản  |
|-------------------|------------------------|------------|
| Framework         | NestJS                 | ^11.0      |
| Ngôn ngữ          | TypeScript             | ^5.7       |
| ORM               | Prisma Client          | ^6.19      |
| Cơ sở dữ liệu     | PostgreSQL              | Latest     |
| Xác thực          | JWT + Passport         | —          |
| Realtime          | Socket.IO              | ^4.8       |
| Mã hóa mật khẩu  | bcrypt                 | ^6.0       |
| Xác thực dữ liệu  | class-validator        | ^0.15      |
| Package Manager   | pnpm                   | Latest     |
| Container         | Docker + Compose       | —          |

---

## Kiến trúc hệ thống

```
Client (Frontend / Mobile)
        |
        |  HTTP (REST API) / WebSocket
        v
+---------------------------+
|     BambooSync Server     |
|  (NestJS Application)     |
+---------------------------+
|                           |
|  Auth Module              |  -- JWT Access Token + Refresh Token
|  Board Module             |  -- CRUD bảng công việc
|  Column Module            |  -- CRUD cột trong bảng
|  Task Module              |  -- CRUD task, priority, due date
|  Realtime Module          |  -- Socket.IO Gateway
|  Activity Log             |  -- Theo dõi hành động người dùng
|                           |
+---------------------------+
           |
           | Prisma ORM
           v
+---------------------------+
|       PostgreSQL          |
+---------------------------+
```

---

## Cấu trúc dự án

```
server/
├── src/
│   ├── auth/               # Xác thực: đăng nhập, đăng ký, refresh token
│   ├── board/              # Quản lý bảng (Board): tạo, sửa, xoá, invite
│   ├── collumn/            # Quản lý cột (Column) trong bảng
│   ├── task/               # Quản lý task: CRUD, priority, due date
│   ├── realtime/           # WebSocket Gateway (Socket.IO)
│   ├── prisma/             # PrismaService và module kết nối DB
│   ├── common/             # Guards, decorators, filters dùng chung
│   ├── app.module.ts       # Module gốc của ứng dụng
│   └── main.ts             # Điểm khởi động ứng dụng
├── prisma/
│   ├── schema.prisma       # Định nghĩa schema cơ sở dữ liệu
│   └── migrations/         # Lịch sử migration
├── test/                   # E2E tests
├── docs/                   # Tài liệu và tài nguyên tĩnh
├── Dockerfile              # Cấu hình Docker build
├── docker-compose.yml      # Cấu hình Docker Compose
├── .env.example            # Mẫu biến môi trường
└── package.json
```

---

## Yêu cầu môi trường

Trước khi cài đặt, hãy đảm bảo máy đã có:

- **Node.js** >= 20.x
- **pnpm** >= 9.x — nếu chưa có, cài bằng lệnh:
  ```bash
  npm install -g pnpm
  ```
- **PostgreSQL** >= 15 (hoặc chạy qua Docker)
- **Docker** (tuỳ chọn, nếu dùng container)

---

## Cài đặt và chạy dự án

### 1. Clone repository

```bash
git clone <repository-url>
cd server
```

### 2. Cài đặt dependencies

```bash
pnpm install
```

### 3. Cấu hình biến môi trường

Sao chép file mẫu và điền thông tin thực tế:

```bash
cp .env.example .env
```

Chỉnh sửa file `.env` theo hướng dẫn ở phần [Biến môi trường](#biến-môi-trường).

### 4. Khởi tạo cơ sở dữ liệu

```bash
# Tạo bảng theo schema (lần đầu)
pnpm prisma migrate dev

# Tạo Prisma Client
pnpm prisma generate
```

### 5. Chạy ứng dụng

```bash
# Chế độ development (tự động reload khi code thay đổi)
pnpm run start:dev

# Chế độ production
pnpm run start:prod

# Chế độ thông thường
pnpm run start
```

Sau khi khởi động, server sẽ lắng nghe tại:
```
http://localhost:3000
```

---

## Biến môi trường

Tạo file `.env` ở thư mục gốc dự án với nội dung sau:

```env
# Chuỗi kết nối PostgreSQL
# Cú pháp: postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/bamboosync

# Khoá bí mật để ký Access Token (JWT)
# Nên dùng chuỗi ngẫu nhiên dài ít nhất 32 ký tự
JWT_ACCESS_SECRET=your_access_secret_key_here

# Khoá bí mật để ký Refresh Token (JWT)
# Nên khác với JWT_ACCESS_SECRET
JWT_REFRESH_SECRET=your_refresh_secret_key_here

# Thời gian hết hạn của Access Token
# Ví dụ: 15m (15 phút), 1h (1 giờ), 1d (1 ngày)
JWT_ACCESS_EXPIRES_IN=15m

# Thời gian hết hạn của Refresh Token
# Ví dụ: 7d (7 ngày), 30d (30 ngày)
JWT_REFRESH_EXPIRES_IN=7d
```

> **Lưu ý bảo mật:** Không bao giờ commit file `.env` lên repository. File này đã được thêm vào `.gitignore`.

---

## Cơ sở dữ liệu

Dự án sử dụng **Prisma ORM** với **PostgreSQL**. Dưới đây là tóm tắt các model chính:

| Model         | Mô tả                                                          |
|---------------|----------------------------------------------------------------|
| `User`        | Tài khoản người dùng (email, mật khẩu, avatar, role)          |
| `Board`       | Bảng công việc (tên, mô tả, invite code, public/private)      |
| `BoardMember` | Thành viên trong bảng (hỗ trợ cả guest không cần tài khoản)   |
| `Column`      | Cột trong bảng (tên, thứ tự)                                   |
| `Task`        | Công việc (tiêu đề, mô tả, độ ưu tiên, ngày đến hạn)         |
| `ActivityLog` | Nhật ký hoạt động (theo dõi mọi thao tác trên bảng)           |

### Các lệnh Prisma thường dùng

```bash
# Tạo migration mới sau khi thay đổi schema
pnpm prisma migrate dev --name ten_migration

# Áp dụng migration lên production (không tạo migration mới)
pnpm prisma migrate deploy

# Mở Prisma Studio — giao diện quản lý dữ liệu trực quan
pnpm prisma studio

# Cập nhật lại Prisma Client sau khi thay đổi schema
pnpm prisma generate

# Kiểm tra schema có hợp lệ không
pnpm prisma validate
```

---

## Chạy kiểm thử

```bash
# Chạy unit tests
pnpm run test

# Chạy unit tests ở chế độ watch (tự chạy lại khi code thay đổi)
pnpm run test:watch

# Chạy end-to-end tests
pnpm run test:e2e

# Xem báo cáo độ phủ (code coverage)
pnpm run test:cov
```

---

## Triển khai với Docker

Dự án đã được cấu hình sẵn để chạy với Docker.

### Chạy toàn bộ stack (Server + PostgreSQL)

```bash
# Build image và khởi động tất cả container
docker-compose up --build

# Chạy ở nền (detached mode)
docker-compose up --build -d

# Dừng tất cả container
docker-compose down

# Dừng và xoá cả volume dữ liệu (cẩn thận — xoá toàn bộ dữ liệu DB)
docker-compose down -v
```

### Build image độc lập

```bash
# Build Docker image
docker build -t bamboosync-server .

# Chạy container
docker run -p 3000:3000 --env-file .env bamboosync-server
```

---

## Quy trình phát triển

```bash
# Format code
pnpm run format

# Kiểm tra linting
pnpm run lint

# Build production bundle
pnpm run build
```

---

<p align="center">
  <sub>BambooSync Server — Built with NestJS · Prisma · PostgreSQL · Socket.IO</sub>
</p>
