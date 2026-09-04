# Hướng Dẫn Đóng Góp (Contributing Guide)

Chào mừng bạn tham gia đóng góp cho dự án **BambooSync Server**! Để duy trì chất lượng mã nguồn cao, tính nhất quán và quy trình làm việc mượt mà, vui lòng đọc kỹ và tuân thủ các quy chuẩn dưới đây.

---

## 1. Chuẩn Mực Code Style & Định Dạng (Lint & Format)

Dự án sử dụng **ESLint 9 (Flat Config)** và **Prettier** để tự động chuẩn hóa phong cách viết code TypeScript.

### 1.1. Công cụ Cấu hình trong Codebase
- **Prettier** (`.prettierrc`):
  ```json
  {
    "singleQuote": true,
    "trailingComma": "all"
  }
  ```
- **ESLint** (`eslint.config.mjs`):
  - Kế thừa các bộ quy tắc: `@eslint/js`, `typescript-eslint.configs.recommendedTypeChecked`, và `eslint-plugin-prettier/recommended`.
  - Tự động kiểm tra types nghiêm ngặt (`projectService: true`).
  - Xử lý ký tự xuống dòng chéo nền tảng (Windows/Linux) bằng `"prettier/prettier": ["error", { "endOfLine": "auto" }]`.
  - Cảnh báo các Promise chưa xử lý: `'@typescript-eslint/no-floating-promises': 'warn'`.

### 1.2. Các Lệnh Định Dạng và Kiểm Tra
Trước khi commit hoặc mở Pull Request, bạn bắt buộc phải chạy các lệnh sau:

```bash
# 1. Tự động sửa lỗi format code bằng Prettier
pnpm run format

# 2. Kiểm tra và tự động sửa các vi phạm ESLint
pnpm run lint

# 3. Kiểm tra tính hợp lệ của TypeScript compiler
pnpm run build
```

---

## 2. Quy Trình Làm Việc với Git (Git Workflow)

### 2.1. Chiến Lược Nhánh (Branching Model)
- **`main`**: Nhánh ổn định cao nhất, phản ánh mã nguồn đang chạy trên Production. Không bao giờ commit trực tiếp lên `main`.
- **`dev`**: Nhánh tích hợp chính (Active Development). Toàn bộ tính năng mới đều được rẽ nhánh từ `dev` và merge ngược lại vào `dev`.
- **Nhánh tính năng / sửa lỗi**: Được tạo ra từ nhánh `dev` theo quy ước đặt tên:
  - `feat/<ten-tinh-nang>`: Phát triển tính năng mới (ví dụ: `feat/task-attachments`, `feat/board-export`).
  - `fix/<ten-loi>`: Sửa lỗi phát sinh (ví dụ: `fix/token-expiration`, `fix/column-reorder-crash`).
  - `refactor/<ten-module>`: Tái cấu trúc mã nguồn mà không đổi hành vi (ví dụ: `refactor/realtime-gateway`).
  - `docs/<chu-de>`: Cập nhật tài liệu kỹ thuật (ví dụ: `docs/api-update`).
  - `test/<pham-vi>`: Bổ sung hoặc sửa đổi unit/e2e test (ví dụ: `test/board-service`).

### 2.2. Quy Ước Viết Commit (Commit Conventions)
Dự án áp dụng chặt chẽ chuẩn **Conventional Commits**. Mỗi commit message cần rõ ràng, súc tích và tuân theo mẫu:

```
<type>(<scope>): <mô tả ngắn bằng tiếng Anh hoặc tiếng Việt>
```

- **Các Type chuẩn**:
  - `feat`: Thêm tính năng mới (ví dụ: `feat: add realtime module`).
  - `fix`: Sửa lỗi (ví dụ: `fix: handle null userId on guest member`).
  - `refactor`: Tái cấu trúc code (ví dụ: `refactor(realtime): use REST APIs for task mutations and websocket for updates`).
  - `docs`: Cập nhật tài liệu (ví dụ: `docs: update README and env.example`).
  - `style`: Thay đổi format, khoảng trắng (không đổi logic code).
  - `test`: Thêm hoặc sửa test cases.
  - `chore`: Cập nhật build script, cấu hình package, dependencies.

---

## 3. Quy Trình Tạo Pull Request (PR Workflow)

1. **Cập nhật nhánh làm việc**: Đồng bộ mã nguồn mới nhất từ nhánh `dev`:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout feat/your-feature-name
   git rebase dev
   ```
2. **Kiểm tra cục bộ toàn diện**:
   - `pnpm run lint` -> Không còn lỗi lint.
   - `pnpm run format` -> Code đã được format đồng nhất.
   - `pnpm run build` -> TypeScript compile thành công không có lỗi type.
   - `pnpm run test` -> Các bộ kiểm thử chạy thành công.
3. **Mở Pull Request**:
   - Base branch: `dev` <- Head branch: `feat/your-feature-name`.
   - Tiêu đề PR tuân theo Conventional Commit.
   - Mô tả rõ ràng: Thay đổi cái gì? Vì sao lại thay đổi? Làm thế nào để kiểm thử?

---

## 4. Checklist Dành Cho Người Review (Code Review Checklist)

Khi review một Pull Request, người đánh giá (Reviewer) cần đối chiếu các tiêu chí sau:

- [ ] **Validation & Security**:
  - Mọi dữ liệu người dùng gửi lên đều có DTO đi kèm với các decorator của `class-validator` (`@IsNotEmpty()`, `@IsString()`, `@IsEnum()`,...).
  - Các route nhạy cảm đều được bảo vệ bởi `JwtAuthGuard` hoặc kiểm tra quyền sở hữu (`checkOwnerOrEditor`).
- [ ] **Database & Performance**:
  - Không có truy vấn N+1 không cần thiết (ưu tiên dùng `include` của Prisma).
  - Các thao tác cập nhật đồng loạt (như sắp xếp lại thứ tự) phải được bọc trong `prisma.$transaction`.
  - Các ràng buộc khóa ngoại có đầy đủ hành vi `onDelete` (Cascade/SetNull/Restrict).
- [ ] **Exception Handling**:
  - Sử dụng đúng các Exception chuẩn của NestJS (`NotFoundException`, `ForbiddenException`, `ConflictException`, `UnauthorizedException`) thay vì ném lỗi thuần `throw new Error()`.
- [ ] **Type Safety**:
  - Không sử dụng kiểu `any` tùy tiện (tránh lạm dụng `@typescript-eslint/no-explicit-any: 'off'`).
- [ ] **Độ Sạch Của Mã Nguồn**:
  - Không để lại mã nguồn comment thừa (`console.log`, code nháp không sử dụng).
