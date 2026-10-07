import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT_DIR = process.cwd();

describe("Build Environment Security & Dependency Management Tests", () => {
  // =========================================================================
  // 1. Kiểm tra cấu hình Build & Tắt Source Maps
  // =========================================================================
  describe("1. Cấu hình tắt Source Maps & Ẩn dấu vết máy chủ", () => {
    it("[next.config.ts] Phải thiết lập productionBrowserSourceMaps: false", () => {
      const configPath = path.join(ROOT_DIR, "next.config.ts");
      assert.ok(fs.existsSync(configPath), "next.config.ts phải tồn tại");
      const content = fs.readFileSync(configPath, "utf8");

      assert.match(
        content,
        /productionBrowserSourceMaps\s*:\s*false/,
        "next.config.ts phải cấu hình rõ ràng productionBrowserSourceMaps: false"
      );
    });

    it("[next.config.ts] Phải thiết lập poweredByHeader: false để chống Server Fingerprinting", () => {
      const configPath = path.join(ROOT_DIR, "next.config.ts");
      const content = fs.readFileSync(configPath, "utf8");

      assert.match(
        content,
        /poweredByHeader\s*:\s*false/,
        "next.config.ts phải tắt header X-Powered-By"
      );
    });
  });

  // =========================================================================
  // 2. Kiểm tra Trang xử lý lỗi tập trung (Error Boundaries)
  // =========================================================================
  describe("2. Trang xử lý lỗi tập trung & Ngăn chặn rò rỉ Stack Trace / Data", () => {
    it("[app/error.tsx] Phải tồn tại và tuân thủ nguyên tắc không lộ thông tin kỹ thuật", () => {
      const errorPagePath = path.join(ROOT_DIR, "app", "error.tsx");
      assert.ok(fs.existsSync(errorPagePath), "app/error.tsx phải tồn tại");
      const content = fs.readFileSync(errorPagePath, "utf8");

      assert.match(content, /"use client"/, "app/error.tsx phải là Client Component");
      // Đảm bảo không render error.message hoặc error.stack trực tiếp ra JSX
      assert.ok(
        !content.includes("{error.message}") &&
        !content.includes("{error.stack}") &&
        !content.includes("JSON.stringify(error)"),
        "Không được in error.message hoặc error.stack ra giao diện người dùng"
      );
      assert.match(
        content,
        /Bếp gặp chút sự cố ngoài ý muốn/i,
        "Phải hiển thị thông báo thân thiện mộc mạc"
      );
    });

    it("[app/global-error.tsx] Phải tồn tại và xử lý lỗi cấp Root Layout an toàn", () => {
      const globalErrorPath = path.join(ROOT_DIR, "app", "global-error.tsx");
      assert.ok(fs.existsSync(globalErrorPath), "app/global-error.tsx phải tồn tại");
      const content = fs.readFileSync(globalErrorPath, "utf8");

      assert.match(content, /"use client"/, "app/global-error.tsx phải là Client Component");
      assert.match(content, /<html/i, "Phải tự định nghĩa thẻ <html> độc lập");
      assert.match(content, /<body/i, "Phải tự định nghĩa thẻ <body> độc lập");
      assert.ok(
        !content.includes("{error.message}") && !content.includes("{error.stack}"),
        "Tuyệt đối không render stack trace kỹ thuật ra root error"
      );
    });

    it("[app/not-found.tsx] Phải tồn tại trang 404 thân thiện", () => {
      const notFoundPath = path.join(ROOT_DIR, "app", "not-found.tsx");
      assert.ok(fs.existsSync(notFoundPath), "app/not-found.tsx phải tồn tại");
    });
  });

  // =========================================================================
  // 3. Quét lỗ hổng dependencies production (npm audit --omit=dev)
  // =========================================================================
  describe("3. Quét lỗ hổng bảo mật thư viện (npm audit)", () => {
    it("[Production Dependencies] 100% sạch sẽ, 0 lỗ hổng bảo mật (found 0 vulnerabilities)", () => {
      const auditResult = execSync("npm audit --omit=dev --json", {
        encoding: "utf8",
        cwd: ROOT_DIR,
      });

      const auditData = JSON.parse(auditResult);
      const totalVulns = auditData.metadata?.vulnerabilities?.total || 0;
      assert.equal(
        totalVulns,
        0,
        `Dependencies môi trường Production phải có 0 lỗ hổng bảo mật (hiện tại: ${totalVulns})`
      );
    });
  });

  // =========================================================================
  // 4. Kiểm tra Thiết lập Dependabot & CI/CD Security Workflow
  // =========================================================================
  describe("4. Tích hợp Dependabot & CI/CD Security Pipeline", () => {
    it("[.github/dependabot.yml] Phải tồn tại và cấu hình quét hàng ngày", () => {
      const depPath = path.join(ROOT_DIR, ".github", "dependabot.yml");
      assert.ok(fs.existsSync(depPath), ".github/dependabot.yml phải tồn tại");
      const content = fs.readFileSync(depPath, "utf8");

      assert.match(content, /package-ecosystem\s*:\s*["']?npm["']?/);
      assert.match(content, /interval\s*:\s*["']?daily["']?/);
    });

    it("[.github/workflows/security-scan.yml] Phải tồn tại workflow quét bảo mật tự động", () => {
      const workflowPath = path.join(
        ROOT_DIR,
        ".github",
        "workflows",
        "security-scan.yml"
      );
      assert.ok(
        fs.existsSync(workflowPath),
        ".github/workflows/security-scan.yml phải tồn tại"
      );
      const content = fs.readFileSync(workflowPath, "utf8");

      assert.match(content, /npm audit --omit=dev/);
      assert.match(content, /snyk/i);
    });

    it("[docs/vercel-security-guide.md] Phải tồn tại hướng dẫn bảo mật Vercel Dashboard", () => {
      const guidePath = path.join(
        ROOT_DIR,
        "docs",
        "vercel-security-guide.md"
      );
      assert.ok(
        fs.existsSync(guidePath),
        "docs/vercel-security-guide.md phải tồn tại"
      );
    });
  });
});
