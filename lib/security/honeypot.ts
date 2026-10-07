/**
 * lib/security/honeypot.ts
 * Kỹ thuật bẫy bot (Honeypot Field):
 * Trường nhập liệu ẩn đối với người dùng thông thường nhưng bot tự động quét và điền dữ liệu.
 * Nếu trường honeypot chứa bất kỳ giá trị nào -> Đánh dấu bot và từ chối xử lý ngay lập tức.
 */

export const HONEYPOT_FIELD_NAME = "bepque_hp_token";
export const ALTERNATIVE_HONEYPOT_NAME = "website";

/**
 * Kiểm tra xem trường honeypot có bị bot điền hay không.
 * @param value Giá trị nhận được từ body hoặc query params
 * @returns true nếu phát hiện bot (giá trị không rỗng), false nếu là người dùng thật
 */
export function isHoneypotTriggered(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return true;
}
