import test, { describe, it, before } from "node:test";
import assert from "node:assert/strict";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

describe("Bot Prevention & Rate Limiting Security Tests", () => {
  // =========================================================================
  // 1. RFC 5322 Email Validation Tests
  // =========================================================================
  describe("1. Cú pháp Email nghiêm ngặt theo chuẩn RFC 5322 / RFC 5321", () => {
    it("[RFC 5322] Chấp nhận các địa chỉ email hợp lệ theo chuẩn quốc tế", async () => {
      const validEmails = [
        `khach.hang_${Date.now()}@bepque.vn`,
        `test.user+monque_${Date.now()}@mail.bepque.com.vn`,
        `contact-chef_${Date.now()}@amthuc.com.co`,
      ];

      for (const email of validEmails) {
        const res = await fetch(`${BASE_URL}/api/newsletter`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": `10.0.1.${Math.floor(Math.random() * 200) + 1}`,
          },
          body: JSON.stringify({
            email,
            turnstileToken: "test-mock-token-pass",
          }),
        });

        const data = await res.json();
        assert.equal(
          res.status,
          201,
          `Email hợp lệ [${email}] phải được chấp thuận với mã 201 Created`
        );
        assert.equal(data.success, true);
      }
    });

    it("[RFC 5322] Từ chối các email thiếu domain, thiếu TLD hoặc có dấu chấm liên tiếp (..)", async () => {
      const invalidEmails = [
        "plainaddress_without_at",
        "@missinglocal.com",
        "missingdomain@",
        "missingtld@domain",
        "trailingdot@domain.com.",
        "leadingdot.@domain.com",
        ".leadingdot@domain.com",
        "two..consecutive..dots@domain.com",
        "user@domain..consecutive.com",
        "user@-domain.com",
        "user@domain-.com",
        "user@domain.c", // TLD < 2 ký tự
        "user with space@domain.com",
      ];

      for (const email of invalidEmails) {
        const res = await fetch(`${BASE_URL}/api/newsletter`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": `10.0.2.${Math.floor(Math.random() * 200) + 1}`,
          },
          body: JSON.stringify({
            email,
            turnstileToken: "test-mock-token-pass",
          }),
        });

        assert.equal(
          res.status,
          400,
          `Email sai chuẩn RFC [${email}] phải bị từ chối với mã 400 Bad Request`
        );
        const data = await res.json();
        assert.equal(data.success, false);
      }
    });

    it("[RFC 5321] Từ chối email có local-part vượt quá 64 ký tự", async () => {
      const longLocalPart = "a".repeat(65) + "@bepque.vn";
      const res = await fetch(`${BASE_URL}/api/newsletter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": `10.0.3.${Math.floor(Math.random() * 200) + 1}`,
        },
        body: JSON.stringify({
          email: longLocalPart,
          turnstileToken: "test-mock-token-pass",
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
    });
  });

  // =========================================================================
  // 2. Honeypot Field Tests (Kỹ thuật bẫy bot)
  // =========================================================================
  describe("2. Kỹ thuật bẫy bot (Honeypot Field) trên các biểu mẫu", () => {
    it("[Honeypot Email Form] Bot điền vào trường ẩn bepque_hp_token -> Drop request lập tức (400)", async () => {
      const res = await fetch(`${BASE_URL}/api/newsletter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "10.0.4.1",
        },
        body: JSON.stringify({
          email: "bot_spammer@spam.org",
          bepque_hp_token: "https://automated-spam-link.com",
          turnstileToken: "test-mock-token-pass",
        }),
      });

      assert.equal(res.status, 400, "Request có honeypot phải bị chặn với mã 400");
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /Honeypot|bot/i);
    });

    it("[Honeypot Search Endpoint] Crawler gửi kèm hp_field trong query param -> Drop request (400)", async () => {
      const res = await fetch(
        `${BASE_URL}/api/foods?q=c%C3%A1+kho&hp_field=scraper_payload`,
        {
          headers: {
            "x-forwarded-for": "10.0.4.2",
          },
        }
      );

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /Honeypot|bot/i);
    });

    it("[Honeypot Order Tracking] Bot tra cứu đơn kèm trường honeypot -> Drop request (400)", async () => {
      const res = await fetch(
        `${BASE_URL}/api/orders?code=BQ-20261006-6006&hp_field=malicious_crawler`,
        {
          headers: {
            "x-forwarded-for": "10.0.4.3",
          },
        }
      );

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /Honeypot|bot/i);
    });
  });

  // =========================================================================
  // 3. Cloudflare Turnstile Verification Tests
  // =========================================================================
  describe("3. Tích hợp Cloudflare Turnstile Bot Challenge", () => {
    it("[Turnstile Pass] Token Turnstile hợp lệ -> Cho phép xử lý", async () => {
      const res = await fetch(`${BASE_URL}/api/newsletter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "10.0.5.1",
        },
        body: JSON.stringify({
          email: `turnstile_valid_${Date.now()}@bepque.vn`,
          turnstileToken: "test-mock-token-pass",
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.success, true);
    });

    it("[Turnstile Fail] Token Turnstile giả mạo hoặc bị block -> Từ chối yêu cầu (400)", async () => {
      const res = await fetch(`${BASE_URL}/api/newsletter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "10.0.5.2",
        },
        body: JSON.stringify({
          email: `turnstile_fail_${Date.now()}@bepque.vn`,
          turnstileToken: "test-mock-token-fail",
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /Turnstile|bot/i);
    });

    it("[Turnstile Tracking] Tra cứu đơn với token Turnstile bị block -> Từ chối (400)", async () => {
      const res = await fetch(
        `${BASE_URL}/api/orders?code=BQ-20261006-6006&turnstileToken=test-mock-token-fail`,
        {
          headers: {
            "x-forwarded-for": "10.0.5.3",
          },
        }
      );

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /Turnstile|bot/i);
    });
  });

  // =========================================================================
  // 4. Rate Limiting Tests
  // =========================================================================
  describe("4. Cấu hình Rate Limiting ở cấp độ API (Sliding Window & HTTP 429)", () => {
    it("[Rate Limit Email Form] Vượt quá 5 requests / phút / IP -> Kích hoạt 429 Too Many Requests", async () => {
      const targetIp = `192.168.100.${Math.floor(Math.random() * 200) + 10}`;

      // 5 requests đầu tiên thành công (được xử lý)
      for (let i = 0; i < 5; i++) {
        const res = await fetch(`${BASE_URL}/api/newsletter`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": targetIp,
          },
          body: JSON.stringify({
            email: `ratelimit_${i}_${Date.now()}@bepque.vn`,
            turnstileToken: "test-mock-token-pass",
          }),
        });

        assert.notEqual(
          res.status,
          429,
          `Request thứ ${i + 1} phải chưa bị Rate Limit`
        );
        assert.equal(res.headers.get("x-ratelimit-limit"), "5");
      }

      // Request thứ 6 từ cùng IP phải bị chặn với mã 429 Too Many Requests
      const blockedRes = await fetch(`${BASE_URL}/api/newsletter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": targetIp,
        },
        body: JSON.stringify({
          email: `ratelimit_blocked_${Date.now()}@bepque.vn`,
          turnstileToken: "test-mock-token-pass",
        }),
      });

      assert.equal(
        blockedRes.status,
        429,
        "Request thứ 6 từ cùng một IP phải trả về mã 429 Too Many Requests"
      );
      assert.equal(blockedRes.headers.get("x-ratelimit-remaining"), "0");
      assert.ok(
        blockedRes.headers.get("retry-after"),
        "Phải có header Retry-After"
      );

      const blockedData = await blockedRes.json();
      assert.equal(blockedData.success, false);
      assert.match(blockedData.error, /quá nhiều yêu cầu/i);
    });

    it("[Rate Limit Search Endpoint] Vượt quá 20 requests / phút / IP -> Kích hoạt 429", async () => {
      const searchIp = `192.168.200.${Math.floor(Math.random() * 200) + 10}`;

      // Gửi 20 request tìm kiếm hợp lệ
      for (let i = 0; i < 20; i++) {
        const res = await fetch(`${BASE_URL}/api/foods?q=c%C3%A1`, {
          headers: {
            "x-forwarded-for": searchIp,
          },
        });
        assert.notEqual(res.status, 429, `Search request ${i + 1} không được bị 429`);
        assert.equal(res.headers.get("x-ratelimit-limit"), "20");
      }

      // Request thứ 21 phải bị trả về 429
      const blockedRes = await fetch(`${BASE_URL}/api/foods?q=c%C3%A1`, {
        headers: {
          "x-forwarded-for": searchIp,
        },
      });

      assert.equal(blockedRes.status, 429, "Search request thứ 21 phải bị 429");
      assert.equal(blockedRes.headers.get("x-ratelimit-remaining"), "0");
      assert.ok(blockedRes.headers.get("retry-after"));
    });

    it("[Rate Limit Order Tracking] Vượt quá 20 requests / phút / IP -> Kích hoạt 429", async () => {
      const trackIp = `192.168.250.${Math.floor(Math.random() * 200) + 10}`;

      // Gửi 20 request tra cứu
      for (let i = 0; i < 20; i++) {
        const res = await fetch(`${BASE_URL}/api/orders?code=BQ-NOT-FOUND-TEST`, {
          headers: {
            "x-forwarded-for": trackIp,
          },
        });
        assert.notEqual(res.status, 429, `Tracking request ${i + 1} không được bị 429`);
        assert.equal(res.headers.get("x-ratelimit-limit"), "20");
      }

      // Request thứ 21 phải bị 429
      const blockedRes = await fetch(
        `${BASE_URL}/api/orders?code=BQ-NOT-FOUND-TEST`,
        {
          headers: {
            "x-forwarded-for": trackIp,
          },
        }
      );

      assert.equal(blockedRes.status, 429, "Tracking request thứ 21 phải bị 429");
      assert.equal(blockedRes.headers.get("x-ratelimit-remaining"), "0");
      assert.ok(blockedRes.headers.get("retry-after"));
    });
  });
});
