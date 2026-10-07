/**
 * lib/security/cors.ts
 * Module quản lý cấu hình CORS (Cross-Origin Resource Sharing) bảo mật:
 * 1. Tuyệt đối KHÔNG sử dụng 'Access-Control-Allow-Origin: *' cho các route nhạy cảm.
 * 2. Xác thực Origin dựa trên danh sách cho phép (Allowlist).
 * 3. Hỗ trợ đầy đủ Preflight OPTIONS và gắn header chuẩn cho API Routes.
 */

export const DEFAULT_ALLOWED_ORIGINS = [
  "https://bepque.vn",
  "https://www.bepque.vn",
  "https://bep-que-vn.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

/**
 * Lấy toàn bộ danh sách Origin hợp lệ từ cấu hình và biến môi trường
 */
export function getAllowedOrigins(): string[] {
  const envOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  const combined = [...DEFAULT_ALLOWED_ORIGINS, ...envOrigins];
  if (siteUrl && !combined.includes(siteUrl)) {
    combined.push(siteUrl);
  }

  return combined;
}

/**
 * Kiểm tra xem Origin của request có thuộc danh sách hợp lệ không
 */
export function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  const allowed = getAllowedOrigins();
  return allowed.includes(origin);
}

/**
 * Các headers được phép trong request CORS
 */
export const CORS_ALLOWED_HEADERS = [
  "X-CSRF-Token",
  "X-Requested-With",
  "Accept",
  "Accept-Version",
  "Content-Length",
  "Content-MD5",
  "Content-Type",
  "Date",
  "X-Api-Version",
  "Authorization",
  "X-Tracking-Token",
  "X-Admin-Key",
  "X-Internal-Token",
  "X-Turnstile-Token",
].join(", ");

export const CORS_ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";

/**
 * Tạo tập hợp headers CORS bảo mật dựa trên request origin
 */
export function getCorsHeaders(origin: string | null | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": CORS_ALLOWED_METHODS,
    "Access-Control-Allow-Headers": CORS_ALLOWED_HEADERS,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };

  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else {
    // Mặc định fallback về domain chính thức nếu không khớp, tuyệt đối không trả về wildcard '*'
    headers["Access-Control-Allow-Origin"] = "https://bepque.vn";
  }

  return headers;
}
