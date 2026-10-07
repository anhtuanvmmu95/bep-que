import DOMPurify from "isomorphic-dompurify";

/**
 * 1. Hàm làm sạch HTML động sử dụng DOMPurify (Chống Stored XSS & Reflected XSS)
 * - Tự động loại bỏ thẻ <script>, các thuộc tính sự kiện inline (onload, onerror, onclick...)
 * - Ngăn chặn giao thức nguy hiểm (javascript:, vbscript:, data:...)
 */
export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== "string") return "";

  return DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: [
      "b",
      "i",
      "em",
      "strong",
      "a",
      "p",
      "br",
      "span",
      "ul",
      "ol",
      "li",
      "code",
      "pre",
      "blockquote",
    ],
    ALLOWED_ATTR: ["href", "title", "target", "rel", "class"],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["target"], // Mặc định mở tab an toàn nếu có link
  });
}

/**
 * 2. Contextual Output Encoding: Mã hóa ký tự đặc biệt thành HTML entities
 * Dùng khi cần xuất dữ liệu người dùng ra context HTML an toàn
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 3. Kiểm tra và làm sạch URL an toàn (Chống javascript: URI XSS)
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== "string") return "/";
  const trimmed = url.trim();

  // Chặn tuyệt đối javascript:, vbscript:, data:
  const dangerousProtocols = /^(javascript:|vbscript:|data:)/i;
  if (dangerousProtocols.test(trimmed)) {
    return "#";
  }

  return trimmed;
}
