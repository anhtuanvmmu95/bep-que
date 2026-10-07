import test, { describe, it } from "node:test";
import assert from "node:assert/strict";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

describe("Session/Token Storage & CSRF Protection Tests", () => {
  // =========================================================================
  // 1. Kiểm tra Cờ Cookie: HttpOnly, Secure, SameSite, Path
  // =========================================================================
  describe("1. Kiểm tra Cờ Cookie & Cơ chế lưu trữ Session/Token an toàn", () => {
    it("[CSRF Cookie] GET /api/csrf phải thiết lập HttpOnly và SameSite=lax", async () => {
      const res = await fetch(`${BASE_URL}/api/csrf`);
      assert.equal(res.status, 200);

      const setCookie = res.headers.get("set-cookie");
      assert.ok(setCookie, "Phải có header Set-Cookie");
      assert.match(
        setCookie,
        /bepque_csrf=/i,
        "Cookie phải mang tên 'bepque_csrf'"
      );
      assert.match(
        setCookie,
        /HttpOnly/i,
        "Cookie CSRF phải có cờ HttpOnly để chống XSS đánh cắp"
      );
      assert.match(
        setCookie,
        /SameSite=lax/i,
        "Cookie CSRF phải có cờ SameSite=lax (hoặc Strict)"
      );
      assert.match(setCookie, /Path=\//i, "Cookie phải có Path=/");

      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.csrfToken, "Phải trả về csrfToken độ dài cao");
      assert.equal(
        body.csrfToken.length,
        64,
        "CSRF Token phải có entropy cao (256-bit = 64 ký tự hex)"
      );
    });

    it("[Session Cookie] POST /api/orders phải đính kèm bepque_session với đầy đủ cờ HttpOnly, SameSite=lax", async () => {
      const validOrderPayload = {
        fullName: "Nguyễn An Bảo",
        phoneNumber: "0901234567",
        email: "anbao@bepque.vn",
        addressLine: "123 Đường Bờ Sông, Phường Thảo Điền",
        districtId: "hn-cau-giay",
        deliveryTimingType: "asap",
        paymentMethod: "cod",
        items: [{ productId: "rural-food-01", quantity: 2 }],
      };

      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify(validOrderPayload),
      });

      assert.equal(res.status, 201, "Tạo đơn hàng phải thành công");
      const setCookie = res.headers.get("set-cookie");
      assert.ok(setCookie, "Phải trả về Set-Cookie cho phiên khách hàng");
      assert.match(
        setCookie,
        /bepque_session=/i,
        "Tên cookie phiên phải là 'bepque_session'"
      );
      assert.match(
        setCookie,
        /HttpOnly/i,
        "Cookie session phải bật cờ HttpOnly"
      );
      assert.match(
        setCookie,
        /SameSite=lax/i,
        "Cookie session phải có cờ SameSite=lax"
      );
      assert.match(setCookie, /Path=\//i, "Cookie session phải có Path=/");
      assert.match(
        setCookie,
        /Max-Age=\d+/i,
        "Cookie session phải có thời hạn Max-Age xác định"
      );
    });

    it("[Session Cookie Identification] Nhận diện khách hàng tự động qua bepque_session cookie mà không cần token trên URL", async () => {
      // 1. Tạo đơn hàng và lấy Set-Cookie
      const resOrder = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          fullName: "Trần Thị Thu",
          phoneNumber: "0912345678",
          email: "thutran@bepque.vn",
          addressLine: "45 Lê Lợi",
          districtId: "hn-cau-giay",
          deliveryTimingType: "asap",
          paymentMethod: "cod",
          items: [{ productId: "rural-food-01", quantity: 1 }],
        }),
      });

      assert.equal(resOrder.status, 201);
      const setCookie = resOrder.headers.get("set-cookie");
      assert.ok(setCookie);

      // Trích xuất cookie string để gửi lại ở request sau
      const sessionCookieValue = setCookie.split(";")[0]; // "bepque_session=..."

      // 2. Tra cứu đơn hàng chỉ bằng Cookie, không gửi token trong URL
      const resTrack = await fetch(`${BASE_URL}/api/orders`, {
        method: "GET",
        headers: {
          Cookie: sessionCookieValue,
        },
      });

      assert.equal(resTrack.status, 200, "Phải nhận diện được đơn hàng qua Cookie hợp lệ");
      const trackBody = await resTrack.json();
      assert.equal(trackBody.success, true);
      assert.ok(trackBody.order, "Phải trả về thông tin đơn hàng");
      assert.ok(trackBody.order.recipientName, "Phải có recipientName");
      // Đảm bảo dữ liệu nhạy cảm vẫn được che giấu theo Least Privilege
      assert.ok(trackBody.order.phone.includes("*"), "Số điện thoại phải được che giấu");
      assert.ok(trackBody.order.address.includes("***"), "Địa chỉ chi tiết phải được che giấu");
    });

    it("[Tamper Resistance] Cookie bị sửa đổi chữ ký HMAC phải bị backend từ chối", async () => {
      // 1. Tạo một đơn hàng thực tế
      const resOrder = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          fullName: "Đỗ Bảo Long",
          phoneNumber: "0934567890",
          email: "baolong@bepque.vn",
          addressLine: "10 Phố Nguyễn Khang",
          districtId: "hn-cau-giay",
          deliveryTimingType: "asap",
          paymentMethod: "cod",
          items: [{ productId: "rural-food-01", quantity: 1 }],
        }),
      });
      assert.equal(resOrder.status, 201);
      const { order } = await resOrder.json();

      // Giả mạo cookie bằng cách thay đổi giá trị hoặc signature không hợp lệ
      const tamperedCookie = `bepque_session={"orderCode":"${order.orderCode}","trackingToken":"tampered-token"}.invalid_hmac_signature`;

      // Tra cứu đơn hàng bằng tampered cookie
      const resTrack = await fetch(`${BASE_URL}/api/orders?code=${order.orderCode}`, {
        method: "GET",
        headers: {
          Cookie: tamperedCookie,
        },
      });

      // Vì chữ ký HMAC không hợp lệ, cookie bị loại bỏ -> không có token hợp lệ -> 403 Forbidden
      assert.equal(
        resTrack.status,
        403,
        "Cookie giả mạo chữ ký HMAC phải bị từ chối truy cập (403)"
      );
    });
  });

  // =========================================================================
  // 2. Kiểm thử Phòng chống CSRF: Origin & Referer Validation
  // =========================================================================
  describe("2. Phòng chống CSRF trên các request thay đổi trạng thái (POST/PUT/DELETE)", () => {
    it("[CSRF Block - Evil Origin] POST /api/orders với Origin độc hại phải bị chặn 403", async () => {
      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://evil-attacker.com",
        },
        body: JSON.stringify({
          fullName: "Hacker CSRF",
          phoneNumber: "0999999999",
          districtId: "hn-cau-giay",
          items: [{ productId: "rural-food-01", quantity: 1 }],
        }),
      });

      assert.equal(
        res.status,
        403,
        "Request POST từ Origin lạ phải bị từ chối với mã HTTP 403"
      );
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(
        data.error,
        /Tấn công CSRF bị chặn: Origin không được tin cậy/i,
        "Phải có thông báo lỗi phát hiện CSRF Origin"
      );
    });

    it("[CSRF Block - Evil Referer] POST /api/newsletter với Referer độc hại phải bị chặn 403", async () => {
      const res = await fetch(`${BASE_URL}/api/newsletter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Referer: "https://malicious-phishing-site.org/csrf-exploit.html",
        },
        body: JSON.stringify({
          email: "victim@example.com",
        }),
      });

      assert.equal(
        res.status,
        403,
        "Request POST từ Referer lạ phải bị từ chối với mã HTTP 403"
      );
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(
        data.error,
        /Tấn công CSRF bị chặn: Referer không được tin cậy/i,
        "Phải có thông báo lỗi phát hiện CSRF Referer"
      );
    });

    it("[CSRF Block - Untrusted PUT/DELETE] PUT /api/orders với Origin lạ phải bị chặn 403", async () => {
      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://phishing.example.com",
        },
        body: JSON.stringify({ status: "PAID" }),
      });

      assert.equal(
        res.status,
        403,
        "Request PUT từ Origin không tin cậy phải bị từ chối 403"
      );
    });

    it("[CSRF Allow - Legitimate Origin] POST /api/orders với Origin tin cậy phải được cho phép", async () => {
      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          fullName: "Khách Hàng Chuẩn",
          phoneNumber: "0908888888",
          email: "khachhang@bepque.vn",
          addressLine: "12 Đồng Khởi",
          districtId: "hn-cau-giay",
          deliveryTimingType: "asap",
          paymentMethod: "cod",
          items: [{ productId: "rural-food-01", quantity: 1 }],
        }),
      });

      // Cho phép vượt qua lớp lọc CSRF và tạo đơn thành công (201)
      assert.equal(
        res.status,
        201,
        "Request với Origin tin cậy phải xử lý thành công (201)"
      );
      const data = await res.json();
      assert.equal(data.success, true);
    });

    it("[CSRF Allow - Legitimate Production Origin] POST /api/orders với Origin bepque.vn phải được cho phép", async () => {
      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://bepque.vn",
        },
        body: JSON.stringify({
          fullName: "Khách Hàng Hà Nội",
          phoneNumber: "0907777777",
          email: "hanoi@bepque.vn",
          addressLine: "88 Phố Huế",
          districtId: "hn-cau-giay",
          deliveryTimingType: "asap",
          paymentMethod: "cod",
          items: [{ productId: "rural-food-01", quantity: 1 }],
        }),
      });

      assert.equal(
        res.status,
        201,
        "Origin https://bepque.vn nằm trong Allowlist phải được xử lý (201)"
      );
    });
  });
});
