# Hướng Dẫn Triển Khai & Vận Hành (Deployment & Operations Guide)

Tài liệu này hướng dẫn chi tiết quy trình đóng gói (build), triển khai (deploy), cấu hình môi trường, giám sát và xử lý sự cố cho **BambooSync Server**.

---

## 1. Kiến Trúc Đóng Gói Docker (Containerization)

Dự án sử dụng cơ chế **Multi-stage Docker Build** (`Dockerfile`) nhằm tối ưu hóa dung lượng image và nâng cao tính bảo mật khi vận hành trong môi trường Production.

### 1.1. Phân Tích Dockerfile

```dockerfile
#=================STAGE 1: BUILD=====================
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN npx prisma generate

RUN pnpm run build

#=================STAGE 2: PRODUCTION=================
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
```

- **Giai đoạn 1 (`builder`)**: Sử dụng base image `node:22-alpine`, cài đặt `pnpm@9`, cài đặt đầy đủ `devDependencies`, sinh mã nguồn Prisma Client (`npx prisma generate`) và biên dịch TypeScript sang JavaScript (`dist/`).
- **Giai đoạn 2 (`production`)**: Chỉ sao chép các thành phần cần thiết (`dist`, `node_modules`, `prisma`, `package.json`), loại bỏ toàn bộ mã nguồn TypeScript gốc và công cụ dev.
- **Entrypoint**: Tự động chạy `npx prisma migrate deploy` trước khi khởi động tiến trình Node.js (`node dist/main`) để đảm bảo schema database luôn đồng bộ với mã nguồn mới nhất.

---

## 2. Hướng Dẫn Build & Chạy Ứng Dụng

### 2.1. Khởi Chạy Cụm Hạ Tầng với Docker Compose
File `docker-compose.yml` định nghĩa sẵn 2 dịch vụ phụ trợ:
- **PostgreSQL 16**: Port binding `5433:5432` (tránh xung đột với PostgreSQL mặc định chạy trên máy host tại port 5432).
- **Redis 7**: Port binding `6379:6379` (dự phòng cho tầng caching hoặc WebSocket adapter).

```bash
# 1. Khởi động PostgreSQL và Redis ở chế độ chạy nền
docker-compose up -d

# 2. Kiểm tra trạng thái sức khỏe các containers
docker-compose ps
```

### 2.2. Đóng Gói và Chạy Image Backend Server

```bash
# 1. Build image Docker
docker build -t bamboosync-server:latest .

# 2. Chạy container độc lập (kết nối tới PostgreSQL chạy ở host hoặc Docker network)
docker run -d \
  --name bamboosync-backend \
  -p 3000:3000 \
  --env-file .env \
  bamboosync-server:latest
```

---

## 3. Cấu Hình Môi Trường (Environment Configurations)

Bảng phân định sự khác biệt về tham số cấu hình giữa các môi trường:

| Biến Môi Trường | Development (Local) | Staging | Production |
|-----------------|---------------------|---------|------------|
| `NODE_ENV` | `development` | `staging` | `production` |
| `PORT` | `3000` | `3000` | `3000` (hoặc do Platform cấp) |
| `DATABASE_URL` | `postgresql://bamboo:bamboo123@127.0.0.1:5433/bamboosyncboard?schema=public` | URL Managed Postgres Staging | URL Managed Postgres HA (Cockroach/RDS/Supabase) kèm connection pooling |
| `JWT_ACCESS_SECRET` | Khóa tạm local | Chuỗi bí mật ngẫu nhiên dài >= 32 ký tự | Vault / AWS Secrets Manager quản lý |
| `JWT_REFRESH_SECRET`| Khóa tạm local | Chuỗi bí mật khác biệt hoàn toàn | Vault / AWS Secrets Manager quản lý |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | `15m` | `15m` |
| `JWT_REFRESH_EXPIRES_IN`| `7d` | `7d` | `7d` (hoặc giảm xuống theo chính sách an ninh) |

---

## 4. Tự Động Hóa CI/CD (Continuous Integration & Delivery)

Dự án đã được tích hợp quy trình **GitHub Actions CI Pipeline** tại [.github/workflows/ci.yml](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/.github/workflows/ci.yml) nhằm tự động kiểm tra chất lượng mã nguồn trên mỗi lượt `push` hoặc `pull_request` ở mọi nhánh (`'**'`).

### 4.1. Kiến Trúc CI Pipeline

Quy trình CI bao gồm 2 công việc (jobs) độc lập:

1. **`lint-and-test`**:
   - Khởi tạo service container **PostgreSQL 16** với health check `pg_isready`.
   - Cài đặt `pnpm 9` và `Node.js 22` có bộ nhớ đệm (cache dependencies).
   - Xác thực schema (`pnpm prisma validate`) và sinh Prisma Client (`pnpm prisma generate`).
   - Kiểm tra phong cách mã nguồn qua ESLint (`pnpm run lint`).
   - Chạy migration database trên container (`pnpm prisma migrate deploy`).
   - Biên dịch TypeScript (`pnpm run build`).
   - Chạy kiểm thử Unit test (`pnpm run test`) và End-to-End (`pnpm run test:e2e`).

2. **`docker-build`** *(chạy sau khi `lint-and-test` thành công)*:
   - Sử dụng Docker Buildx để kiểm tra tính toàn vẹn của tiến trình đóng gói multi-stage container từ [Dockerfile](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/Dockerfile).

---

## 5. Xử Lý Sự Cố Thường Gặp & Rollback

### 5.1. Các Lỗi Phổ Biến và Hướng Giải Quyết

#### Lỗi 1: Không thể kết nối Database khi khởi động
- **Triệu chứng**: Container server bị restart liên tục, log báo `Can't reach database server at 127.0.0.1:5433`.
- **Nguyên nhân**: Khi chạy trong Docker container, `127.0.0.1` là localhost của chính container đó chứ không phải máy host.
- **Khắc phục**: Thay `127.0.0.1` trong `DATABASE_URL` thành `host.docker.internal` (Docker Desktop) hoặc dùng chung Docker Network với container PostgreSQL (`postgres`).

#### Lỗi 2: Migration bị kẹt ở trạng thái failed
- **Triệu chứng**: `npx prisma migrate deploy` báo lỗi `Database error: P3009 - migrate found failed migrations`.
- **Khắc phục**:
  ```bash
  # Đánh dấu bỏ qua hoặc rolled-back migration bị lỗi
  npx prisma migrate resolve --rolled-back <ten_migration>
  ```

### 5.2. Quy Trình Rollback Phiên Bản Ứng Dụng

1. **Rollback Container Image**:
   - Trong trường hợp bản cập nhật mới có lỗi nghiêm trọng, lập tức điều hướng container về tag image ổn định trước đó:
     ```bash
     docker stop bamboosync-backend
     docker run -d --name bamboosync-backend -p 3000:3000 --env-file .env bamboosync-server:<stable_tag>
     ```
2. **Rollback Database**:
   - Nếu bản release có đi kèm thay đổi cấu trúc bảng (schema changes), chuẩn bị sẵn script SQL đảo ngược và chạy trực tiếp bằng `psql` hoặc qua Prisma migration revert.
