import { NextRequest, NextResponse } from "next/server";
import { NewsletterSubscribeSchema } from "@/lib/validations/schemas";
import { saveNewsletterSubscriber } from "@/lib/db/newsletter-repository";
import {
  checkRateLimit,
  createRateLimitResponse,
} from "@/lib/security/rate-limit";
import { isHoneypotTriggered } from "@/lib/security/honeypot";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

/**
 * POST /api/newsletter - Đăng ký email nhận bản tin / ưu đãi:
 * 1. Rate Limiting: Tối đa 5 requests / phút / IP.
 * 2. Honeypot Field: Kiểm tra input ẩn, drop request ngay nếu bot điền dữ liệu.
 * 3. Cloudflare Turnstile: Xác thực bot challenge server-side.
 * 4. Zod & RFC 5322: Validate nghiêm ngặt cú pháp email theo RFC 5322 & RFC 5321.
 * 5. Parameterized Query: Lưu trữ an toàn, chống SQL Injection.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Áp dụng Rate Limiting cho Form Email (Tối đa 5 request / phút / IP)
    const rateLimitResult = await checkRateLimit(req, "email");
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Định dạng JSON không hợp lệ" },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    // 2. Kiểm tra bẫy bot (Honeypot Field)
    const honeypotValue =
      body.bepque_hp_token || body.website || body.hp_field;
    if (isHoneypotTriggered(honeypotValue)) {
      return NextResponse.json(
        {
          success: false,
          error: "Yêu cầu bị từ chối: Phát hiện bot tự động điền form (Honeypot).",
        },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    // 3. Validate Zod & Kiểm tra cú pháp Email chuẩn RFC 5322
    const parseResult = NewsletterSubscribeSchema.safeParse(body);
    if (!parseResult.success) {
      const errorDetails = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return NextResponse.json(
        {
          success: false,
          error:
            parseResult.error.issues[0]?.message ||
            "Địa chỉ email không đúng chuẩn RFC 5322 (Ví dụ: ten@bepque.vn)",
          details: errorDetails,
        },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    const { email, turnstileToken } = parseResult.data;

    // 4. Xác thực Cloudflare Turnstile Server-Side
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

    // 5. Lưu vào cơ sở dữ liệu qua parameterized query
    const result = await saveNewsletterSubscriber(email);

    return NextResponse.json(
      {
        success: true,
        message: result.isNew
          ? "Đăng ký thành công! Mã ưu đãi BEPQUE20 (giảm 20.000đ) đã sẵn sàng cho bạn."
          : "Email này đã được đăng ký trước đó. Mã BEPQUE20 vẫn có hiệu lực cho bạn!",
        email: result.subscriber.email,
      },
      { status: 201, headers: rateLimitResult.headers }
    );
  } catch (error: unknown) {
    console.error("Newsletter subscription error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Lỗi hệ thống khi đăng ký nhận tin. Vui lòng thử lại sau.",
      },
      { status: 500 }
    );
  }
}
