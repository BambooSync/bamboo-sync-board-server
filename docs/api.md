# Tài liệu API & WebSocket BambooSync Server

Tài liệu này tổng hợp toàn bộ các **HTTP REST Endpoints** và **WebSocket Events** thực tế được định nghĩa trong codebase của **BambooSync Server**.

> [!TIP]
> Hệ thống **đã tích hợp Swagger/OpenAPI UI** (`@nestjs/swagger`) tại đường dẫn **`/api/docs`** (truy cập qua `http://localhost:3000/api/docs` hoặc qua Nginx tại `http://localhost:8080/api/docs`). Bạn có thể xem schema trực quan và sử dụng tính năng "Try it out" để test API trực tiếp trên trình duyệt.


---

## 1. Thông tin Chung (General Information)

- **Base URL**: `http://localhost:3000` (hoặc cổng cấu hình qua biến môi trường `PORT`)
- **Định dạng dữ liệu**: `application/json` cho mọi request và response body.
- **Xác thực (Authentication)**: Sử dụng chuẩn **Bearer Token (JWT)** trong HTTP Header:
  ```http
  Authorization: Bearer <your_access_token>
  ```
- **Thời hạn Token**:
  - `Access Token`: Mặc định 15 phút (`JWT_ACCESS_EXPIRES_IN=15m`).
  - `Refresh Token`: Mặc định 7 ngày (`JWT_REFRESH_EXPIRES_IN=7d`).

---

## 2. Danh sách HTTP REST Endpoints

### 2.1. System / Health Check

#### `GET /health`
- **Mô tả**: Kiểm tra trạng thái hoạt động của server và khả năng kết nối tới PostgreSQL database.
- **Xác thực**: Không (Public)
- **Controller**: `AppController` (`src/app.controller.ts`)
- **Query Params**: Không
- **Response**: `200 OK`
  ```json
  {
    "status": "ok",
    "userCount": 4
  }
  ```

---

### 2.2. Module Xác thực (Authentication)

#### `POST /auth/register`
- **Mô tả**: Đăng ký tài khoản người dùng mới. Mật khẩu được băm bằng `bcrypt` trước khi lưu vào DB.
- **Xác thực**: Không (Public)
- **Controller**: `AuthController` (`src/auth/auth.controller.ts`)
- **Request Body**:
  ```json
  {
    "name": "Nguyen Van A",
    "email": "user@example.com",
    "password": "strongPassword123"
  }
  ```
  - `name`: string, tối thiểu 2 ký tự (`@MinLength(2)`).
  - `email`: string, đúng định dạng email (`@IsEmail()`).
  - `password`: string, tối thiểu 6 ký tự (`@MinLength(6)`).
- **Response**: `201 Created`
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Lỗi có thể gặp**:
  - `400 Bad Request`: Sai định dạng dữ liệu đầu vào.
  - `409 Conflict`: `{"message": "Email already exists", "error": "Conflict", "statusCode": 409}`.

#### `POST /auth/login`
- **Mô tả**: Đăng nhập bằng email và mật khẩu, trả về cặp JWT Token.
- **Xác thực**: Không (Public)
- **Controller**: `AuthController` (`src/auth/auth.controller.ts`)
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "strongPassword123"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Lỗi có thể gặp**:
  - `401 Unauthorized`: `{"message": "Email or password is incorrect", "error": "Unauthorized", "statusCode": 401}`.

#### `GET /auth/me`
- **Mô tả**: Lấy thông tin tài khoản đang đăng nhập từ JWT Token.
- **Xác thực**: Bắt buộc (`JwtAuthGuard`)
- **Controller**: `AuthController` (`src/auth/auth.controller.ts`)
- **Response**: `200 OK`
  ```json
  {
    "id": "f5e9d9e4-4a2e-4b20-80a5-298fbb94e773",
    "email": "user@example.com"
  }
  ```
- **Lỗi có thể gặp**: `401 Unauthorized`.

---

### 2.3. Module Bảng Công Việc (Board)

Tất cả các route trong `BoardController` đều yêu cầu xác thực qua `JwtAuthGuard`.

#### `POST /boards`
- **Mô tả**: Tạo bảng công việc mới. Hệ thống tự động khởi tạo 3 cột mặc định: `"To Do"` (order 0), `"Doing"` (order 1), `"Done"` (order 2) và gán người tạo vào `board_members` với vai trò `OWNER`.
- **Controller**: `BoardController.create` (`src/board/board.controller.ts`)
- **Request Body**:
  ```json
  {
    "name": "Dự án BambooSync 2026",
    "description": "Bảng quản lý công việc giai đoạn MVP",
    "isPublic": true
  }
  ```
  - `name`: string, bắt buộc, tối đa 100 ký tự.
  - `description`: string, không bắt buộc.
  - `isPublic`: boolean, không bắt buộc (mặc định: `false`).
- **Response**: `201 Created`
  ```json
  {
    "id": "b3e34b92-8077-4df3-8cfb-665b6a71391d",
    "name": "Dự án BambooSync 2026",
    "description": "Bảng quản lý công việc giai đoạn MVP",
    "inviteCode": "cly123456789",
    "isPublic": true,
    "ownerId": "f5e9d9e4-4a2e-4b20-80a5-298fbb94e773",
    "createdAt": "2026-09-04T02:00:00.000Z",
    "updatedAt": "2026-09-04T02:00:00.000Z",
    "columns": [
      { "id": "col-1", "name": "To Do", "order": 0, "boardId": "b3e34b92-..." },
      { "id": "col-2", "name": "Doing", "order": 1, "boardId": "b3e34b92-..." },
      { "id": "col-3", "name": "Done", "order": 2, "boardId": "b3e34b92-..." }
    ]
  }
  ```

#### `GET /boards`
- **Mô tả**: Lấy danh sách tất cả các bảng mà user hiện tại sở hữu (`ownerId = userId`) hoặc là thành viên (`members.some(userId)`).
- **Controller**: `BoardController.findAll` (`src/board/board.controller.ts`)
- **Response**: `200 OK`
  ```json
  [
    {
      "id": "b3e34b92-8077-4df3-8cfb-665b6a71391d",
      "name": "Dự án BambooSync 2026",
      "description": "Bảng quản lý công việc giai đoạn MVP",
      "inviteCode": "cly123456789",
      "isPublic": true,
      "ownerId": "f5e9d9e4-4a2e-4b20-80a5-298fbb94e773",
      "createdAt": "2026-09-04T02:00:00.000Z",
      "updatedAt": "2026-09-04T02:00:00.000Z",
      "owner": {
        "id": "f5e9d9e4-4a2e-4b20-80a5-298fbb94e773",
        "name": "Nguyen Van A",
        "email": "user@example.com"
      }
    }
  ]
  ```

#### `GET /boards/:id`
- **Mô tả**: Xem chi tiết bảng Kanban theo ID bao gồm thông tin chủ sở hữu, danh sách thành viên, các cột (sắp xếp theo `order asc`) và danh sách task bên trong mỗi cột.
- **Controller**: `BoardController.findOne` (`src/board/board.controller.ts`)
- **Kiểm tra quyền**: Bắt buộc user phải là chủ sở hữu hoặc nằm trong danh sách thành viên của bảng.
- **Response**: `200 OK`
  ```json
  {
    "id": "b3e34b92-8077-4df3-8cfb-665b6a71391d",
    "name": "Dự án BambooSync 2026",
    "owner": { "id": "...", "name": "..." },
    "columns": [
      {
        "id": "col-1",
        "name": "To Do",
        "order": 0,
        "tasks": [
          {
            "id": "task-1",
            "title": "Viết tài liệu API",
            "order": 0,
            "priority": "HIGH",
            "dueDate": "2026-09-10T00:00:00.000Z"
          }
        ]
      }
    ],
    "members": [
      {
        "id": "mem-1",
        "userId": "f5e9d9e4-...",
        "memberRole": "OWNER",
        "joinedAt": "2026-09-04T02:00:00.000Z"
      }
    ]
  }
  ```
- **Lỗi có thể gặp**:
  - `404 Not Found`: `"Board not exist"`
  - `403 Forbidden`: `"You do not have permission to view this board"`

#### `PATCH /boards/:id`
- **Mô tả**: Cập nhật thông tin bảng. Chỉ thành viên có vai trò `OWNER` hoặc `EDITOR` mới có quyền chỉnh sửa (`VIEWER` bị chặn).
- **Controller**: `BoardController.update` (`src/board/board.controller.ts`)
- **Request Body** (Một hoặc nhiều trường):
  ```json
  {
    "name": "Tên bảng mới",
    "description": "Mô tả mới",
    "isPublic": false
  }
  ```
- **Response**: `200 OK` (Đối tượng Board sau khi cập nhật).
- **Lỗi có thể gặp**:
  - `403 Forbidden`: `"You do not have permission to edit this board"`

#### `DELETE /boards/:id`
- **Mô tả**: Xóa bảng vĩnh viễn. **Chỉ duy nhất Owner (`board.ownerId === userId`) mới có quyền xóa**. Toàn bộ Cột, Task, Activity Log phụ thuộc sẽ tự động bị xóa theo Cascade.
- **Controller**: `BoardController.remove` (`src/board/board.controller.ts`)
- **Response**: `200 OK`
- **Lỗi có thể gặp**:
  - `404 Not Found`: `"Board not exist"`
  - `403 Forbidden`: `"Only the owner can delete the board"`

#### `POST /boards/join/:inviteCode`
- **Mô tả**: Tham gia vào bảng qua mã liên kết mời (`inviteCode`). Bảng phải được bật cờ `isPublic = true`. Người tham gia được gán vai trò `EDITOR`. Nếu đã là thành viên thì trả về bảng mà không tạo trùng lặp.
- **Controller**: `BoardController.join` (`src/board/board.controller.ts`)
- **Path Params**: `inviteCode` (mã CUID duy nhất của bảng).
- **Response**: `201 Created` / `200 OK`
- **Lỗi có thể gặp**:
  - `404 Not Found`: `"Invite link is invalid"`
  - `403 Forbidden`: `"This board does not allow joining via link"`

---

### 2.4. Module Cột (Column)

Tất cả các route trong `ColumnController` đều yêu cầu xác thực qua `JwtAuthGuard`.

#### `POST /boards/:boardId/columns`
- **Mô tả**: Tạo cột mới trong một bảng. Thứ tự cột (`order`) được tự động gán bằng tổng số cột hiện có trong bảng.
- **Controller**: `ColumnController.create` (`src/collumn/column.controller.ts`)
- **Request Body**:
  ```json
  {
    "name": "Đang kiểm thử (Testing)"
  }
  ```
  - `name`: string, bắt buộc, tối đa 50 ký tự (`@MaxLength(50)`).
- **Response**: `201 Created`
  ```json
  {
    "id": "col-abc-123",
    "name": "Đang kiểm thử (Testing)",
    "order": 3,
    "boardId": "b3e34b92-8077-4df3-8cfb-665b6a71391d",
    "createdAt": "2026-09-04T02:30:00.000Z",
    "updatedAt": "2026-09-04T02:30:00.000Z"
  }
  ```

#### `PATCH /boards/:boardId/columns/reorder`
- **Mô tả**: Sắp xếp lại thứ tự của các cột trong bảng. Toàn bộ thao tác cập nhật được thực thi bên trong một transaction (`prisma.$transaction`) để bảo đảm tính nguyên tử (atomic).
- **Controller**: `ColumnController.reorder` (`src/collumn/column.controller.ts`)
- **Request Body**:
  ```json
  {
    "columns": [
      { "id": "col-1", "order": 1 },
      { "id": "col-2", "order": 0 },
      { "id": "col-3", "order": 2 }
    ]
  }
  ```
- **Response**: `200 OK` (Mảng các bản ghi Column đã cập nhật).

#### `DELETE /columns/:id`
- **Mô tả**: Xóa một cột khỏi bảng. Các task nằm trong cột này sẽ tự động bị xóa theo cơ chế Cascade delete của database.
- **Controller**: `ColumnController.remove` (`src/collumn/column.controller.ts`)
- **Response**: `200 OK`
- **Lỗi có thể gặp**:
  - `404 Not Found`: `"Column không tồn tại"`

---

### 2.5. Module Công Việc (Task)

Tất cả các route trong `TaskController` đều yêu cầu xác thực qua `JwtAuthGuard`.

#### `POST /columns/:columnId/tasks`
- **Mô tả**: Tạo một task mới trong cột chỉ định. Vị trí (`order`) được gán tự động bằng tổng số task hiện có trong cột. Trường `updatedById` tự động nhận ID của user đăng nhập.
- **Controller**: `TaskController.create` (`src/task/task.controller.ts`)
- **Request Body**:
  ```json
  {
    "title": "Thiết kế giao diện Kanban",
    "description": "Sử dụng TailwindCSS hoặc CSS thuần",
    "priority": "HIGH",
    "dueDate": "2026-09-15T17:00:00.000Z"
  }
  ```
  - `title`: string, bắt buộc, không được để trống (`@IsNotEmpty()`).
  - `description`: string, không bắt buộc.
  - `priority`: enum `Priority` (`LOW`, `MEDIUM`, `HIGH`), không bắt buộc (mặc định: `MEDIUM`).
  - `dueDate`: string ISO 8601 (`@IsDateString()`), không bắt buộc.
- **Response**: `201 Created`
  ```json
  {
    "id": "task-uuid-001",
    "title": "Thiết kế giao diện Kanban",
    "description": "Sử dụng TailwindCSS hoặc CSS thuần",
    "order": 0,
    "priority": "HIGH",
    "dueDate": "2026-09-15T17:00:00.000Z",
    "columnId": "col-1",
    "updatedById": "f5e9d9e4-4a2e-4b20-80a5-298fbb94e773",
    "createdAt": "2026-09-04T02:40:00.000Z",
    "updatedAt": "2026-09-04T02:40:00.000Z"
  }
  ```

#### `GET /tasks/:id`
- **Mô tả**: Lấy thông tin chi tiết một task theo ID.
- **Controller**: `TaskController.findOne` (`src/task/task.controller.ts`)
- **Response**: `200 OK`
- **Lỗi có thể gặp**:
  - `404 Not Found`: `"Task không tồn tại"`

#### `PATCH /tasks/:id`
- **Mô tả**: Cập nhật thông tin task (tiêu đề, mô tả, độ ưu tiên, ngày hết hạn). Tự động cập nhật `updatedById`.
- **Controller**: `TaskController.update` (`src/task/task.controller.ts`)
- **Request Body**:
  ```json
  {
    "title": "Tiêu đề task cập nhật",
    "priority": "LOW"
  }
  ```
- **Response**: `200 OK`
- **Lỗi có thể gặp**:
  - `404 Not Found`: `"Task không tồn tại"`

#### `PATCH /tasks/:id/move`
- **Mô tả**: Di chuyển task sang một cột khác (`toColumnId`) và cập nhật vị trí thứ tự mới (`newOrder`).
- **Controller**: `TaskController.move` (`src/task/task.controller.ts`)
- **Request Body**:
  ```json
  {
    "toColumnId": "col-2",
    "newOrder": 1
  }
  ```
  - `toColumnId`: string, ID cột đích.
  - `newOrder`: integer, vị trí mới trong cột đích.
- **Response**: `200 OK`
- **Lỗi có thể gặp**:
  - `404 Not Found`: `"Task không tồn tại"`

#### `DELETE /tasks/:id`
- **Mô tả**: Xóa task khỏi cột.
- **Controller**: `TaskController.remove` (`src/task/task.controller.ts`)
- **Response**: `200 OK`
- **Lỗi có thể gặp**:
  - `404 Not Found`: `"Task không tồn tại"`

---

## 3. Giao thức WebSocket (Socket.IO Events)

Gateway WebSocket được định nghĩa tại `BoardGateway` (`src/realtime/gateways/board.gateway.ts`), hỗ trợ CORS toàn bộ (`cors: { origin: '*' }`).

### 3.1. Xác thực Kết nối (Handshake Authentication)
Khi client khởi tạo kết nối WebSocket, cần truyền JWT Access Token thông qua một trong hai cách:
1. Đối tượng `auth.token`:
   ```javascript
   const socket = io('http://localhost:3000', {
     auth: { token: 'eyJhbGciOiJIUzI1Ni...' }
   });
   ```
2. Header `authorization`:
   ```javascript
   const socket = io('http://localhost:3000', {
     extraHeaders: { Authorization: 'Bearer eyJhbGciOiJIUzI1Ni...' }
   });
   ```
*Nếu token không hợp lệ hoặc thiếu, server sẽ tự động ngắt kết nối (`client.disconnect()`)*.

### 3.2. Sự kiện Client gửi lên Server (Client-to-Server)

| Event Name | Payload | Mô tả |
|------------|---------|-------|
| `room:join` | `{ "boardId": "string" }` | Tham gia vào phòng của một Board. Server thêm client vào Socket.IO Room và cập nhật danh sách trực tuyến (`presence`). |
| `room:leave` | `{ "boardId": "string" }` | Rời khỏi phòng của Board. Server xóa client khỏi danh sách trực tuyến và phát lại trạng thái cho phòng. |
| `cursor:move` | `{ "boardId": "string", "x": 120, "y": 350 }` | Phát tọa độ con trỏ chuột thời gian thực tới tất cả các client khác trong Board (ngoại trừ người gửi). |
| `typing:start` | `{ "boardId": "string", "taskId": "string" }` | Báo hiệu người dùng đang bắt đầu nhập liệu trên một Task cụ thể. |
| `typing:stop` | `{ "boardId": "string", "taskId": "string" }` | Báo hiệu người dùng đã ngừng nhập liệu trên Task đó. |

### 3.3. Sự kiện Server phát xuống Client (Server-to-Client)

| Event Name | Broadcast Scope | Payload Mẫu | Ý nghĩa |
|------------|-----------------|-------------|---------|
| `presence:update` | Toàn phòng (`to(boardId)`) | `[ { "userId": "...", "email": "...", "socketId": "..." } ]` | Danh sách các thành viên đang hoạt động trực tuyến trên Board. |
| `cursor:update` | Các client khác trong phòng (`to(boardId).except(sender)`) | `{ "userId": "...", "x": 120, "y": 350 }` | Cập nhật vị trí con trỏ chuột của người dùng khác. |
| `typing:update` | Các client khác trong phòng | `{ "taskId": "...", "userId": "...", "isTyping": true }` | Trạng thái gõ phím của thành viên trên một task. |
| `task:created` | Toàn phòng (`to(boardId)`) | `Task Object` | Thông báo task mới được tạo (qua Event Listener). |
| `task:updated` | Toàn phòng (`to(boardId)`) | `Task Object` | Thông báo task được cập nhật (qua Event Listener). |
| `task:moved` | Toàn phòng (`to(boardId)`) | `Task Object` | Thông báo task được chuyển cột hoặc đổi thứ tự. |
| `task:deleted` | Toàn phòng (`to(boardId)`) | `{ "taskId": "task-uuid" }` | Thông báo task đã bị xóa. |

---

## 4. Bảng Mã Lỗi Phổ Biến (Error Codes & Responses)

Toàn bộ phản hồi lỗi của hệ thống tuân theo chuẩn định dạng của NestJS Exception Filter:

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 6 characters"
  ],
  "error": "Bad Request"
}
```

| HTTP Status | Error Name | Tình huống xảy ra trong BambooSync |
|-------------|------------|-----------------------------------|
| `400` | `Bad Request` | Dữ liệu gửi lên không vượt qua kiểm tra của `class-validator` (thiếu trường, sai format ngày tháng, chuỗi quá dài,...). |
| `401` | `Unauthorized` | - Không cung cấp Bearer Token hoặc Token đã hết hạn.<br/>- Đăng nhập sai email hoặc mật khẩu. |
| `403` | `Forbidden` | - Người dùng không phải thành viên của bảng khi truy cập `GET /boards/:id`.<br/>- Người dùng có vai trò `VIEWER` cố tình gọi API chỉnh sửa bảng.<br/>- Người dùng không phải `OWNER` nhưng cố tình gọi `DELETE /boards/:id`.<br/>- Truy cập link mời của bảng không công khai (`isPublic = false`). |
| `404` | `Not Found` | Bảng (`Board`), Cột (`Column`), hoặc Công việc (`Task`) không tồn tại theo ID truy vấn. |
| `409` | `Conflict` | Đăng ký tài khoản với email đã tồn tại trong cơ sở dữ liệu. |
| `500` | `Internal Server Error` | Lỗi crash không mong muốn ở tầng ứng dụng hoặc mất kết nối tới PostgreSQL. |
