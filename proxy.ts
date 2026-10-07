import { NextRequest, NextResponse } from "next/server";
import {
  isAllowedOrigin,
  getCorsHeaders,
} from "@/lib/security/cors";
import { validateCsrfOriginAndReferer } from "@/lib/security/csrf";

/**
 * proxy.ts (Next.js 16 Proxy Convention)
 * Bộ điều khiển Proxy thực thi trước mọi route:
 * 1. Xử lý preflight CORS (OPTIONS) và lọc Origin khắt khe cho /api/:path*.
 *    - Tuyệt đối cấm dùng '*' cho các route xử lý dữ liệu.
 *    - Chỉ cho phép Origin hợp lệ trong danh sách (Allowlist).
 * 2. Phòng chống tấn công CSRF: Kiểm tra Origin và Referer cho toàn bộ request POST/PUT/PATCH/DELETE.
 * 3. Đính kèm Security Headers: CSP, X-Frame-Options, X-Content-Type-Options, HSTS, v.v.
 */
export function proxy(req: NextRequest) {
  const origin = req.headers.get("origin");
  const isApiRoute = req.nextUrl.pathname.startsWith("/api/");

  // 1. Xử lý yêu cầu Preflight OPTIONS cho API
  if (isApiRoute && req.method === "OPTIONS") {
    // Nếu có Origin và không thuộc Allowlist -> Chặn ngay lập tức
    if (origin && !isAllowedOrigin(origin)) {
      return new NextResponse(
        JSON.stringify({ error: "CORS policy: Origin not allowed" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const preflightHeaders = new Headers();
    const cors = getCorsHeaders(origin);
    for (const [key, val] of Object.entries(cors)) {
      preflightHeaders.set(key, val);
    }

    return new NextResponse(null, {
      status: 204,
      headers: preflightHeaders,
    });
  }

  // 2. Phòng chống tấn công CSRF cho các request thay đổi trạng thái (POST/PUT/PATCH/DELETE)
  if (isApiRoute && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method.toUpperCase())) {
    const csrfCheck = validateCsrfOriginAndReferer(req);
    if (!csrfCheck.valid) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: csrfCheck.reason || "Yêu cầu bị từ chối do vi phạm chính sách bảo mật CSRF.",
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "X-Frame-Options": "DENY",
          },
        }
      );
    }
  }

  // 3. Tiếp tục chuỗi xử lý request thông thường
  const response = NextResponse.next();

  // 4. Đính kèm CORS Headers cho các response của API Routes
  if (isApiRoute) {
    const cors = getCorsHeaders(origin);
    for (const [key, val] of Object.entries(cors)) {
      response.headers.set(key, val);
    }
  }

  // 5. Đính kèm Security Headers phòng thủ chiều sâu (Defense-in-Depth)
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Áp dụng proxy cho mọi request ngoại trừ static files nội bộ:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
