import test, { describe, it } from "node:test";
import assert from "node:assert/strict";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

describe("Security Headers & CORS Policy Tests", () => {
  // =========================================================================
  // 1. Kiểm thử Security Headers cho toàn bộ route
  // =========================================================================
  describe("1. Security Headers cho toàn bộ route", () => {
    it("[X-Frame-Options] Phải là 'DENY' để chống tấn công Clickjacking", async () => {
      const res = await fetch(`${BASE_URL}/`);
      const frameOptions = res.headers.get("x-frame-options");
      assert.equal(
        frameOptions,
        "DENY",
        "X-Frame-Options phải được đặt là 'DENY'"
      );
    });

    it("[X-Content-Type-Options] Phải là 'nosniff' để chống MIME sniffing", async () => {
      const res = await fetch(`${BASE_URL}/`);
      const contentTypeOptions = res.headers.get("x-content-type-options");
      assert.equal(
        contentTypeOptions,
        "nosniff",
        "X-Content-Type-Options phải là 'nosniff'"
      );
    });

    it("[Strict-Transport-Security] Phải chứa HSTS max-age=63072000, subDomains và preload", async () => {
      const res = await fetch(`${BASE_URL}/`);
      const hsts = res.headers.get("strict-transport-security");
      assert.ok(hsts, "Phải có header Strict-Transport-Security");
      assert.match(
        hsts,
        /max-age=63072000/i,
        "HSTS max-age phải là 63072000 (2 năm)"
      );
      assert.match(hsts, /includeSubDomains/i, "HSTS phải bao gồm includeSubDomains");
      assert.match(hsts, /preload/i, "HSTS phải bao gồm preload");
    });

    it("[Referrer-Policy] Phải là 'strict-origin-when-cross-origin'", async () => {
      const res = await fetch(`${BASE_URL}/`);
      const referrerPolicy = res.headers.get("referrer-policy");
      assert.equal(
        referrerPolicy,
        "strict-origin-when-cross-origin",
        "Referrer-Policy phải là 'strict-origin-when-cross-origin'"
      );
    });

    it("[Permissions-Policy] Phải vô hiệu hóa camera, microphone, geolocation", async () => {
      const res = await fetch(`${BASE_URL}/`);
      const permissionsPolicy = res.headers.get("permissions-policy");
      assert.ok(permissionsPolicy, "Phải có header Permissions-Policy");
      assert.match(permissionsPolicy, /camera=\(\)/i);
      assert.match(permissionsPolicy, /microphone=\(\)/i);
      assert.match(permissionsPolicy, /geolocation=\(\)/i);
    });

    it("[Content-Security-Policy] Phải hạn chế script-src và thiết lập frame-ancestors 'none'", async () => {
      const res = await fetch(`${BASE_URL}/`);
      const csp = res.headers.get("content-security-policy");
      assert.ok(csp, "Phải có Content-Security-Policy header");
      assert.match(
        csp,
        /frame-ancestors 'none'/i,
        "CSP phải có frame-ancestors 'none'"
      );
      assert.match(
        csp,
        /script-src[^;]*https:\/\/challenges\.cloudflare\.com/i,
        "CSP script-src phải giới hạn và cho phép Cloudflare Turnstile"
      );
      assert.match(csp, /object-src 'none'/i, "CSP phải có object-src 'none'");
    });
  });

  // =========================================================================
  // 2. Kiểm thử cấu hình CORS cho API Routes
  // =========================================================================
  describe("2. Cấu hình CORS bảo mật cho API Routes", () => {
    it("[CORS Safe Origin] Gửi request với Origin hợp lệ (https://bepque.vn) -> Cho phép truy cập", async () => {
      const res = await fetch(`${BASE_URL}/api/foods`, {
        headers: {
          Origin: "https://bepque.vn",
        },
      });

      const allowOrigin = res.headers.get("access-control-allow-origin");
      assert.equal(
        allowOrigin,
        "https://bepque.vn",
        "Access-Control-Allow-Origin phải khớp chính xác với origin hợp lệ"
      );
      assert.equal(
        res.headers.get("access-control-allow-credentials"),
        "true",
        "Phải cho phép credentials an toàn"
      );
    });

    it("[CORS Localhost Origin] Cho phép Origin phát triển (http://localhost:3000)", async () => {
      const res = await fetch(`${BASE_URL}/api/foods`, {
        headers: {
          Origin: "http://localhost:3000",
        },
      });

      const allowOrigin = res.headers.get("access-control-allow-origin");
      assert.equal(allowOrigin, "http://localhost:3000");
    });

    it("[CORS Preflight OPTIONS] Request OPTIONS từ Origin hợp lệ -> 204 No Content và đầy đủ method/headers", async () => {
      const res = await fetch(`${BASE_URL}/api/foods`, {
        method: "OPTIONS",
        headers: {
          Origin: "https://bepque.vn",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "Content-Type, Authorization",
        },
      });

      assert.equal(
        res.status,
        204,
        "Preflight request hợp lệ phải trả về mã 204 No Content"
      );
      assert.equal(res.headers.get("access-control-allow-origin"), "https://bepque.vn");
      assert.ok(res.headers.get("access-control-allow-methods")?.includes("POST"));
      assert.ok(res.headers.get("access-control-allow-headers")?.includes("Content-Type"));
    });

    it("[CORS Attack Prevention] Preflight OPTIONS từ Origin độc hại -> Chặn đứng với mã 403 Forbidden", async () => {
      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: "OPTIONS",
        headers: {
          Origin: "https://attacker-malicious-domain.evil",
          "Access-Control-Request-Method": "POST",
        },
      });

      assert.equal(
        res.status,
        403,
        "Preflight từ origin lạ độc hại phải bị từ chối với 403 Forbidden"
      );
      const allowOrigin = res.headers.get("access-control-allow-origin");
      assert.notEqual(
        allowOrigin,
        "https://attacker-malicious-domain.evil",
        "Tuyệt đối không cấp quyền CORS cho origin độc hại"
      );
      assert.notEqual(
        allowOrigin,
        "*",
        "Tuyệt đối không dùng Access-Control-Allow-Origin: *"
      );
    });

    it("[CORS Zero Wildcard] Tuyệt đối KHÔNG trả về '*' cho Access-Control-Allow-Origin khi xử lý dữ liệu API", async () => {
      const endpoints = ["/api/foods", "/api/orders", "/api/newsletter"];

      for (const endpoint of endpoints) {
        const res = await fetch(`${BASE_URL}${endpoint}`);
        const allowOrigin = res.headers.get("access-control-allow-origin");
        assert.notEqual(
          allowOrigin,
          "*",
          `Endpoint ${endpoint} tuyệt đối KHÔNG được mang Access-Control-Allow-Origin: *`
        );
      }
    });
  });
});
