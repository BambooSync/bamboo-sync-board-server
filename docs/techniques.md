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
  3. **Chỉ mục khóa ngoại (Non-Unique Foreign Key Indexes)**:
     - Bảng `tasks`, cột `columnId`:
       - Schema: [prisma/schema.prisma:104](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/prisma/schema.prisma#L104) (`@@index([columnId])`)
       - Migration SQL: [prisma/migrations/20260907024640_add_task_column_id_index/migration.sql:2](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/prisma/migrations/20260907024640_add_task_column_id_index/migration.sql#L2) (`CREATE INDEX "tasks_columnId_idx" ON "tasks"("columnId");`)
       - *Mục đích*: Tối ưu hóa tốc độ truy vấn danh sách task theo cột khi nạp Kanban Board (`WHERE "columnId" IN (...)`), tăng tốc đếm số task và hỗ trợ xử lý cascade delete từ cột.
- **Khoảng trống (Gap) cần cải thiện**:
  - Các cột khóa ngoại khác thường xuyên dùng để lọc (`WHERE`) và kết nối (`JOIN`) như:
    - `columns.boardId`
    - `boards.ownerId`
    - `activity_logs.boardId`
  hiện **chưa được đánh index riêng biệt (non-unique index)**. Khi dữ liệu mở rộng, có thể cân nhắc bổ sung index tương tự như đã làm với `tasks.columnId`.

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
- **Trạng thái**: **Đang áp dụng (Redis In-Memory Cache)**
- **Bằng chứng trong mã nguồn**:
  - Container `redis:7-alpine` trong [docker-compose.yml:22-35](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/docker-compose.yml#L22-L35).
  - Thư viện `ioredis` được cài đặt và quản lý tập trung thông qua `RedisModule` toàn cục ([src/redis/redis.module.ts](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/redis/redis.module.ts)) và [src/redis/redis.service.ts](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/redis/redis.service.ts).
  - Thiết kế có cơ chế **Graceful Degradation / Cache Bypass**: Nếu Redis gặp sự cố hoặc gián đoạn mạng, `RedisService` tự động bắt lỗi và trả về `null` để server fallback trực tiếp sang PostgreSQL, không làm gián đoạn request của người dùng.

---

### 2.2. Caching Patterns (Cache-Aside Pattern)
- **Trạng thái**: **Đang áp dụng cho dữ liệu Bảng Kanban (`GET /boards/:id`)**
- **Bằng chứng & Luồng xử lý trong mã nguồn**:
  1. **Đọc dữ liệu (Cache-Aside Read)**:
     - Tại [src/board/board.service.ts:46-77](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/board/board.service.ts#L46-L77), hàm `findOne()` kiểm tra cache Redis theo khóa `board:${id}`:
       - *Cache HIT*: Lấy trực tiếp dữ liệu từ Redis RAM, kiểm tra quyền xem của user và trả về phản hồi trong ~1–2ms.
       - *Cache MISS*: Truy vấn đầy đủ Board kèm Columns và Tasks từ PostgreSQL qua Prisma, kiểm tra quyền và lưu kết quả vào Redis với TTL 10 phút (`set(cacheKey, board, 600)`).
  2. **Vô hiệu hóa bộ nhớ đệm (Cache Invalidation)**:
     - Khi Board thay đổi (cập nhật thông tin, xóa board, thành viên mới gia nhập): [src/board/board.service.ts](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/board/board.service.ts) gọi `this.redisService.del("board:" + id)`.
     - Khi Column thay đổi (tạo cột, sắp xếp lại thứ tự `reorder`, xóa cột): [src/collumn/column.service.ts](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/collumn/column.service.ts) gọi `this.redisService.del("board:" + boardId)`.
     - Khi Task thay đổi (tạo task, sửa task, chuyển cột `move`, xóa task): [src/task/task.service.ts](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/task/task.service.ts) gọi `this.redisService.del("board:" + column.boardId)`.

---

### 2.3. Chính Sách Thu Hồi Bộ Nhớ Đệm (Eviction Policies: TTL)
- **Trạng thái**: **Đang áp dụng (Time-To-Live - TTL)**
- **Bằng chứng trong mã nguồn**:
  - Dữ liệu Board được gán TTL mặc định 600 giây (10 phút) thông qua lệnh `SET ... EX 600` tại [src/redis/redis.service.ts](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/redis/redis.service.ts) và [src/board/board.service.ts:75](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/board/board.service.ts#L75). Dữ liệu tự động được giải phóng khỏi RAM khi hết hạn.

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
- **Trạng thái**: **Đang áp dụng (Redis Pub/Sub Adapter cho WebSocket)**
- **Bằng chứng trong mã nguồn**:
  1. **Tích hợp Redis Adapter cho Socket.IO**:
     - File: [src/realtime/adapters/redis-io.adapter.ts](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/realtime/adapters/redis-io.adapter.ts)
     - Khởi tạo hai kết nối Redis (`pubClient` và `subClient` qua `ioredis`) và gán adapter bằng `createAdapter(pubClient, subClient)` từ thư viện `@socket.io/redis-adapter`.
     - Được đăng ký toàn cục tại [src/main.ts](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/main.ts) thông qua `app.useWebSocketAdapter(redisIoAdapter)`.
     - Thiết kế **Graceful Fallback**: Nếu Redis offline hoặc gặp lỗi kết nối, adapter tự động chuyển về in-memory adapter mặc định của Socket.IO, tránh làm sập ứng dụng.
  2. **Đồng bộ sự kiện và Phòng (Rooms) phân tán**:
     - File: [src/realtime/gateways/board.gateway.ts](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/realtime/gateways/board.gateway.ts)
     - Quản lý kênh/phòng qua `client.join(data.boardId)` và `client.leave(data.boardId)`.
     - Khi một container phát sự kiện (`this.server.to(boardId).emit(...)` hoặc `client.to(boardId).emit(...)`), Redis Pub/Sub sẽ tự động broadcast sự kiện đó tới tất cả các instance/pod khác trong cụm để gửi tiếp tới client đích.
- **Khả năng mở rộng (Scalability)**:
  - Cho phép hệ thống scale ngang (Horizontal Scaling) thành nhiều container (Cluster / Kubernetes Pods) đằng sau Load Balancer mà không làm đứt gãy kết nối hoặc thất lạc sự kiện thời gian thực giữa các người dùng ở khác container.

---

### 3.3. Kiến Trúc Hướng Sự Kiện (Event-Driven Architecture)
- **Trạng thái**: **Đang áp dụng (Đã tích hợp hoàn chỉnh)**
- **Bằng chứng & Phân tích chi tiết**:
  1. Thư viện `@nestjs/event-emitter: ^3.1.0` được đăng ký toàn cục tại [src/app.module.ts:14](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/app.module.ts#L14) (`EventEmitterModule.forRoot()`).
  2. **Nơi phát sự kiện (Event Producer)**:
     - Lớp `TaskService` ([src/task/task.service.ts:8-12](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/task/task.service.ts#L8-L12)) inject `EventEmitter2`.
     - Bắn sự kiện nội bộ sau khi hoàn thành thao tác C-U-D trong Database:
       - `this.eventEmitter.emit('task.created', { boardId, task })` khi tạo task mới.
       - `this.eventEmitter.emit('task.updated', { boardId, task })` khi sửa task.
       - `this.eventEmitter.emit('task.moved', { boardId, task })` khi di chuyển cột hoặc đổi thứ tự.
       - `this.eventEmitter.emit('task.deleted', { boardId, taskId })` khi xóa task.
  3. **Nơi lắng nghe sự kiện (Event Consumer / WebSocket Broadcaster)**:
     - Lớp `BoardGateway` ([src/realtime/gateways/board.gateway.ts:127-147](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/realtime/gateways/board.gateway.ts#L127-L147)) bắt các sự kiện qua decorator `@OnEvent` và lập tức broadcast xuống toàn bộ client trong phòng WebSocket tương ứng:
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
  - *Ý nghĩa*: Hoàn thiện "cầu nối" phân tách (Decoupling) giữa tầng REST API và tầng WebSocket. `TaskService` không cần phụ thuộc trực tiếp vào `BoardGateway` mà vẫn kích hoạt được việc phát sóng realtime tức thời tới toàn bộ người dùng đang mở bảng Kanban.

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
| **Rate Limiting** | **Đang áp dụng (Redis-Backed Distributed Throttler)** | Tích hợp `@nestjs/throttler` và `@nest-lab/throttler-storage-redis` trong [src/app.module.ts](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/app.module.ts). Giới hạn mặc định toàn cục 60 req/phút, siết chặt 5 req/phút cho Auth (`/auth/login`, `/auth/register`) tại [src/auth/auth.controller.ts](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/auth/auth.controller.ts). Sử dụng `RedisThrottlerGuard` ([src/common/guards/redis-throttler.guard.ts](file:///c:/Users/MY%20MSI/Desktop/Project/Software/BambooSync/server/src/common/guards/redis-throttler.guard.ts)) với graceful degradation nếu Redis gặp sự cố. |
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
