import { z } from "zod";
import { sanitizeHtml } from "@/lib/security/sanitize";

/**
 * Chuẩn biểu thức chính quy kiểm tra định dạng email theo tiêu chuẩn RFC 5322 & RFC 5321:
 * - Local-part: 1-64 ký tự, cho phép chữ cái, chữ số và các ký tự đặc biệt !#$%&'*+/=?^_`{|}~-
 *   Không cho phép dấu chấm ở đầu/cuối hoặc 2 dấu chấm liên tiếp (..).
 * - Domain-part: Các nhãn tên miền phân tách bằng dấu chấm đơn, nhãn không được bắt đầu/kết thúc bằng dấu gạch ngang (-).
 * - TLD (Tên miền cấp cao nhất): Tối thiểu 2 ký tự chữ cái (ví dụ: .vn, .com, .org).
 * - Tổng độ dài tối đa: 254 ký tự theo RFC 5321.
 */
export const RFC_5322_EMAIL_REGEX =
  /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;

/**
 * Hàm kiểm tra cú pháp email nghiêm ngặt theo chuẩn RFC 5322 & RFC 5321
 */
export function isValidRfc5322Email(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;

  const parts = trimmed.split("@");
  if (parts.length !== 2) return false;

  const [localPart, domainPart] = parts;
  if (!localPart || localPart.length > 64) return false;
  if (!domainPart || domainPart.length > 253) return false;

  // Không cho phép dấu chấm liên tiếp trong local hoặc domain
  if (localPart.includes("..") || domainPart.includes("..")) return false;

  return RFC_5322_EMAIL_REGEX.test(trimmed);
}

/**
 * 1. Schema cho Tìm kiếm món ăn và Lọc danh mục (Food Search & Category Filter)
 * - Giới hạn độ dài, kiểm tra kiểu dữ liệu, làm sạch (sanitize) chuỗi đầu vào
 * - Hỗ trợ honeypot field và turnstileToken
 */
export const FoodSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100, "Từ khóa tìm kiếm không được vượt quá 100 ký tự")
    .optional()
    .default("")
    .transform((val) => sanitizeHtml(val).replace(/[\x00\x08\x09\x1a\n\r"';\\]/g, "").trim()),
  category: z
    .string()
    .trim()
    .max(50, "Tên danh mục không được vượt quá 50 ký tự")
    .optional()
    .default("Tất cả"),
  sortBy: z
    .enum(["default", "price-asc", "price-desc", "rating"])
    .optional()
    .default("default"),
  page: z
    .coerce
    .number()
    .int("Trang phải là số nguyên")
    .min(1, "Trang tối thiểu là 1")
    .optional()
    .default(1),
  limit: z
    .coerce
    .number()
    .int("Số lượng mỗi trang phải là số nguyên")
    .min(1, "Số lượng tối thiểu là 1")
    .max(100, "Số lượng tối đa là 100")
    .optional()
    .default(20),
  // Honeypot fields cho bot prevention
  hp_field: z.string().trim().optional(),
  bepque_hp_token: z.string().trim().optional(),
  website: z.string().trim().optional(),
  turnstileToken: z.string().trim().optional(),
});

export type FoodSearchQuery = z.infer<typeof FoodSearchQuerySchema>;

/**
 * 2. Schema cho Biểu mẫu Lưu Email / Newsletter Subscription
 * - Kiểm tra định dạng email chuẩn RFC 5322 nghiêm ngặt
 * - Hỗ trợ trường bẫy bot (Honeypot) và Cloudflare Turnstile token
 */
export const NewsletterSubscribeSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập địa chỉ email")
    .max(254, "Địa chỉ email không được vượt quá 254 ký tự")
    .toLowerCase()
    .refine((val) => isValidRfc5322Email(val), {
      message: "Địa chỉ email không đúng chuẩn RFC 5322 (Ví dụ: ten@bepque.vn)",
    })
    .transform((val) => val.replace(/[\x00\n\r"';\\]/g, "")),
  // Cloudflare Turnstile Token
  turnstileToken: z.string().trim().optional(),
  // Honeypot fields
  bepque_hp_token: z.string().trim().optional(),
  website: z.string().trim().optional(),
  hp_field: z.string().trim().optional(),
});

export type NewsletterSubscribeInput = z.infer<typeof NewsletterSubscribeSchema>;

/**
 * 3. Schema cho Tạo đơn hàng (Create Order Schema - Zero Trust & XSS Protection)
 */
const OrderItemInputSchema = z.object({
  productId: z
    .string()
    .trim()
    .min(1, "Mã món ăn không được để trống")
    .max(100, "Mã món ăn không được vượt quá 100 ký tự"),
  quantity: z
    .coerce
    .number()
    .int("Số lượng phải là số nguyên")
    .min(1, "Số lượng mỗi món ăn tối thiểu là 1")
    .max(99, "Số lượng tối đa 99 phần"),
  portion: z.string().trim().max(100).optional(),
  extras: z
    .array(
      z.object({
        name: z.string().trim().max(100),
      })
    )
    .optional(),
  spicyNote: z.string().trim().max(100).optional(),
  sweetNote: z.string().trim().max(100).optional(),
  specialNote: z
    .string()
    .trim()
    .max(255)
    .optional()
    .transform((val) => (val ? sanitizeHtml(val).trim() : undefined)),
});

export const CreateOrderSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Họ và tên người nhận phải có ít nhất 2 ký tự")
    .max(100, "Họ và tên người nhận không được quá 100 ký tự")
    .transform((val) => sanitizeHtml(val).replace(/[\x00\n\r"';\\]/g, "").trim()),
  phoneNumber: z
    .string()
    .trim()
    .regex(
      /^(0|\+84)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7}$/,
      "Số điện thoại không đúng định dạng di động Việt Nam (Ví dụ: 0912345678)"
    ),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .optional()
    .or(z.literal(""))
    .refine((val) => !val || isValidRfc5322Email(val), {
      message: "Địa chỉ email không đúng chuẩn RFC 5322",
    })
    .transform((val) => (val ? val.replace(/[\x00\n\r"';\\]/g, "") : undefined)),
  addressLine: z
    .string()
    .trim()
    .min(5, "Địa chỉ giao hàng phải có ít nhất 5 ký tự")
    .max(300, "Địa chỉ giao hàng không được vượt quá 300 ký tự")
    .transform((val) => sanitizeHtml(val).replace(/[\x00\n\r"';\\]/g, "").trim()),
  districtId: z
    .string()
    .trim()
    .min(1, "Vui lòng chọn Quận/Huyện")
    .max(50),
  deliveryTimingType: z.enum(["asap", "scheduled"]).optional().default("asap"),
  scheduledSlot: z.string().trim().max(100).optional(),
  deliveryNote: z
    .string()
    .trim()
    .max(500, "Ghi chú giao hàng không được quá 500 ký tự")
    .optional()
    .transform((val) => (val ? sanitizeHtml(val).replace(/[\x00\n\r\\]/g, "").trim() : undefined)),
  paymentMethod: z.enum(["cod", "vietqr"]).optional().default("cod"),
  codChangeOption: z.string().trim().max(100).optional(),
  couponCode: z
    .string()
    .trim()
    .max(30, "Mã giảm giá không quá 30 ký tự")
    .regex(/^[A-Za-z0-9_-]*$/, "Mã giảm giá chỉ chứa chữ cái và số")
    .optional()
    .transform((val) => (val ? val.toUpperCase() : undefined)),
  items: z
    .array(OrderItemInputSchema)
    .min(1, "Mâm cơm của bạn chưa có món ăn nào"),
  // Honeypot fields & Turnstile
  bepque_hp_token: z.string().trim().optional(),
  website: z.string().trim().optional(),
  hp_field: z.string().trim().optional(),
  turnstileToken: z.string().trim().optional(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

/**
 * 4. Schema cho Tra cứu đơn hàng (Order Tracking Query Schema)
 */
export const OrderTrackingQuerySchema = z.object({
  code: z
    .string()
    .trim()
    .max(50, "Mã đơn hàng không được quá 50 ký tự")
    .regex(/^[A-Za-z0-9_-]*$/, "Mã đơn hàng chỉ chứa chữ cái, số và dấu gạch")
    .optional()
    .transform((v) => v || undefined),
  token: z
    .string()
    .trim()
    .max(100, "Token tra cứu không được quá 100 ký tự")
    .optional()
    .transform((v) => v || undefined),
  // Honeypot & Turnstile
  bepque_hp_token: z.string().trim().optional(),
  website: z.string().trim().optional(),
  hp_field: z.string().trim().optional(),
  turnstileToken: z.string().trim().optional(),
});

export type OrderTrackingQuery = z.infer<typeof OrderTrackingQuerySchema>;

/**
 * 5. Schema cho Cập nhật trạng thái đơn hàng (Order Status Update Schema)
 */
export const OrderStatusUpdateSchema = z.object({
  orderCode: z
    .string()
    .trim()
    .min(1, "Mã đơn hàng không được để trống")
    .max(50, "Mã đơn hàng tối đa 50 ký tự")
    .regex(/^[A-Za-z0-9_-]+$/, "Mã đơn hàng chỉ chứa chữ cái, số và dấu gạch"),
  status: z
    .enum([
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "PACKING",
      "DELIVERING",
      "COMPLETED",
      "CANCELLED",
    ])
    .optional(),
  paymentStatus: z.enum(["PENDING", "PAID"]).optional(),
});

export type OrderStatusUpdateInput = z.infer<typeof OrderStatusUpdateSchema>;
