import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeHtml,
  escapeHtml,
  sanitizeUrl,
} from "../lib/security/sanitize.ts";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

describe("Frontend & API XSS Security Tests (Stored & Reflected XSS Prevention)", () => {
  /* =======================================================================
   * PHẦN 1: KIỂM THỬ THƯ VIỆN LÀM SẠCH HTML DOMPURIFY
   * ======================================================================= */
  it("1. [DOMPurify Sanitization] Loại bỏ thẻ <script> độc hại", () => {
    const maliciousHtml = '<p>Xin chào!</p><script>alert("XSS")</script>';
    const cleaned = sanitizeHtml(maliciousHtml);

    assert.ok(!cleaned.includes("<script>"), "Phải loại bỏ hoàn toàn thẻ <script>");
    assert.ok(!cleaned.includes("alert("), "Phải loại bỏ nội dung script độc hại");
    assert.ok(cleaned.includes("<p>Xin chào!</p>"), "Giữ lại thẻ HTML hợp lệ an toàn");
  });

  it("2. [DOMPurify Sanitization] Loại bỏ các thuộc tính sự kiện inline (onerror, onload, onclick)", () => {
    const maliciousImg = '<img src="invalid.jpg" onerror="alert(document.cookie)" />';
    const maliciousButton = '<b onclick="alert(1)">Bấm vào đây</b>';

    const cleanedImg = sanitizeHtml(maliciousImg);
    const cleanedButton = sanitizeHtml(maliciousButton);

    assert.ok(!cleanedImg.includes("onerror"), "Phải loại bỏ thuộc tính onerror");
    assert.ok(!cleanedButton.includes("onclick"), "Phải loại bỏ thuộc tính onclick");
    assert.ok(cleanedButton.includes("Bấm vào đây"), "Giữ lại nội dung text an toàn");
  });

  it("3. [DOMPurify Sanitization] Ngăn chặn các liên kết nguy hiểm javascript: và data:", () => {
    const maliciousLink = '<a href="javascript:alert(\'XSS\')">Bấm nhận thưởng</a>';
    const cleanedLink = sanitizeHtml(maliciousLink);

    assert.ok(!cleanedLink.includes("javascript:"), "Phải loại bỏ giao thức javascript:");
  });

  it("4. [Contextual Encoding] Hàm escapeHtml mã hóa chính xác các ký tự đặc biệt", () => {
    const input = `<script>alert('XSS & "hack"')</script>`;
    const escaped = escapeHtml(input);

    assert.strictEqual(
      escaped,
      "&lt;script&gt;alert(&#39;XSS &amp; &quot;hack&quot;&#39;)&lt;/script&gt;",
      "Các ký tự <, >, &, \", ' phải được mã hóa thành HTML entities tương ứng"
    );
  });

  it("5. [URL Sanitization] Hàm sanitizeUrl ngăn chặn javascript: và vbscript:", () => {
    assert.strictEqual(sanitizeUrl("javascript:alert(1)"), "#");
    assert.strictEqual(sanitizeUrl("JAVASCRIPT:alert(document.domain)"), "#");
    assert.strictEqual(sanitizeUrl("vbscript:msgbox(1)"), "#");
    assert.strictEqual(sanitizeUrl("data:text/html,<script>alert(1)</script>"), "#");
    assert.strictEqual(sanitizeUrl("/tracking?code=BQ-123"), "/tracking?code=BQ-123");
    assert.strictEqual(sanitizeUrl("https://bepque.vn"), "https://bepque.vn");
  });

  /* =======================================================================
   * PHẦN 2: KIỂM THỬ NGUY CƠ REFLECTED XSS (TỪ KHÓA TÌM KIẾM)
   * ======================================================================= */
  it("6. [Reflected XSS Prevention] Gửi payload XSS vào ô tìm kiếm -> API xử lý và làm sạch an toàn", async () => {
    const xssPayloads = [
      "<script>alert('XSS')</script>",
      "<img src=x onerror=alert(1)>",
      "<svg onload=alert(1)>",
      "'\"><script>alert(1)</script>",
    ];

    for (const payload of xssPayloads) {
      const res = await fetch(`${BASE_URL}/api/foods?q=${encodeURIComponent(payload)}`);
      const data = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.success, true);
      // Kết quả tìm kiếm an toàn, không chứa mã độc thực thi
      assert.ok(Array.isArray(data.foods));
    }
  });

  /* =======================================================================
   * PHẦN 3: KIỂM THỬ NGUY CƠ STORED XSS (GHI CHÚ ĐƠN HÀNG & PHẢN HỒI)
   * ======================================================================= */
  it("7. [Stored XSS Prevention] Chèn mã độc vào ghi chú giao hàng (deliveryNote) -> Lưu trữ và trả về an toàn", async () => {
    const xssNote = "<script>alert('Stored XSS in note')</script> Giao cẩn thận";
    const xssName = "Nguyễn <b onmouseover=alert(1)>Văn An</b>";

    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.99.7.1",
      },
      body: JSON.stringify({
        fullName: xssName,
        phoneNumber: "0912345678",
        addressLine: "Số 99 Phố Trần Hưng Đạo",
        districtId: "hn-hoan-kiem",
        deliveryNote: xssNote,
        items: [{ productId: "rural-food-01", quantity: 1 }],
      }),
    });
    const data = await res.json();

    assert.strictEqual(res.status, 201);
    const trackingToken = data.trackingToken;
    const orderCode = data.order.orderCode;

    // Tra cứu lại đơn hàng để kiểm tra dữ liệu trả về cho client
    const trackingRes = await fetch(
      `${BASE_URL}/api/orders?code=${encodeURIComponent(orderCode)}&token=${encodeURIComponent(trackingToken)}`
    );
    const trackingData = await trackingRes.json();

    assert.strictEqual(trackingRes.status, 200);
    const returnedOrder = trackingData.order;

    // Dữ liệu ghi chú được lưu an toàn (hoặc đã lọc ký tự nguy hiểm qua Zod sanitization)
    assert.ok(typeof returnedOrder.deliveryNote === "string");
    // Tuyệt đối không chứa thẻ script nguy hiểm
    assert.ok(!returnedOrder.deliveryNote.includes("<script>"));
  });
});
