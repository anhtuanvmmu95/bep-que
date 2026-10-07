import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  createOrder,
  getLocalOrders,
  verifyOrderAccess,
  sanitizeOrderForTracking,
  updateOrderInternal,
  verifyWebhookSignature,
  StoredOrderItem,
  StoredOrder,
} from "@/lib/db/orders-repository";
import { DISTRICTS_DATA, calculateShippingFee } from "@/lib/data/districts";
import {
  calculateAuthoritativeItem,
  AuthoritativeItemInput,
} from "@/lib/data/pricing";
import {
  CreateOrderSchema,
  OrderTrackingQuerySchema,
  OrderStatusUpdateSchema,
} from "@/lib/validations/schemas";
import {
  checkRateLimit,
  createRateLimitResponse,
} from "@/lib/security/rate-limit";
import { isHoneypotTriggered } from "@/lib/security/honeypot";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import {
  setSecureCookie,
  getSecureCookie,
  COOKIE_NAMES,
} from "@/lib/security/cookie";

const WEBHOOK_SECRET =
  process.env.PAYMENT_WEBHOOK_SECRET ||
  process.env.WEBHOOK_SECRET ||
  "bepque_payment_webhook_secret_key_2026";

const ADMIN_SECRET =
  process.env.ADMIN_API_KEY ||
  process.env.INTERNAL_API_SECRET ||
  "bepque_internal_secret_key_2026";

/**
 * POST /api/orders - Tạo đơn hàng mới theo nguyên tắc ZERO TRUST CLIENT:
 * 1. Validate & Sanitize chặt chẽ mọi trường đầu vào thông qua Zod schema.
 * 2. Tuyệt đối KHÔNG nhận giá tiền, chiết khấu, tổng tiền từ client.
 * 3. Backend tự truy vấn giá gốc từ catalog/database, tự tính toán giá từng món,
 *    phí vận chuyển, logic giảm giá và tổng tiền cuối cùng.
 * 4. Trạng thái đơn hàng luôn bị ép buộc là "PENDING", client không thể can thiệp.
 */
export async function POST(req: NextRequest) {
  try {
    // 0. Rate limiting cho tạo đơn hàng
    const rateLimitResult = await checkRateLimit(req, "order_create");
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const rawBody = await req.json();

    // 0.1. Honeypot check
    if (
      isHoneypotTriggered(
        rawBody.bepque_hp_token || rawBody.website || rawBody.hp_field
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Yêu cầu đặt hàng bị từ chối: Phát hiện bot tự động (Honeypot).",
        },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    // 0.2. Optional Turnstile check nếu được gửi kèm
    if (rawBody.turnstileToken) {
      const turnstileCheck = await verifyTurnstileToken(
        rawBody.turnstileToken,
        rateLimitResult.ip
      );
      if (!turnstileCheck.success) {
        return NextResponse.json(
          {
            success: false,
            error:
              turnstileCheck.error ||
              "Xác thực chống bot không thành công.",
          },
          { status: 400, headers: rateLimitResult.headers }
        );
      }
    }

    // 1. Zod Validation & Input Sanitization
    const parseResult = CreateOrderSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const firstError =
        parseResult.error.issues[0]?.message || "Dữ liệu đơn hàng không hợp lệ";
      return NextResponse.json(
        {
          success: false,
          error: firstError,
          details: parseResult.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    const {
      fullName,
      phoneNumber,
      email,
      addressLine,
      districtId,
      deliveryTimingType,
      scheduledSlot,
      deliveryNote,
      paymentMethod,
      codChangeOption,
      items,
      couponCode,
    } = parseResult.data;

    // 2. Validate Quận/Huyện giao hàng
    const district = DISTRICTS_DATA.find((d) => d.id === districtId);
    if (!district) {
      return NextResponse.json(
        { success: false, error: "Quận/Huyện không hợp lệ" },
        { status: 400 }
      );
    }

    // 3. ZERO TRUST: Tự truy vấn giá gốc và tính toán toàn bộ giá tiền trên Server
    const formattedItems: StoredOrderItem[] = [];
    let subtotalAmount = 0;

    for (let i = 0; i < items.length; i++) {
      const rawItem = items[i] as AuthoritativeItemInput;
      const itemResult = calculateAuthoritativeItem(rawItem);

      if (!itemResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: `Lỗi tính giá món thứ ${i + 1}: ${itemResult.error}`,
          },
          { status: 400 }
        );
      }

      const calculated = itemResult.item;
      formattedItems.push({
        productId: calculated.productId,
        name: calculated.name,
        unitPrice: calculated.unitPrice, // Đơn giá gốc + phụ thu tính bởi Backend
        quantity: calculated.quantity,
        subtotal: calculated.subtotal,
        spicyNote: calculated.spicyNote,
        sweetNote: calculated.sweetNote,
        portion: calculated.portion,
        extras: calculated.extras,
        specialNote: calculated.specialNote,
      });

      subtotalAmount += calculated.subtotal;
    }

    // 4. ZERO TRUST: Server tự tính toán phí vận chuyển & chiết khấu voucher
    const shippingCalc = calculateShippingFee(
      subtotalAmount,
      district,
      couponCode
    );

    let discountAmount = 0;
    if (couponCode === "BEPQUE20") {
      if (subtotalAmount >= 100000) {
        discountAmount = 20000;
      }
    }

    // Tổng tiền thanh toán chuẩn xác do Server kết luận
    const totalAmount = Math.max(
      0,
      subtotalAmount + shippingCalc.fee - discountAmount
    );

    // 5. Sinh mã đơn hàng và token tra cứu bảo mật cao (UUIDv4)
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(now.getDate()).padStart(2, "0")}`;
    const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    const orderCode = `BQ-${dateStr}-${randomSuffix}`;
    const trackingToken = crypto.randomUUID();

    const timing =
      deliveryTimingType === "asap"
        ? `Giao ngay (ước tính ${district.estimatedMinutes})`
        : String(scheduledSlot || "Bữa trưa hôm nay");

    // 6. Lưu trữ đơn hàng với trạng thái khởi tạo luôn là "PENDING"
    // Client tuyệt đối không thể ép trạng thái thành 'PAID' khi tạo đơn
    const savedOrder = await createOrder({
      orderCode,
      trackingToken,
      recipientName: fullName.trim(),
      phone: phoneNumber.trim(),
      email: email ? String(email).trim() : undefined,
      address: addressLine.trim(),
      districtId: district.id,
      districtName: district.name,
      city: district.city,
      distanceKm: district.distanceKm,
      deliveryTimingType: deliveryTimingType === "scheduled" ? "scheduled" : "asap",
      timing,
      deliveryNote: deliveryNote ? String(deliveryNote).trim() : undefined,
      paymentMethod: paymentMethod === "vietqr" ? "vietqr" : "cod",
      paymentStatus: "PENDING", // Ép buộc PENDING
      codChangeOption: paymentMethod === "cod" ? codChangeOption : undefined,
      subtotalAmount,
      shippingFee: shippingCalc.fee,
      discountAmount,
      totalAmount,
      couponCode,
      items: formattedItems,
    });

    const response = NextResponse.json(
      {
        success: true,
        order: savedOrder,
        trackingToken: savedOrder.trackingToken,
        message: "Đặt mâm cơm thành công! Bếp đang chuẩn bị niêu đất.",
      },
      { status: 201, headers: rateLimitResult.headers }
    );

    // Thiết lập Cookie phiên bảo mật nhận diện đơn hàng (HttpOnly, Secure, SameSite=Lax)
    setSecureCookie(
      response,
      COOKIE_NAMES.CUSTOMER_SESSION,
      JSON.stringify({
        orderCode: savedOrder.orderCode,
        trackingToken: savedOrder.trackingToken,
        createdAt: Date.now(),
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      }
    );

    return response;
  } catch (error: unknown) {
    console.error("Order creation API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Lỗi hệ thống khi tạo đơn hàng. Vui lòng thử lại sau.",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders - Tra cứu đơn hàng được bảo vệ chống IDOR & Zod validation
 */
export async function GET(req: NextRequest) {
  // 0. Rate limiting cho Endpoint Tra cứu đơn hàng (Tối đa 20 requests / phút / IP)
  const rateLimitResult = await checkRateLimit(req, "tracking");
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  const { searchParams } = new URL(req.url);

  // 0.1. Kiểm tra Honeypot cho tra cứu đơn hàng
  const honeypotVal =
    searchParams.get("hp_field") ||
    searchParams.get("website") ||
    searchParams.get("bepque_hp_token");

  if (isHoneypotTriggered(honeypotVal)) {
    return NextResponse.json(
      {
        success: false,
        error: "Yêu cầu tra cứu bị từ chối: Phát hiện bot tự động (Honeypot).",
      },
      { status: 400, headers: rateLimitResult.headers }
    );
  }

  // 0.2. Xác thực Cloudflare Turnstile nếu có token gửi kèm
  const turnstileToken =
    searchParams.get("turnstileToken") ||
    req.headers.get("x-turnstile-token");

  if (turnstileToken) {
    const turnstileCheck = await verifyTurnstileToken(
      turnstileToken,
      rateLimitResult.ip
    );
    if (!turnstileCheck.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            turnstileCheck.error ||
            "Xác thực chống bot Cloudflare Turnstile thất bại.",
        },
        { status: 400, headers: rateLimitResult.headers }
      );
    }
  }

  // 1. Zod Validation cho Query Params
  const queryParse = OrderTrackingQuerySchema.safeParse({
    code: searchParams.get("code") || searchParams.get("id") || undefined,
    token: searchParams.get("token") || undefined,
    hp_field: searchParams.get("hp_field") || undefined,
    bepque_hp_token: searchParams.get("bepque_hp_token") || undefined,
    website: searchParams.get("website") || undefined,
    turnstileToken: searchParams.get("turnstileToken") || undefined,
  });

  if (!queryParse.success) {
    return NextResponse.json(
      {
        success: false,
        error: queryParse.error.issues[0]?.message || "Tham số tra cứu không hợp lệ",
      },
      { status: 400, headers: rateLimitResult.headers }
    );
  }

  let { code } = queryParse.data;
  let token =
    queryParse.data.token ||
    req.headers.get("x-tracking-token") ||
    (req.headers.get("authorization")?.startsWith("Bearer ")
      ? req.headers.get("authorization")?.substring(7).trim()
      : null);

  // 1.1. Tự động nhận diện phiên người dùng qua Secure Cookie (HttpOnly, Secure, SameSite=Lax)
  // Nếu client không chỉ định token trực tiếp trên URL hoặc Header
  const sessionCookie = getSecureCookie(req, COOKIE_NAMES.CUSTOMER_SESSION);
  if (sessionCookie) {
    try {
      const sessionData = JSON.parse(sessionCookie);
      if (sessionData && sessionData.trackingToken) {
        if (code && sessionData.orderCode === code) {
          token = sessionData.trackingToken;
        } else if (!code && !token && sessionData.orderCode) {
          code = sessionData.orderCode;
          token = sessionData.trackingToken;
        }
      }
    } catch {
      // Bỏ qua nếu cookie hỏng
    }
  }

  // 2. Kiểm tra yêu cầu tra cứu đơn hàng cá nhân
  if (code || token) {
    const authResult = await verifyOrderAccess({ code, token });
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status, headers: rateLimitResult.headers }
      );
    }

    const sanitizedOrder = sanitizeOrderForTracking(authResult.order);
    return NextResponse.json(
      { success: true, order: sanitizedOrder },
      { headers: rateLimitResult.headers }
    );
  }

  // 3. Chặn rò rỉ toàn bộ danh sách đơn hàng nếu không có quyền admin
  const adminHeader = req.headers.get("x-admin-key");
  if (!ADMIN_SECRET || adminHeader !== ADMIN_SECRET) {
    return NextResponse.json(
      {
        success: false,
        error: "Truy cập bị từ chối: Yêu cầu mã token tra cứu hoặc quyền quản trị để truy cập dữ liệu.",
      },
      { status: 403 }
    );
  }

  const allOrders = getLocalOrders();
  return NextResponse.json({
    success: true,
    total: allOrders.length,
    orders: allOrders,
  });
}

/**
 * Xử lý cập nhật trạng thái đơn hàng (PATCH / PUT) tuân thủ Zero Trust & Zod:
 * - CẤM nhận trạng thái tùy ý từ client thông thường.
 * - Chỉ chấp nhận cập nhật trạng thái qua Webhook thanh toán có chữ ký HMAC hợp lệ
 *   hoặc Internal staff/admin token.
 */
async function handleOrderStatusUpdate(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let parsedJson: unknown;

    try {
      parsedJson = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: "Định dạng JSON không hợp lệ" },
        { status: 400 }
      );
    }

    // 1. Zod Validation cho dữ liệu cập nhật
    const updateParse = OrderStatusUpdateSchema.safeParse(parsedJson);
    if (!updateParse.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            updateParse.error.issues[0]?.message ||
            "Dữ liệu cập nhật trạng thái không hợp lệ",
          details: updateParse.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { orderCode, status, paymentStatus } = updateParse.data;

    if (!status && !paymentStatus) {
      return NextResponse.json(
        {
          success: false,
          error: "Vui lòng cung cấp trạng thái cần cập nhật (status hoặc paymentStatus)",
        },
        { status: 400 }
      );
    }

    // 2. Xác thực nguồn cập nhật (Zero Trust Client)
    const webhookSignature =
      req.headers.get("x-signature") ||
      req.headers.get("x-webhook-signature");
    const internalSecret = req.headers.get("x-internal-secret");
    const adminKey = req.headers.get("x-admin-key");

    let isAuthorized = false;
    let authSource = "";

    // A. Kiểm tra chữ ký Webhook (HMAC-SHA256)
    if (webhookSignature) {
      const isValidSig = verifyWebhookSignature(
        rawBody,
        webhookSignature,
        WEBHOOK_SECRET
      );
      if (isValidSig) {
        isAuthorized = true;
        authSource = "webhook";
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "Chữ ký webhook không hợp lệ (Signature verification failed).",
          },
          { status: 401 }
        );
      }
    }

    // B. Kiểm tra quyền nội bộ Admin / Staff
    if (!isAuthorized && (internalSecret || adminKey)) {
      if (
        (internalSecret && internalSecret === ADMIN_SECRET) ||
        (adminKey && adminKey === ADMIN_SECRET)
      ) {
        isAuthorized = true;
        authSource = "internal";
      }
    }

    // C. Bị từ chối nếu không có chữ ký webhook hoặc quyền nội bộ
    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Truy cập bị từ chối: Client không được phép tự ý cập nhật trạng thái đơn hàng. Yêu cầu webhook có chữ ký số hợp lệ hoặc quyền nội bộ.",
        },
        { status: 403 }
      );
    }

    // 3. Thực hiện cập nhật trạng thái vào cơ sở dữ liệu qua parameterized method
    const updated = await updateOrderInternal(orderCode, {
      status,
      paymentStatus,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: `Không tìm thấy đơn hàng: ${orderCode}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Cập nhật trạng thái đơn hàng thành công qua ${authSource}`,
      orderCode: updated.orderCode,
      status: updated.status,
      paymentStatus: updated.paymentStatus,
      updatedAt: updated.updatedAt,
    });
  } catch (error: unknown) {
    console.error("Order status update API error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi hệ thống khi cập nhật trạng thái đơn hàng" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  return handleOrderStatusUpdate(req);
}

export async function PUT(req: NextRequest) {
  return handleOrderStatusUpdate(req);
}
