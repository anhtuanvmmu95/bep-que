import { NextRequest, NextResponse } from "next/server";
import {
  updateOrderInternal,
  verifyWebhookSignature,
} from "@/lib/db/orders-repository";

const WEBHOOK_SECRET =
  process.env.PAYMENT_WEBHOOK_SECRET ||
  process.env.WEBHOOK_SECRET ||
  "bepque_payment_webhook_secret_key_2026";

/**
 * Webhook thanh toán bảo mật với kiểm tra chữ ký HMAC-SHA256:
 * Chỉ cho phép cập nhật paymentStatus và status khi có chữ ký số hợp lệ.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("x-signature") ||
      req.headers.get("x-webhook-signature");

    if (!signature) {
      return NextResponse.json(
        {
          success: false,
          error: "Thiếu chữ ký số webhook (Missing x-signature header)",
        },
        { status: 401 }
      );
    }

    const isValid = verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET);
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Chữ ký số webhook không hợp lệ (Signature verification failed)",
        },
        { status: 401 }
      );
    }

    let payload: {
      orderCode?: string;
      paymentStatus?: "PENDING" | "PAID";
      status?: "CONFIRMED" | "PREPARING" | "PACKING" | "DELIVERING" | "COMPLETED" | "CANCELLED";
    };

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: "Định dạng JSON không hợp lệ" },
        { status: 400 }
      );
    }

    const { orderCode, paymentStatus, status } = payload;

    if (!orderCode) {
      return NextResponse.json(
        { success: false, error: "Thiếu mã đơn hàng (orderCode)" },
        { status: 400 }
      );
    }

    const updated = await updateOrderInternal(orderCode, {
      status: status || "CONFIRMED",
      paymentStatus: paymentStatus || "PAID",
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy đơn hàng" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Webhook thanh toán xác nhận thành công",
      orderCode: updated.orderCode,
      status: updated.status,
      paymentStatus: updated.paymentStatus,
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi xử lý webhook" },
      { status: 500 }
    );
  }
}
