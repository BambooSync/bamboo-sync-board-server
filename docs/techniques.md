# Báo Cáo Kỹ Thuật & Design Patterns (Techniques & Patterns Report)

Tài liệu này là báo cáo kỹ thuật chuyên sâu đối chiếu **trực tiếp với mã nguồn thực tế** của repository **BambooSync Server**. Mỗi kỹ thuật được phân loại rõ ràng: có trích dẫn bằng chứng cụ thể (tệp tin, lớp, phương thức, dòng code) nếu đang được áp dụng, hoặc ghi rõ **"Chưa áp dụng"** kèm đánh giá khoảng trống (gap analysis) nếu hệ thống chưa triển khai.

---

## 1. Cơ Sở Dữ Liệu (Database Architecture & Engineering)

### 1.1. Indexing (Chỉ mục)
- **Trạng thái**: **Đang áp dụng (Có chọn lọc)**
- **Bằng chứng trong mã nguồn**:
  1. **Chỉ mục duy nhất (Unique Indexes)**:
     - Bảng `users`, cột `email`:
       - Schema: [prisma/schema.prisma:13](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/prisma/schema.prisma#L13) (`email String @unique`)
       - Migration SQL: [prisma/migrations/20260815004925_init/migration.sql:97](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/prisma/migrations/20260815004925_init/migration.sql#L97) (`CREATE UNIQUE INDEX "users_email_key" ON "users"("email");`)
     - Bảng `boards`, cột `inviteCode`:
       - Schema: [prisma/schema.prisma:36](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/prisma/schema.prisma#L36) (`inviteCode String @unique @default(cuid())`)
       - Migration SQL: [prisma/migrations/20260815004925_init/migration.sql:100](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/prisma/migrations/20260815004925_init/migration.sql#L100) (`CREATE UNIQUE INDEX "boards_inviteCode_key" ON "boards"("inviteCode");`)
     - Bảng `board_members`, cặp cột phức hợp `[boardId, userId]`:
       - Schema: [prisma/schema.prisma:64](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/prisma/schema.prisma#L64) (`@@unique([boardId, userId])`)
       - Migration SQL: [prisma/migrations/20260815004925_init/migration.sql:103](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/prisma/migrations/20260815004925_init/migration.sql#L103) (`CREATE UNIQUE INDEX "board_members_boardId_userId_key" ON "board_members"("boardId", "userId");`)
  2. **Chỉ mục khóa chính (Primary Key Indexes)**:
     - Tự động tạo B-tree index trên cột `id` cho 6 bảng: `users_pkey`, `boards_pkey`, `board_members_pkey`, `columns_pkey`, `tasks_pkey`, `activity_logs_pkey`.
- **Khoảng trống (Gap) cần cải thiện**:
  - Các cột khóa ngoại thường xuyên dùng để lọc (`WHERE`) và kết nối (`JOIN`) như:
    - `tasks.columnId`
    - `columns.boardId`
    - `boards.ownerId`
    - `activity_logs.boardId`
  hiện **chưa được đánh index riêng biệt (non-unique index)** qua `@@index([columnId])` trong `prisma/schema.prisma`. Khi số lượng task và log tăng cao, các truy vấn lấy danh sách sẽ phải quét toàn bảng (Sequential Scan).

---

### 1.2. Transactions / Tính Toàn Vẹn ACID
- **Trạng thái**: **Đang áp dụng**
- **Bằng chứng trong mã nguồn**:
  1. **Explicit Batch Transaction (`prisma.$transaction`)**:
     - Vị trí: [src/collumn/column.service.ts:17-27](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/collumn/column.service.ts#L17-L27)
     - Lớp: `ColumnService`, hàm `reorder()`
     ```typescript
     async reorder(boardId: string, dto: ReorderColumnDto) {
       // Cập nhật order hàng loạt trong 1 transaction — đảm bảo không bị lệch nếu có lỗi giữa chừng
       return this.prisma.$transaction(
         dto.columns.map(col =>
           this.prisma.column.update({
             where: { id: col.id },
             data: { order: col.order },
           }),
         ),
       );
     }
     ```
     - *Ý nghĩa*: Đảm bảo tính nguyên tử (Atomicity). Khi hoán đổi vị trí của nhiều cột trên giao diện Kanban, toàn bộ các câu lệnh `UPDATE` phải thành công đồng thời; nếu một câu lệnh lỗi, toàn bộ thao tác sẽ bị rollback.
  2. **Implicit Nested Write Transaction**:
     - Vị trí: [src/board/board.service.ts:10-30](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/board/board.service.ts#L10-L30)
     - Lớp: `BoardService`, hàm `create()`
     - Prisma tự động bao bọc toàn bộ thao tác tạo Board kèm 3 cột mặc định (`columns.create`) và tạo liên kết chủ sở hữu (`members.create`) trong một transaction đơn ở tầng cơ sở dữ liệu.

---

### 1.3. Cấu Hình Transaction Isolation Level
- **Trạng thái**: **Chưa áp dụng**
- **Đánh giá**:
  - Không có cấu hình mức độ cô lập rõ ràng (ví dụ: `isolationLevel: Prisma.TransactionIsolationLevel.Serializable`) trong các lời gọi `$transaction` tại `src/collumn/column.service.ts`.
  - Hệ thống phụ thuộc 100% vào mức cô lập mặc định của PostgreSQL là **`Read Committed`**.

---

### 1.4. Chuẩn Hóa & Bán Chuẩn Hóa (Normalization vs Denormalization)
- **Trạng thái**: **Đang áp dụng chuẩn hóa 3NF kết hợp Bán chuẩn hóa có chủ đích**
- **Bằng chứng trong mã nguồn**:
  1. **Chuẩn hóa (Normalization - 3NF)**:
     - Tách biệt độc lập các thực thể `users`, `boards`, `board_members`, `columns`, `tasks`, `activity_logs`.
     - Không lưu JSON phức tạp hay mảng ID tự do cho các mối quan hệ nghiệp vụ chính.
     - Sử dụng quan hệ n-n thông qua bảng trung gian chuẩn mực `board_members` có khóa ngoại trỏ về `boards` và `users`.
  2. **Bán chuẩn hóa có chủ đích (Denormalization)**:
     - Vị trí: [prisma/schema.prisma:123-124](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/prisma/schema.prisma#L123-L124) trong model `ActivityLog`:
       ```prisma
       userId    String?
       user      User?      @relation(fields: [userId], references: [id])
       actorName String
       ```
       *Lý do*: Trường `actorName` lưu chuỗi tên trực tiếp thay vì chỉ phụ thuộc vào `user.name`. Điều này nhằm bảo toàn snapshot tên người thực hiện tại thời điểm quá khứ, bảo vệ dữ liệu audit log kể cả khi tài khoản bị xóa (`onDelete: SetNull`) hoặc người dùng đổi tên.
     - Vị trí: [prisma/schema.prisma:58-59](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/prisma/schema.prisma#L58-L59) trong model `BoardMember`:
       Lưu trữ trực tiếp `guestName` và `guestColor` dạng nullable để hỗ trợ khách vãng lai tham gia bảng thời gian thực mà không yêu cầu tạo bản ghi tài khoản `User`.

---

### 1.5. Sharding & Partitioning (Phân mảnh bảng)
- **Trạng thái**: **Chưa áp dụng**
- **Đánh giá**: Codebase và migration SQL không chứa câu lệnh `PARTITION BY` (theo thời gian hoặc theo boardId). Database chạy trên một instance PostgreSQL duy nhất.

---

### 1.6. Database Replication (Read Replica / Master-Slave)
- **Trạng thái**: **Chưa áp dụng**
- **Đánh giá**:
  - `PrismaService` ([src/prisma/prisma.service.ts:1-27](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/prisma/prisma.service.ts)) chỉ kết nối tới một chuỗi kết nối duy nhất `DATABASE_URL`.
  - Chưa sử dụng Prisma Extension `@prisma/extension-read-replicas` để phân tách luồng đọc (`findMany`, `findUnique`) sang Replica và luồng ghi (`create`, `update`, `delete`) sang Master.

---

## 2. Chiến Lược Lưu Bộ Nhớ Đệm (Caching Strategy)

### 2.1. Caching Tầng Ứng Dụng (Application Cache)
- **Trạng thái**: **Chưa áp dụng**
- **Đánh giá & Bằng chứng**:
  - Container `redis:7-alpine` có mặt trong [docker-compose.yml:22-35](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/docker-compose.yml#L22-L35).
  - Tuy nhiên, trong [package.json](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/package.json) hoàn toàn **không cài đặt** các package như `ioredis`, `redis`, `@nestjs/cache-manager`, hay `cache-manager`.
  - Toàn bộ các service nghiệp vụ (`BoardService`, `TaskService`, `ColumnService`, `AuthService`) đều truy vấn trực tiếp vào PostgreSQL qua Prisma mà không có tầng kiểm tra cache.
  - *Lưu ý*: Lớp `PresenceService` ([src/realtime/services/presence.service.ts:10-30](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/realtime/services/presence.service.ts#L10-L30)) có dùng biến in-memory `private rooms = new Map<string, Map<string, OnlineMember>>()`. Đây là **quản lý trạng thái phiên trực tuyến tạm thời (Session/Presence State)** của WebSocket, không phải là Cache dữ liệu của Database.

---

### 2.2. Caching Patterns (Cache-Aside, Write-Through, Write-Back, Read-Through)
- **Trạng thái**: **Chưa áp dụng**

---

### 2.3. Chính Sách Thu Hồi Bộ Nhớ Đệm (Eviction Policies: TTL, LRU, LFU)
- **Trạng thái**: **Chưa áp dụng**

---

### 2.4. Mạng Phân Phối Nội Dung (CDN cho Static Assets)
- **Trạng thái**: **Chưa áp dụng**
- **Đánh giá**: Hệ thống hiện tại chỉ phục vụ các API phản hồi JSON động, không có chức năng upload/serving file tĩnh (ảnh, tệp đính kèm) qua S3/CloudFront/Cloudflare.

---

### 2.5. Quản Lý Connection Pooling (Database Connection Pool)
- **Trạng thái**: **Chưa cấu hình tùy chỉnh (Đang dùng thiết lập mặc định của Prisma Client)**
- **Bằng chứng trong mã nguồn**:
  - Tại [src/prisma/prisma.service.ts:8-16](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/prisma/prisma.service.ts#L8-L16), hàm khởi tạo `super(...)` chỉ cấu hình mức độ log:
    ```typescript
    constructor() {
      super({
        log: [
          { emit: 'event', level: 'query' },
          { emit: 'stdout', level: 'error' },
          { emit: 'stdout', level: 'warn' },
        ],
      });
    }
    ```
  - Trong [.env](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/.env#L1), chuỗi `DATABASE_URL="postgresql://bamboo:bamboo123@127.0.0.1:5433/bamboosyncboard?schema=public"` không chỉ định tham số `connection_limit` hoặc `pool_timeout`.
  - *Cơ chế hoạt động hiện tại*: Prisma tự động tính toán pool size theo công thức mặc định: `num_physical_cpus * 2 + 1`.

---

## 3. Giao Tiếp Bất Đồng Bộ & Hệ Thống Phân Tán

### 3.1. Hàng Đợi Thông Điệp (Message Queue: Kafka, RabbitMQ, SQS, BullMQ)
- **Trạng thái**: **Chưa áp dụng**
- **Đánh giá**: Không có cấu hình broker, producer hay consumer hàng đợi nào trong codebase.

---

### 3.2. Mô Hình Xuất Bản / Đăng Ký (Pub/Sub Pattern)
- **Trạng thái**: **Đang áp dụng trong phạm vi cục bộ (In-Process WebSocket Rooms)**
- **Bằng chứng trong mã nguồn**:
  - File: [src/realtime/gateways/board.gateway.ts](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/realtime/gateways/board.gateway.ts)
  - Lớp: `BoardGateway`
  - Đăng ký kênh (Subscribe to Topic):
    ```typescript
    // Dòng 59: Client tham gia phòng theo boardId
    client.join(data.boardId);
    ```
  - Hủy đăng ký kênh (Unsubscribe):
    ```typescript
    // Dòng 77: Client rời khỏi phòng
    client.leave(data.boardId);
    ```
  - Xuất bản dữ liệu tới kênh (Publish to Topic):
    ```typescript
    // Dòng 69, 84, 155: Gửi thông báo cập nhật presence cho toàn bộ subscriber trong room
    this.server.to(data.boardId).emit('presence:update', online);

    // Dòng 94: Gửi vị trí con trỏ tới mọi subscriber trừ người gửi
    client.to(data.boardId).emit('cursor:update', { userId: client.data.userId, x: data.x, y: data.y });
    ```
- **Hạn chế về tính phân tán**:
  - Chỉ hoạt động trên một Node.js process đơn lẻ.
  - Khi scale ngang (Horizontal Scaling) thành nhiều container qua Kubernetes hoặc Docker Swarm, các client ở khác container sẽ không nhìn thấy nhau do **chưa tích hợp Redis Pub/Sub Adapter** (`@socket.io/redis-adapter`).

---

### 3.3. Kiến Trúc Hướng Sự Kiện (Event-Driven Architecture)
- **Trạng thái**: **Triển khai dở dang / Chưa hoàn thiện (Partially Implemented / Gap)**
- **Bằng chứng & Phân tích chi tiết**:
  1. Thư viện `@nestjs/event-emitter: ^3.1.0` đã được cài đặt trong [package.json:27](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/package.json#L27).
  2. Tại [src/realtime/gateways/board.gateway.ts:127-147](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/realtime/gateways/board.gateway.ts#L127-L147), lớp `BoardGateway` đã khai báo sẵn 4 hàm lắng nghe sự kiện:
     ```typescript
     @OnEvent('task.created')
     handleTaskCreated(payload: { boardId: string; task: unknown }) {
       this.server.to(payload.boardId).emit('task:created', payload.task);
     }

     @OnEvent('task.updated')
     handleTaskUpdated(payload: { boardId: string; task: unknown }) {
       this.server.to(payload.boardId).emit('task:updated', payload.task);
     }

     @OnEvent('task.moved')
     handleTaskMoved(payload: { boardId: string; task: unknown }) {
       this.server.to(payload.boardId).emit('task:moved', payload.task);
     }

     @OnEvent('task.deleted')
     handleTaskDeleted(payload: { boardId: string; taskId: string }) {
       this.server.to(payload.boardId).emit('task:deleted', { taskId: payload.taskId });
     }
     ```
  3. **Lỗ hổng mã nguồn thực tế**:
     - Trong [src/app.module.ts](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/app.module.ts), `EventEmitterModule.forRoot()` **chưa được import**.
     - Trong [src/task/task.service.ts](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/task/task.service.ts), `EventEmitter2` **chưa được inject**, và các hàm `create()`, `update()`, `move()`, `remove()` hoàn toàn không gọi `this.eventEmitter.emit('task.created', ...)`.
     - *Hậu quả*: Các sự kiện thay đổi Task qua REST API hiện tại chưa tự động kích hoạt broadcast WebSocket tới các client trong room.

---

### 3.4. Phân Định Luồng Đồng Bộ (Synchronous) vs Bất Đồng Bộ (Asynchronous)

| Phân Loại | Kênh Giao Tiếp | Thành Phần Trong Code | Bản Chất Xử Lý |
|-----------|----------------|------------------------|-----------------|
| **Đồng bộ (Synchronous)** | HTTP REST API | - `AuthController` (`POST /register`, `POST /login`, `GET /me`)<br/>- `BoardController` (CRUD Boards, Join)<br/>- `ColumnController` (Create, Reorder, Remove)<br/>- `TaskController` (CRUD Tasks, Move)<br/>- `AppController` (`GET /health`) | Client gửi yêu cầu HTTP, luồng xử lý truy vấn cơ sở dữ liệu qua `await`, trả về mã trạng thái (200/201/400/403/404) và nội dung JSON trực tiếp trong cùng một chu kỳ Request/Response. |
| **Bất đồng bộ (Asynchronous)** | WebSocket (Socket.IO) | - `BoardGateway.handleCursorMove` (`cursor:move`)<br/>- `BoardGateway.handleTypingStart` (`typing:start`)<br/>- `BoardGateway.handleTypingStop` (`typing:stop`)<br/>- `BoardGateway.handleJoinRoom` (`room:join`)<br/>- `BoardGateway.handleLeaveRoom` (`room:leave`) | Non-blocking, Fire-and-forget. Server nhận socket packet từ một client và phát ngay lập tức tới các kết nối client khác trong cùng phòng mà không bắt buộc client người gửi phải chờ phản hồi dữ liệu. |

---

## 4. Các Backend Patterns Khác Đang Hoạt Động & Gaps

### 4.1. Bảng Tổng Hợp Trạng Thái Các Patterns Nâng Cao

| Pattern Kỹ Thuật | Trạng Thái | Ghi Chú & Bằng Chứng Mã Nguồn |
|------------------|------------|-------------------------------|
| **Rate Limiting** | **Chưa áp dụng** | Chưa tích hợp `@nestjs/throttler` để chống spam API hoặc brute-force mật khẩu. |
| **Circuit Breaker** | **Chưa áp dụng** | Không có cơ chế ngắt mạch tự động khi database hoặc dịch vụ ngoài gặp sự cố. |
| **Retry / Backoff** | **Chưa áp dụng** | Chưa cấu hình retry chính sách với hàm bọc hoặc interceptor. |
| **Idempotency Key** | **Chưa áp dụng** | Các thao tác tạo mới (`POST /boards`, `POST /tasks`) chưa hỗ trợ Header khóa chống tạo trùng lặp. |
| **Load Balancing** | **Chưa áp dụng** | Chưa có cấu hình reverse proxy Nginx hoặc load balancer trong repo. |
| **Service Discovery** | **Chưa áp dụng** | Không cần thiết vì hệ thống là Monolith đơn lẻ. |
| **API Gateway** | **Chưa áp dụng** | Routing và xử lý logic tập trung trực tiếp trong NestJS application. |
| **CQRS (Command Query Responsibility Segregation)** | **Chưa áp dụng** | Các service dùng chung một Prisma Client model cho cả tác vụ đọc và ghi. |
| **Saga Pattern** | **Chưa áp dụng** | Hệ thống không sử dụng phân tán giao dịch đa dịch vụ. |

---

### 4.2. Các Design Patterns Đang Được Áp Dụng Hiệu Quả Thực Tế

1. **Guard Pattern (Kiểm soát Truy cập)**:
   - [src/common/guards/jwt-auth.guard.ts:5](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/common/guards/jwt-auth.guard.ts#L5): Lớp `JwtAuthGuard` mở rộng từ `AuthGuard('jwt')` của NestJS/Passport, được gắn ở cấp độ Controller (`@UseGuards(JwtAuthGuard)`) cho `BoardController`, `ColumnController`, `TaskController`.

2. **Decorator Pattern (Trích xuất Dữ liệu Declarative)**:
   - [src/common/decorators/current-user.decorator.ts:3-8](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/common/decorators/current-user.decorator.ts#L3-L8): Custom parameter decorator `@CurrentUser()` trích xuất payload người dùng từ HTTP Request Context một cách sạch sẽ, loại bỏ việc ép kiểu thủ công `req.user`.

3. **Data Transfer Object (DTO) & Validation Pipe Pattern**:
   - Tất cả các payload đầu vào đều có DTO xác thực chặt chẽ qua thư viện `class-validator` và `class-transformer`:
     - [src/auth/dto/register.dto.ts](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/auth/dto/register.dto.ts): `@IsEmail()`, `@MinLength()`
     - [src/board/dto/create-board.dto.ts](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/board/dto/create-board.dto.ts): `@MaxLength(100)`, `@IsBoolean()`
     - [src/task/dto/create-task.dto.ts](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/task/dto/create-task.dto.ts): `@IsEnum(Priority)`, `@IsDateString()`
     - [src/collumn/dto/reorder-column.dto.ts](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/collumn/dto/reorder-column.dto.ts): `@ValidateNested({ each: true })` với class con `ColumnOrderItem`.

4. **Cascade Deletion Pattern ở Tầng Database Engine**:
   - Khai báo `onDelete: Cascade` tại [prisma/schema.prisma:53, 79, 96, 116](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/prisma/schema.prisma#L53): Đảm bảo khi xóa Board hoặc Column, toàn bộ Column con, Task và ActivityLog đều được database dọn dẹp sạch sẽ trong 1 chu kỳ mà không gây mồ côi dữ liệu.
