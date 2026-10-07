import { NextRequest, NextResponse } from "next/server";
import { generateCsrfToken } from "@/lib/security/csrf";
import { setSecureCookie, COOKIE_NAMES } from "@/lib/security/cookie";

/**
 * GET /api/csrf - Cấp phát CSRF Token và thiết lập Secure HttpOnly Cookie:
 * 1. Sinh chuỗi token ngẫu nhiên độ dài 256-bit (crypto.randomBytes).
 * 2. Lưu vào cookie 'bepque_csrf' với đầy đủ cờ HttpOnly, Secure, SameSite=Lax, Path=/.
 * 3. Trả về token cho client sử dụng qua header X-CSRF-Token.
 */
export async function GET(_req: NextRequest) {
  const token = generateCsrfToken();

  const response = NextResponse.json({
    success: true,
    csrfToken: token,
  });

  // Thiết lập cookie bảo mật cao
  setSecureCookie(response, COOKIE_NAMES.CSRF_TOKEN, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 2, // 2 giờ
  });

  return response;
}
