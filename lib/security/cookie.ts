import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * lib/security/cookie.ts
 * Module quản lý Cookie và Session an toàn tuân thủ chuẩn bảo mật OWASP:
 * 1. Luôn thiết lập đầy đủ các cờ HttpOnly, Secure, và SameSite (Lax hoặc Strict).
 * 2. Ký số HMAC-SHA256 chống giả mạo / sửa đổi dữ liệu cookie từ phía client.
 * 3. Hỗ trợ lưu trữ phiên khách hàng và token tra cứu an toàn.
 */

export const COOKIE_NAMES = {
  CUSTOMER_SESSION: "bepque_session",
  CSRF_TOKEN: "bepque_csrf",
  TRACKING_SESSION: "bepque_order_access",
} as const;

export interface SecureCookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  maxAge?: number; // Tính bằng giây
  domain?: string;
}

const DEFAULT_MAX_AGE = 30 * 24 * 60 * 60; // 30 ngày (tính bằng giây)

const COOKIE_SECRET =
  process.env.SESSION_SECRET ||
  process.env.ADMIN_API_KEY ||
  "bepque_secure_session_secret_2026";

/**
 * Ký số dữ liệu cookie bằng HMAC-SHA256 (Tamper-proof)
 */
export function signCookieValue(value: string): string {
  const hmac = crypto
    .createHmac("sha256", COOKIE_SECRET)
    .update(value)
    .digest("hex");
  return `${value}.${hmac}`;
}

/**
 * Kiểm tra và giải mã cookie có chữ ký HMAC-SHA256
 */
export function unsignCookieValue(signedValue: string | null | undefined): string | null {
  if (!signedValue || typeof signedValue !== "string") return null;

  const lastDotIndex = signedValue.lastIndexOf(".");
  if (lastDotIndex === -1) return null;

  const value = signedValue.slice(0, lastDotIndex);
  const signature = signedValue.slice(lastDotIndex + 1);

  const expectedHmac = crypto
    .createHmac("sha256", COOKIE_SECRET)
    .update(value)
    .digest("hex");

  try {
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedHmac, "hex")
    );
    return isMatch ? value : null;
  } catch {
    return null;
  }
}

/**
 * Trả về cấu hình cờ bảo mật tiêu chuẩn cho cookie
 */
export function getStandardCookieOptions(
  overrides?: Partial<SecureCookieOptions>
): SecureCookieOptions {
  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.COOKIE_SECURE === "true" ||
    process.env.SECURE_COOKIES === "true";
  return {
    httpOnly: true, // Chống XSS đọc cookie qua JavaScript
    secure: isProd, // Bắt buộc truyền qua HTTPS ở production (hoặc khi bật COOKIE_SECURE)
    sameSite: "lax", // Chống CSRF cơ bản
    path: "/",
    maxAge: DEFAULT_MAX_AGE,
    ...overrides,
  };
}

/**
 * Thiết lập Cookie bảo mật vào NextResponse
 */
export function setSecureCookie(
  response: NextResponse,
  name: string,
  value: string,
  options?: Partial<SecureCookieOptions>
): void {
  const finalOptions = getStandardCookieOptions(options);
  const signed = signCookieValue(value);

  response.cookies.set({
    name,
    value: signed,
    httpOnly: finalOptions.httpOnly,
    secure: finalOptions.secure,
    sameSite: finalOptions.sameSite,
    path: finalOptions.path,
    maxAge: finalOptions.maxAge,
  });
}

/**
 * Đọc và xác thực Cookie bảo mật từ NextRequest
 */
export function getSecureCookie(
  request: NextRequest,
  name: string
): string | null {
  const rawCookie = request.cookies.get(name)?.value;
  if (!rawCookie) return null;
  return unsignCookieValue(rawCookie);
}

/**
 * Xóa Cookie an toàn
 */
export function clearSecureCookie(
  response: NextResponse,
  name: string,
  path = "/"
): void {
  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.COOKIE_SECURE === "true" ||
    process.env.SECURE_COOKIES === "true";
  response.cookies.set({
    name,
    value: "",
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path,
    maxAge: 0,
  });
}
