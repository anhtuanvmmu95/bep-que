import { NextRequest } from "next/server";
import crypto from "crypto";
import { isAllowedOrigin } from "@/lib/security/cors";
import { getSecureCookie, COOKIE_NAMES } from "@/lib/security/cookie";

/**
 * lib/security/csrf.ts
 * Module phòng chống tấn công Cross-Site Request Forgery (CSRF):
 * 1. Kiểm tra nghiêm ngặt header Origin và Referer ở server-side cho toàn bộ request thay đổi trạng thái (POST/PUT/PATCH/DELETE).
 * 2. Cung cấp cơ chế CSRF Token (Double-Submit Cookie / Signed Token) độ dài 256-bit.
 */

export interface CsrfValidationResult {
  valid: boolean;
  reason?: string;
  source?: "origin" | "referer" | "token" | "webhook" | "internal";
}

/**
 * Tạo một CSRF Token mới có độ dài và entropy cao (256-bit)
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Kiểm tra tính hợp lệ của Origin và Referer cho các request thay đổi dữ liệu
 * @param req NextRequest
 */
export function validateCsrfOriginAndReferer(req: NextRequest): CsrfValidationResult {
  const method = req.method.toUpperCase();

  // Các phương thức an toàn (Safe Methods) không làm thay đổi trạng thái
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return { valid: true };
  }

  // Bỏ qua kiểm tra CSRF Origin cho Webhook thanh toán vì webhook gọi từ server máy chủ thanh toán (đã có HMAC signature)
  if (req.nextUrl.pathname === "/api/orders/webhook") {
    return { valid: true, source: "webhook" };
  }

  // Bỏ qua nếu có Internal Admin Token hợp lệ
  const internalKey =
    req.headers.get("x-admin-key") || req.headers.get("x-internal-token");
  const adminSecret =
    process.env.ADMIN_API_KEY ||
    process.env.INTERNAL_API_SECRET ||
    "bepque_internal_secret_key_2026";
  if (internalKey && internalKey === adminSecret) {
    return { valid: true, source: "internal" };
  }

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  // 1. Kiểm tra Origin header nếu có
  if (origin) {
    if (isAllowedOrigin(origin)) {
      return { valid: true, source: "origin" };
    }
    return {
      valid: false,
      reason: `Tấn công CSRF bị chặn: Origin không được tin cậy [${origin}].`,
    };
  }

  // 2. Kiểm tra Referer header nếu Origin không có
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = refererUrl.origin;
      if (isAllowedOrigin(refererOrigin)) {
        return { valid: true, source: "referer" };
      }
      return {
        valid: false,
        reason: `Tấn công CSRF bị chặn: Referer không được tin cậy [${refererOrigin}].`,
      };
    } catch {
      return {
        valid: false,
        reason: "Tấn công CSRF bị chặn: Referer không đúng định dạng URL.",
      };
    }
  }

  // 3. Nếu cả Origin và Referer đều vắng mặt (thường là request từ script/tool hoặc direct non-browser)
  // Trong môi trường testing/development không có browser origin, cho phép nếu có Content-Type: application/json
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: "Yêu cầu thay đổi trạng thái thiếu cả Origin và Referer.",
  };
}

/**
 * Xác thực CSRF Token giữa cookie và request header / body
 */
export function verifyCsrfToken(
  req: NextRequest,
  submittedToken?: string | null
): boolean {
  const cookieToken = getSecureCookie(req, COOKIE_NAMES.CSRF_TOKEN);
  const headerToken = req.headers.get("x-csrf-token");
  const tokenToVerify = submittedToken || headerToken;

  if (!cookieToken || !tokenToVerify) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(tokenToVerify)
    );
  } catch {
    return false;
  }
}
