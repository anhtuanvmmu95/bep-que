import test, { describe, it } from "node:test";
import assert from "node:assert/strict";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

describe("Database Query Security & Input Validation Tests (Zod + Parameterized Queries)", () => {
  /* =======================================================================
   * PHẦN 1: TÌM KIẾM MÓN ĂN & BỘ LỌC DANH MỤC (/api/foods)
   * ======================================================================= */
  it("1. [Food Search] Tìm kiếm hợp lệ trả về kết quả đúng cấu trúc", async () => {
    const res = await fetch(`${BASE_URL}/api/foods?q=cá&category=Tất cả&sortBy=default`);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.foods));
    assert.ok(data.total >= 1);

    // Kiểm tra tất cả món trả về đều chứa từ khóa "cá"
    for (const food of data.foods) {
      const match =
        food.name.toLowerCase().includes("cá") ||
        food.description.toLowerCase().includes("cá");
      assert.ok(match, `Món ${food.name} phải khớp từ khóa tìm kiếm`);
    }
  });

  it("2. [Category Filter] Lọc theo danh mục hợp lệ", async () => {
    const res = await fetch(`${BASE_URL}/api/foods?category=Cơm quê`);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.foods.length > 0);

    for (const food of data.foods) {
      assert.strictEqual(food.category, "Cơm quê");
    }
  });

  it("3. [SQL Injection Prevention] Gửi chuỗi SQLi kinh điển vào ô tìm kiếm -> Không bị lỗi SQL, xử lý an toàn", async () => {
    const sqliPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE products; --",
      "admin'--",
      "' UNION SELECT null, null, null--",
      "1' OR 1=1 #",
    ];

    for (const sqli of sqliPayloads) {
      const res = await fetch(`${BASE_URL}/api/foods?q=${encodeURIComponent(sqli)}`);
      const data = await res.json();

      // Server không bị crash 500 và không bị dump dữ liệu trái phép
      assert.strictEqual(
        res.status,
        200,
        `Truy vấn SQLi "${sqli}" phải được tham số hóa an toàn và không gây lỗi 500`
      );
      assert.strictEqual(data.success, true);
      // Kết quả không được dump toàn bộ cơ sở dữ liệu
      assert.ok(data.foods.length === 0, `Payload SQLi "${sqli}" không được khớp bất kỳ món nào`);
    }
  });

  it("4. [Zod Validation] Giới hạn độ dài từ khóa tìm kiếm (q > 100 ký tự) -> 400 Bad Request", async () => {
    const longQuery = "a".repeat(105);
    const res = await fetch(`${BASE_URL}/api/foods?q=${longQuery}`);
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.match(data.error || data.details[0].message, /100 ký tự/i);
  });

  it("5. [Zod Validation] Giới hạn số lượng limit và page -> 400 Bad Request khi tham số sai kiểu", async () => {
    // limit > 100 bị chặn
    const resLimit = await fetch(`${BASE_URL}/api/foods?limit=500`);
    const dataLimit = await resLimit.json();
    assert.strictEqual(resLimit.status, 400);
    assert.strictEqual(dataLimit.success, false);

    // page < 1 bị chặn
    const resPage = await fetch(`${BASE_URL}/api/foods?page=0`);
    const dataPage = await resPage.json();
    assert.strictEqual(resPage.status, 400);
    assert.strictEqual(dataPage.success, false);
  });

  /* =======================================================================
   * PHẦN 2: BIỂU MẪU LƯU EMAIL / NEWSLETTER (/api/newsletter)
   * ======================================================================= */
  it("6. [Newsletter] Đăng ký email hợp lệ -> 201 Created và lưu an toàn", async () => {
    const validEmail = `test.user.${Date.now()}@bepque.vn`;
    const res = await fetch(`${BASE_URL}/api/newsletter`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.88.6.1",
      },
      body: JSON.stringify({ email: validEmail }),
    });
    const data = await res.json();

    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.email, validEmail);
  });

  it("7. [Newsletter Zod Validation] Email sai định dạng -> 400 Bad Request", async () => {
    const invalidEmails = [
      "not-an-email",
      "test@",
      "@domain.com",
      "test..user@domain.com",
      "",
    ];

    let i = 0;
    for (const email of invalidEmails) {
      i++;
      const res = await fetch(`${BASE_URL}/api/newsletter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": `10.88.7.${i}`,
        },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      assert.strictEqual(
        res.status,
        400,
        `Email không hợp lệ "${email}" phải bị từ chối với 400`
      );
      assert.strictEqual(data.success, false);
    }
  });

  it("8. [Newsletter SQLi / Header Injection Prevention] Chặn đứng payload tấn công trong trường email", async () => {
    const attackEmails = [
      "admin' OR 1=1;--@gmail.com",
      "test\r\nBcc: victim@example.com",
      "' UNION SELECT * FROM users; --",
      "a".repeat(260) + "@gmail.com", // Quá 255 ký tự
    ];

    let j = 0;
    for (const attack of attackEmails) {
      j++;
      const res = await fetch(`${BASE_URL}/api/newsletter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": `10.88.8.${j}`,
        },
        body: JSON.stringify({ email: attack }),
      });
      const data = await res.json();

      assert.strictEqual(
        res.status,
        400,
        `Payload email "${attack}" phải bị Zod từ chối với 400 Bad Request`
      );
      assert.strictEqual(data.success, false);
    }
  });

  /* =======================================================================
   * PHẦN 3: VALIDATION ĐƠN HÀNG (ZOD SCHEMAS TẠI /api/orders)
   * ======================================================================= */
  it("9. [Order Zod Validation] Số điện thoại không đúng chuẩn di động Việt Nam -> 400 Bad Request", async () => {
    const invalidPhones = ["12345", "01234567890123", "abc0912345", "19006868"];

    for (const phone of invalidPhones) {
      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Nguyễn Văn Test",
          phoneNumber: phone,
          addressLine: "123 Phố Huế",
          districtId: "hn-hoan-kiem",
          items: [{ productId: "rural-food-01", quantity: 1 }],
        }),
      });
      const data = await res.json();

      assert.strictEqual(res.status, 400);
      assert.strictEqual(data.success, false);
      assert.match(data.error, /số điện thoại/i);
    }
  });

  it("10. [Order Zod Validation] Số lượng món âm hoặc bằng 0 -> 400 Bad Request", async () => {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Nguyễn Văn Test",
        phoneNumber: "0912345678",
        addressLine: "123 Phố Huế",
        districtId: "hn-hoan-kiem",
        items: [{ productId: "rural-food-01", quantity: 0 }],
      }),
    });
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
  });
});
