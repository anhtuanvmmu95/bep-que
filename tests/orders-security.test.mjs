import test, { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const WEBHOOK_SECRET =
  process.env.PAYMENT_WEBHOOK_SECRET ||
  process.env.WEBHOOK_SECRET ||
  "bepque_payment_webhook_secret_key_2026";
const ADMIN_SECRET =
  process.env.ADMIN_API_KEY ||
  process.env.INTERNAL_API_SECRET ||
  "bepque_internal_secret_key_2026";

describe("Order API Security Tests - IDOR & Zero Trust Client", () => {
  let victimOrder = null;
  let attackerOrder = null;

  before(async () => {
    // 1. Tạo đơn hàng của Nạn nhân (Victim A)
    const victimPayload = {
      fullName: "Nguyễn Văn An",
      phoneNumber: "0912345678",
      email: "victim.an@example.com",
      addressLine: "Số 99 Phố Trần Hưng Đạo",
      districtId: "hn-hoan-kiem",
      deliveryTimingType: "asap",
      deliveryNote: "Bấm chuông cửa tầng 3",
      paymentMethod: "cod",
      codChangeOption: "Cần thối từ 500.000đ",
      items: [
        {
          productId: "rural-food-01",
          quantity: 2,
        },
      ],
    };

    const resA = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(victimPayload),
    });
    const dataA = await resA.json();
    assert.strictEqual(resA.status, 201, "Tạo đơn hàng A phải thành công");
    victimOrder = dataA;

    // 2. Tạo đơn hàng của Kẻ tấn công (Attacker B)
    const attackerPayload = {
      fullName: "Trần Kẻ Tấn Công",
      phoneNumber: "0988000111",
      email: "attacker@example.com",
      addressLine: "10 Cầu Giấy",
      districtId: "hn-cau-giay",
      deliveryTimingType: "asap",
      paymentMethod: "vietqr",
      items: [
        {
          productId: "rural-food-04",
          quantity: 1,
        },
      ],
    };

    const resB = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(attackerPayload),
    });
    const dataB = await resB.json();
    assert.strictEqual(resB.status, 201, "Tạo đơn hàng B phải thành công");
    attackerOrder = dataB;
  });

  /* =======================================================================
   * PHẦN 1: BẢO MẬT IDOR & BROKEN ACCESS CONTROL (TRA CỨU /TRACKING)
   * ======================================================================= */
  it("1. [Mã tra cứu có Entropy cao] Token ngẫu nhiên (UUIDv4) được cấp khi tạo đơn", () => {
    assert.ok(victimOrder.trackingToken, "Đơn hàng phải có trackingToken");
    assert.ok(attackerOrder.trackingToken, "Đơn hàng B phải có trackingToken");

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    assert.match(
      victimOrder.trackingToken,
      uuidRegex,
      "Tracking token phải tuân theo chuẩn UUIDv4 có entropy cao"
    );
  });

  it("2. [IDOR Broken Access Control] Gửi mã đơn hàng của người khác mà KHÔNG kèm token -> Phải trả về 403 Forbidden", async () => {
    const res = await fetch(
      `${BASE_URL}/api/orders?code=${encodeURIComponent(victimOrder.order.orderCode)}`
    );
    const body = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(body.success, false);
    assert.match(body.error, /token/i);
  });

  it("3. [IDOR Broken Access Control] Gửi mã đơn của người khác kèm token của chính Kẻ tấn công -> Phải trả về 403 Forbidden", async () => {
    const res = await fetch(
      `${BASE_URL}/api/orders?code=${encodeURIComponent(
        victimOrder.order.orderCode
      )}&token=${encodeURIComponent(attackerOrder.trackingToken)}`
    );
    const body = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(body.success, false);
    assert.match(body.error, /không khớp/i);
  });

  it("4. [IDOR Broken Access Control] Gửi mã đơn của người khác kèm token giả mạo ngẫu nhiên -> Phải trả về 403 Forbidden", async () => {
    const res = await fetch(
      `${BASE_URL}/api/orders?code=${encodeURIComponent(
        victimOrder.order.orderCode
      )}&token=tampered-fake-token-123456`
    );
    const body = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(body.success, false);
  });

  it("5. [Tra cứu mã không tồn tại] -> Phải trả về 404 Not Found", async () => {
    const res = await fetch(
      `${BASE_URL}/api/orders?code=BQ-NONEXISTENT-999999&token=some-token`
    );
    const body = await res.json();

    assert.strictEqual(res.status, 404);
    assert.strictEqual(body.success, false);
  });

  it("6. [Tra cứu bằng token không tồn tại] -> Phải trả về 404 Not Found", async () => {
    const res = await fetch(
      `${BASE_URL}/api/orders?token=00000000-0000-4000-8000-000000000000`
    );
    const body = await res.json();

    assert.strictEqual(res.status, 404);
    assert.strictEqual(body.success, false);
  });

  it("7. [Chính chủ hợp lệ] Gửi đúng mã đơn và token sở hữu -> Trả về 200 OK", async () => {
    const resQuery = await fetch(
      `${BASE_URL}/api/orders?code=${encodeURIComponent(
        victimOrder.order.orderCode
      )}&token=${encodeURIComponent(victimOrder.trackingToken)}`
    );
    const bodyQuery = await resQuery.json();

    assert.strictEqual(resQuery.status, 200);
    assert.strictEqual(bodyQuery.success, true);
    assert.strictEqual(bodyQuery.order.orderCode, victimOrder.order.orderCode);
  });

  it("8. [Nguyên tắc Least Privilege] Dữ liệu trả về chỉ chứa thông tin tối thiểu, lọc bỏ/che giấu PII", async () => {
    const res = await fetch(
      `${BASE_URL}/api/orders?token=${encodeURIComponent(victimOrder.trackingToken)}`
    );
    const body = await res.json();
    assert.strictEqual(res.status, 200);

    const orderData = body.order;
    assert.strictEqual(orderData.email, undefined);
    assert.strictEqual(orderData.codChangeOption, undefined);
    assert.strictEqual(orderData.id, undefined);
    assert.notStrictEqual(orderData.phone, "0912345678");
    assert.ok(orderData.phone.includes("****"));
    assert.ok(orderData.address.includes("***"));
    assert.notStrictEqual(orderData.recipientName, "Nguyễn Văn An");
    assert.strictEqual(orderData.status, "PENDING");
    assert.strictEqual(orderData.items[0].name, "Cơm Niêu Cá Bống Kho Tộ");
  });

  it("9. [Mass Data Exposure Prevention] Ngăn chặn quét/trích xuất toàn bộ đơn hàng", async () => {
    const res = await fetch(`${BASE_URL}/api/orders`);
    const body = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.orders, undefined);
  });

  /* =======================================================================
   * PHẦN 2: ZERO TRUST CLIENT - GIÁ TIỀN & TÍNH TOÁN SERVER AUTHORITATIVE
   * ======================================================================= */
  it("10. [Zero Trust Pricing] Backend BỎ QUA giá client gửi, tự truy vấn giá gốc và tính toán tổng tiền", async () => {
    // Kẻ gian cố tình sửa đổi giá thành 1đ, chiết khấu 1.000.000đ và tổng tiền 1đ
    const maliciousPayload = {
      fullName: "Lê Hacker",
      phoneNumber: "0909999888",
      addressLine: "123 Đường Gian Lận",
      districtId: "hn-hoan-kiem",
      deliveryTimingType: "asap",
      paymentMethod: "cod",
      // Client gian lận gửi giá tiền:
      items: [
        {
          productId: "rural-food-01", // Giá gốc thực tế trong menu là 75.000đ
          quantity: 2,
          price: 1, // Kẻ gian cố ý gửi 1đ
          finalPrice: 1,
          unitPrice: 1,
          subtotal: 2,
        },
      ],
      shippingFee: 0, // Kẻ gian tự ý set miễn ship
      discountAmount: 1000000, // Kẻ gian tự đặt voucher giảm 1 triệu
      totalAmount: 1, // Kẻ gian gửi tổng tiền 1đ
    };

    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(maliciousPayload),
    });
    const data = await res.json();

    assert.strictEqual(res.status, 201, "Tạo đơn hàng phải thành công");
    const createdOrder = data.order;

    // 1. Kiểm tra đơn giá món ăn được lấy từ cơ sở dữ liệu (75.000đ), KHÔNG phải 1đ
    assert.strictEqual(
      createdOrder.items[0].unitPrice,
      75000,
      "Backend phải tự truy vấn giá gốc 75.000đ từ database, không nhận giá 1đ từ client"
    );
    assert.strictEqual(
      createdOrder.items[0].subtotal,
      150000,
      "Subtotal phải được tính là 75.000 x 2 = 150.000đ"
    );

    // 2. Chiết khấu phải bằng 0đ vì không có coupon hợp lệ
    assert.strictEqual(
      createdOrder.discountAmount,
      0,
      "Backend phải loại bỏ số tiền giảm giá giả mạo 1.000.000đ"
    );

    // 3. Phí vận chuyển phải được tính toán tự động trên Server
    assert.strictEqual(
      createdOrder.shippingFee,
      30000,
      "Phí ship quận Hoàn Kiếm phải được server tự tính (30.000đ)"
    );

    // 4. Tổng tiền cuối cùng phải là 150.000 + 30.000 = 180.000đ (KHÔNG PHẢI 1đ)
    assert.strictEqual(
      createdOrder.totalAmount,
      180000,
      "Tổng tiền phải là 180.000đ do Server tính toán, không chấp nhận 1đ của client"
    );
  });

  it("11. [Zero Trust Catalog] Gửi sản phẩm không tồn tại trong Database -> Trả về 400 Bad Request", async () => {
    const invalidProductPayload = {
      fullName: "Nguyễn Thử Nghiệm",
      phoneNumber: "0901234567",
      addressLine: "45 Hàng Bài",
      districtId: "hn-hoan-kiem",
      items: [
        {
          productId: "fake-non-existent-product-id-999",
          quantity: 1,
        },
      ],
    };

    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invalidProductPayload),
    });
    const body = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(body.success, false);
    assert.match(body.error, /không tồn tại trong thực đơn/i);
  });

  it("12. [Zero Trust Order Status on Creation] Client tự ý gửi status='PAID' khi tạo đơn -> Bị ép về 'PENDING'", async () => {
    const exploitPayload = {
      fullName: "Nguyễn Lách Luật",
      phoneNumber: "0907777666",
      addressLine: "12 Phố Huế",
      districtId: "hn-hoan-kiem",
      items: [{ productId: "rural-food-01", quantity: 1 }],
      status: "PAID",
      paymentStatus: "PAID",
    };

    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(exploitPayload),
    });
    const data = await res.json();

    assert.strictEqual(res.status, 201);
    assert.strictEqual(
      data.order.status,
      "PENDING",
      "Trạng thái đơn hàng khởi tạo BẮT BUỘC phải là PENDING"
    );
    assert.strictEqual(
      data.order.paymentStatus,
      "PENDING",
      "Trạng thái thanh toán khởi tạo BẮT BUỘC phải là PENDING"
    );
  });

  /* =======================================================================
   * PHẦN 3: ZERO TRUST STATUS UPDATES & WEBHOOK SIGNATURE VERIFICATION
   * ======================================================================= */
  it("13. [Zero Trust Status Update] Client thông thường gọi PATCH cập nhật trạng thái tùy ý -> Trả về 403 Forbidden", async () => {
    // Client cố gắng gọi PATCH để chuyển đơn hàng thành "PAID" mà không có chữ ký webhook hay quyền admin
    const patchPayload = {
      orderCode: victimOrder.order.orderCode,
      status: "COMPLETED",
      paymentStatus: "PAID",
    };

    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patchPayload),
    });
    const body = await res.json();

    assert.strictEqual(
      res.status,
      403,
      "Client thông thường không được phép tự ý PATCH trạng thái đơn hàng"
    );
    assert.strictEqual(body.success, false);
    assert.match(body.error, /chữ ký/i);
  });

  it("14. [Webhook Signature Verification] Gửi webhook với chữ ký giả mạo/sai lệch -> Trả về 401 Unauthorized", async () => {
    const webhookPayload = JSON.stringify({
      orderCode: victimOrder.order.orderCode,
      status: "CONFIRMED",
      paymentStatus: "PAID",
    });

    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-signature": "tampered-invalid-hmac-signature-654321",
      },
      body: webhookPayload,
    });
    const body = await res.json();

    assert.strictEqual(
      res.status,
      401,
      "Webhook với chữ ký không hợp lệ phải bị từ chối với mã 401 Unauthorized"
    );
    assert.strictEqual(body.success, false);
    assert.match(body.error, /chữ ký webhook không hợp lệ/i);
  });

  it("15. [Webhook Signature Verification] Gửi webhook kèm chữ ký HMAC-SHA256 chuẩn xác -> Cập nhật thành công 200 OK", async () => {
    const rawPayload = JSON.stringify({
      orderCode: victimOrder.order.orderCode,
      status: "CONFIRMED",
      paymentStatus: "PAID",
    });

    // Tạo chữ ký HMAC-SHA256 chuẩn
    const validSignature = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(rawPayload)
      .digest("hex");

    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-signature": validSignature,
      },
      body: rawPayload,
    });
    const body = await res.json();

    assert.strictEqual(
      res.status,
      200,
      "Webhook có chữ ký hợp lệ phải được chấp thuận với mã 200 OK"
    );
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.status, "CONFIRMED");
    assert.strictEqual(body.paymentStatus, "PAID");

    // Xác minh lại trạng thái đã được lưu trong cơ sở dữ liệu qua API tra cứu
    const verifyRes = await fetch(
      `${BASE_URL}/api/orders?token=${encodeURIComponent(victimOrder.trackingToken)}`
    );
    const verifyBody = await verifyRes.json();
    assert.strictEqual(verifyBody.order.status, "CONFIRMED");
    assert.strictEqual(verifyBody.order.paymentStatus, "PAID");
  });

  it("16. [Internal Staff Update] Cập nhật qua token nội bộ hợp lệ (Admin key) -> Trả về 200 OK", async () => {
    const adminPayload = JSON.stringify({
      orderCode: victimOrder.order.orderCode,
      status: "DELIVERING",
    });

    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_SECRET,
      },
      body: adminPayload,
    });
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.status, "DELIVERING");
  });
});
