# Hướng Dẫn Cấu Hình Bảo Mật Môi Trường Vercel Dashboard Cho Dự Án Bếp Quê

Tài liệu này hướng dẫn quản trị viên thiết lập bảo mật tối ưu trên **Vercel Dashboard** nhằm bảo vệ mã nguồn, thông tin môi trường và bản build của hệ thống **Bếp Quê**.

---

## 1. Bật Deployment Protection & Vercel Authentication

Mục đích: Ngăn chặn kẻ tấn công, bot tự động hoặc công cụ tìm kiếm (Google Crawler) truy cập vào các môi trường xem trước (Preview Deployments / Staging / Pull Requests), tránh rò rỉ dữ liệu thử nghiệm nội bộ.

### Các bước thực hiện:
1. Đăng nhập vào [Vercel Dashboard](https://vercel.com).
2. Chọn dự án **web-ban-do-an** (hoặc `bep-que`).
3. Truy cập **Settings** -> **Deployment Protection**.
4. Kích hoạt một trong hai tùy chọn:
   * **Vercel Authentication (Khuyến nghị cho đội ngũ nội bộ):** Chỉ thành viên trong Vercel Team đã đăng nhập mới được truy cập các URL Preview.
   * **Password Protection (Bảo vệ bằng mật khẩu):** Đặt mật khẩu chung nếu cần chia sẻ bản preview cho đối tác bên ngoài nghiệm thu tính năng.
5. Đảm bảo cấu hình:
   * **Protect Production:** `Disabled` (để khách hàng truy cập website bình thường).
   * **Protect Preview Deployments:** `Enabled` (bảo vệ tất cả các URL nhánh và Pull Request).

---

## 2. Vô Hiệu Hóa Công Khai Build Logs (Private Deployment Logs)

Mục đích: Build logs có thể chứa đường dẫn file hệ thống, thông tin package phiên bản cụ thể hoặc cảnh báo nhạy cảm. Không bao giờ cho phép người lạ truy cập build logs.

### Các bước thực hiện:
1. Trong mục **Settings**, chọn thẻ **Security & Privacy**.
2. Tìm mục **Public Deployment Logs**.
3. Chuyển trạng thái sang **Disabled / Private** (hoặc đảm bảo chỉ thành viên có quyền trong workspace mới được xem logs).

---

## 3. Bật Source Protection (Ngăn Chặn Truy Cập Mã Nguồn)

Mục đích: Ngăn chặn bất kỳ ai bên ngoài xem cấu trúc git commits, diffs hoặc duyệt cây thư mục source code từ giao diện Vercel.

### Các bước thực hiện:
1. Trong mục **Settings** -> **Security & Privacy**.
2. Tìm mục **Source Protection**.
3. Kích hoạt tính năng **Prevent public access to Source Files**.
4. Bật **Directory Listing Prevention**: Đảm bảo không cho phép duyệt thư mục tự do.

---

## 4. Quản Lý Biến Môi Trường (Environment Variables) An Toàn

1. Truy cập **Settings** -> **Environment Variables**.
2. Kiểm tra danh sách biến:
   * **Production Only:** Gán các secret thực tế (`DATABASE_URL`, `PAYMENT_WEBHOOK_SECRET`, `ADMIN_API_KEY`, `SESSION_SECRET`, `TURNSTILE_SECRET_KEY`) chỉ cho môi trường **Production**.
   * **Preview / Development:** Dùng database test và credentials giả lập riêng biệt.
3. Tuyệt đối **KHÔNG** đặt tiền tố `NEXT_PUBLIC_` cho bất kỳ private key hoặc secret nào.
4. Đảm bảo cờ **Automatically expose System Environment Variables** được kiểm soát chặt chẽ.

---

## 5. Tổng Kết Checklist Bảo Mật Vercel

| Mục thiết lập | Trạng thái khuyến nghị | Ý nghĩa bảo mật |
| :--- | :--- | :--- |
| **Preview Protection** | **Bật (Enabled)** | Chặn truy cập trái phép vào bản build thử nghiệm |
| **Public Build Logs** | **Tắt (Disabled)** | Giữ kín log build, tránh lộ dấu vết hệ thống |
| **Source Protection** | **Bật (Enabled)** | Không cho phép duyệt source code công khai |
| **Production Source Maps** | **Tắt (Disabled)** | Đã cấu hình `productionBrowserSourceMaps: false` trong `next.config.ts` |
| **Security Headers** | **Đã kích hoạt** | Đã cấu hình HSTS, CSP, X-Frame-Options DENY trong `next.config.ts` & `vercel.json` |
