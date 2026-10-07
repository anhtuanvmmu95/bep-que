import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getSupabaseClient } from "./supabase";

if (typeof window !== "undefined") {
  throw new Error(
    "Vi phạm bảo mật: orders-repository chỉ được phép chạy trên Server!"
  );
}

export interface StoredOrderItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  spicyNote?: string;
  sweetNote?: string;
  portion?: string;
  extras?: Array<{ name: string; price: number }>;
  specialNote?: string;
}

export interface StoredOrder {
  id: string;
  orderCode: string;
  trackingToken: string;
  recipientName: string;
  phone: string;
  email?: string;
  address: string;
  districtId: string;
  districtName: string;
  city: string;
  distanceKm: number;
  deliveryTimingType: "asap" | "scheduled";
  timing: string;
  deliveryNote?: string;
  paymentMethod: "cod" | "vietqr";
  paymentStatus: "PENDING" | "PAID";
  codChangeOption?: string;
  subtotalAmount: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  couponCode?: string;
  items: StoredOrderItem[];
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "PACKING" | "DELIVERING" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
  storageTarget: "local" | "supabase" | "both";
}

/**
 * Dữ liệu phản hồi theo nguyên tắc Least Privilege (Dữ liệu tối thiểu):
 * - Che giấu số điện thoại, địa chỉ chi tiết, họ tên người nhận
 * - Loại bỏ email cá nhân và ghi chú thanh toán nội bộ
 */
export interface SanitizedTrackingOrder {
  orderCode: string;
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "PACKING" | "DELIVERING" | "COMPLETED" | "CANCELLED";
  timing: string;
  deliveryTimingType: "asap" | "scheduled";
  recipientName: string;
  phone: string;
  address: string;
  districtName: string;
  city: string;
  items: StoredOrderItem[];
  subtotalAmount: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: "cod" | "vietqr";
  paymentStatus: "PENDING" | "PAID";
  createdAt: string;
  deliveryNote?: string;
}

export function maskPhone(phone: string): string {
  if (!phone) return "";
  const clean = phone.trim().replace(/\s+/g, "");
  if (clean.length <= 4) return "****";
  if (clean.length <= 7) return clean.slice(0, 2) + "****" + clean.slice(-1);
  return clean.slice(0, 4) + "****" + clean.slice(-2);
}

export function maskRecipientName(name: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    const word = parts[0];
    return word.length > 2 ? word.slice(0, 2) + "***" : word + "***";
  }
  return parts
    .map((p, i) => (i === 0 ? p : p[0] + "***"))
    .join(" ");
}

export function maskAddress(address: string): string {
  if (!address) return "***";
  return "*** (Số nhà & tên đường đã được ẩn)";
}

export function sanitizeOrderForTracking(order: StoredOrder): SanitizedTrackingOrder {
  return {
    orderCode: order.orderCode,
    status: order.status,
    timing: order.timing,
    deliveryTimingType: order.deliveryTimingType,
    recipientName: maskRecipientName(order.recipientName),
    phone: maskPhone(order.phone),
    address: maskAddress(order.address),
    districtName: order.districtName,
    city: order.city,
    items: order.items,
    subtotalAmount: order.subtotalAmount,
    shippingFee: order.shippingFee,
    discountAmount: order.discountAmount,
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    deliveryNote: order.deliveryNote,
  };
}

const DATA_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE_PATH = path.join(DATA_DIR, "orders.json");

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ORDERS_FILE_PATH)) {
    fs.writeFileSync(ORDERS_FILE_PATH, JSON.stringify([], null, 2), "utf8");
  }
}

// 1. Read all local orders
export function getLocalOrders(): StoredOrder[] {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(ORDERS_FILE_PATH, "utf8");
    const orders: StoredOrder[] = JSON.parse(raw);
    let dirty = false;
    for (const order of orders) {
      if (!order.trackingToken) {
        order.trackingToken = crypto.randomUUID();
        dirty = true;
      }
    }
    if (dirty) {
      fs.writeFileSync(ORDERS_FILE_PATH, JSON.stringify(orders, null, 2), "utf8");
    }
    return orders;
  } catch {
    return [];
  }
}

// 2. Save order to local JSON database
export function saveLocalOrder(order: StoredOrder): void {
  ensureDataFile();
  const orders = getLocalOrders();
  orders.unshift(order); // Newest first
  fs.writeFileSync(ORDERS_FILE_PATH, JSON.stringify(orders, null, 2), "utf8");
}

// 3. Sync to Google Sheets if GOOGLE_SHEETS_WEBHOOK_URL is set
async function syncToGoogleSheets(order: StoredOrder): Promise<boolean> {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) return false;

  try {
    const itemsSummary = order.items
      .map(
        (i) =>
          `${i.name} (x${i.quantity})${i.spicyNote ? ` [${i.spicyNote}]` : ""}`
      )
      .join("; ");

    const payload = {
      orderCode: order.orderCode,
      createdAt: order.createdAt,
      recipientName: order.recipientName,
      phone: order.phone,
      address: `${order.address}, ${order.districtName}, ${order.city}`,
      items: itemsSummary,
      subtotalAmount: order.subtotalAmount,
      shippingFee: order.shippingFee,
      discountAmount: order.discountAmount,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      timing: order.timing,
      deliveryNote: order.deliveryNote || "",
    };

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (err) {
    console.error("Lỗi đồng bộ Google Sheets webhook:", err);
    return false;
  }
}

// 4. Main save order pipeline (Supports Local + Supabase + Google Sheets)
export async function createOrder(
  orderInput: Omit<StoredOrder, "id" | "status" | "createdAt" | "updatedAt" | "storageTarget" | "trackingToken"> & {
    trackingToken?: string;
  }
): Promise<StoredOrder> {
  const now = new Date().toISOString();
  const id = `ord_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const trackingToken = orderInput.trackingToken || crypto.randomUUID();

  const order: StoredOrder = {
    ...orderInput,
    id,
    trackingToken,
    status: "PENDING",
    createdAt: now,
    updatedAt: now,
    storageTarget: "local",
  };

  // Always persist locally
  saveLocalOrder(order);

  // Sync to Supabase if credentials exist
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error: orderError } = await supabase.from("orders").insert([
        {
          id: order.id,
          order_code: order.orderCode,
          tracking_token: order.trackingToken,
          recipient_name: order.recipientName,
          recipient_phone: order.phone,
          shipping_address: `${order.address}, ${order.districtName}, ${order.city}`,
          subtotal_amount: order.subtotalAmount,
          shipping_fee: order.shippingFee,
          discount_amount: order.discountAmount,
          total_amount: order.totalAmount,
          payment_method: order.paymentMethod,
          payment_status: order.paymentStatus,
          order_status: order.status,
          customer_notes: order.deliveryNote,
          created_at: order.createdAt,
        },
      ]);

      if (!orderError) {
        order.storageTarget = "both";
      }
    } catch (sbErr) {
      console.warn("Supabase insert warning:", sbErr);
    }
  }

  // Trigger Google Sheets webhook in background
  syncToGoogleSheets(order).catch(() => {});

  return order;
}

// 5. Query order by tracking token
export async function getOrderByTrackingToken(token: string): Promise<StoredOrder | null> {
  if (!token || !token.trim()) return null;
  const cleanToken = token.trim().toLowerCase();
  const orders = getLocalOrders();
  const found = orders.find(
    (o) => o.trackingToken && o.trackingToken.toLowerCase() === cleanToken
  );
  if (found) return found;

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("tracking_token", token.trim())
        .single();
      if (data) {
        return {
          id: data.id,
          orderCode: data.order_code,
          trackingToken: data.tracking_token || token.trim(),
          recipientName: data.recipient_name,
          phone: data.recipient_phone,
          address: data.shipping_address,
          districtId: "",
          districtName: "",
          city: "",
          distanceKm: 0,
          deliveryTimingType: "asap",
          timing: "",
          paymentMethod: data.payment_method,
          paymentStatus: data.payment_status,
          subtotalAmount: data.subtotal_amount,
          shippingFee: data.shipping_fee,
          discountAmount: data.discount_amount,
          totalAmount: data.total_amount,
          items: [],
          status: data.order_status,
          createdAt: data.created_at,
          updatedAt: data.created_at,
          storageTarget: "supabase",
        };
      }
    } catch {
      // Fallback
    }
  }

  return null;
}

// 6. Query order by code
export async function getOrderByCode(orderCode: string): Promise<StoredOrder | null> {
  if (!orderCode || !orderCode.trim()) return null;
  const cleanCode = orderCode.trim().toLowerCase();
  const orders = getLocalOrders();
  const found = orders.find((o) => o.orderCode.toLowerCase() === cleanCode);
  if (found) return found;

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("order_code", orderCode.trim())
        .single();
      if (data) {
        return {
          id: data.id,
          orderCode: data.order_code,
          trackingToken: data.tracking_token || "",
          recipientName: data.recipient_name,
          phone: data.recipient_phone,
          address: data.shipping_address,
          districtId: "",
          districtName: "",
          city: "",
          distanceKm: 0,
          deliveryTimingType: "asap",
          timing: "",
          paymentMethod: data.payment_method,
          paymentStatus: data.payment_status,
          subtotalAmount: data.subtotal_amount,
          shippingFee: data.shipping_fee,
          discountAmount: data.discount_amount,
          totalAmount: data.total_amount,
          items: [],
          status: data.order_status,
          createdAt: data.created_at,
          updatedAt: data.created_at,
          storageTarget: "supabase",
        };
      }
    } catch {
      // Fallback
    }
  }

  return null;
}

// 7. Server-side authorization verification
export async function verifyOrderAccess(params: {
  code?: string | null;
  token?: string | null;
}): Promise<
  | { success: true; order: StoredOrder }
  | { success: false; status: 400 | 403 | 404; error: string }
> {
  const code = params.code?.trim();
  const token = params.token?.trim();

  if (!code && !token) {
    return {
      success: false,
      status: 400,
      error: "Vui lòng cung cấp mã đơn hàng hoặc mã token tra cứu.",
    };
  }

  // Case A: Tra cứu trực tiếp bằng token bí mật
  if (token && !code) {
    const order = await getOrderByTrackingToken(token);
    if (!order) {
      return {
        success: false,
        status: 404,
        error: "Không tìm thấy đơn hàng tương ứng với mã token tra cứu.",
      };
    }
    return { success: true, order };
  }

  // Case B: Tra cứu bằng code (hoặc code + token)
  if (code) {
    const order = await getOrderByCode(code);
    if (!order) {
      return {
        success: false,
        status: 404,
        error: "Không tìm thấy đơn hàng với mã tra cứu này.",
      };
    }

    // BẮT BUỘC: Server-side authorization check để ngăn chặn IDOR
    if (!token) {
      return {
        success: false,
        status: 403,
        error: "Truy cập bị từ chối: Cần có mã token tra cứu hợp lệ để xem chi tiết đơn hàng.",
      };
    }

    if (
      !order.trackingToken ||
      order.trackingToken.toLowerCase() !== token.toLowerCase()
    ) {
      return {
        success: false,
        status: 403,
        error: "Truy cập bị từ chối: Mã token tra cứu không khớp với đơn hàng.",
      };
    }

    return { success: true, order };
  }

  return {
    success: false,
    status: 400,
    error: "Yêu cầu không hợp lệ.",
  };
}

// 8. Cập nhật trạng thái đơn hàng từ luồng nghiệp vụ nội bộ / Webhook đã xác thực
export async function updateOrderInternal(
  orderCode: string,
  updates: {
    status?: StoredOrder["status"];
    paymentStatus?: StoredOrder["paymentStatus"];
  }
): Promise<StoredOrder | null> {
  const cleanCode = orderCode.trim().toLowerCase();
  ensureDataFile();
  const orders = getLocalOrders();
  const index = orders.findIndex((o) => o.orderCode.toLowerCase() === cleanCode);
  if (index === -1) return null;

  const current = orders[index];
  const updatedOrder: StoredOrder = {
    ...current,
    ...(updates.status ? { status: updates.status } : {}),
    ...(updates.paymentStatus ? { paymentStatus: updates.paymentStatus } : {}),
    updatedAt: new Date().toISOString(),
  };

  orders[index] = updatedOrder;
  fs.writeFileSync(ORDERS_FILE_PATH, JSON.stringify(orders, null, 2), "utf8");

  // Sync to Supabase if available
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from("orders")
        .update({
          ...(updates.status ? { order_status: updates.status } : {}),
          ...(updates.paymentStatus ? { payment_status: updates.paymentStatus } : {}),
          updated_at: updatedOrder.updatedAt,
        })
        .eq("order_code", orderCode);
    } catch {
      // Fallback
    }
  }

  return updatedOrder;
}

// 9. Xác thực chữ ký số HMAC-SHA256 cho Webhook thanh toán (tránh giả mạo trạng thái)
export function verifyWebhookSignature(
  payloadString: string,
  providedSignature: string | null,
  secret: string
): boolean {
  if (!providedSignature || !secret) return false;
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadString)
      .digest("hex");

    const cleanProvided = providedSignature.trim().toLowerCase();
    const providedBuffer = Buffer.from(cleanProvided, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature.toLowerCase(), "utf8");

    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

