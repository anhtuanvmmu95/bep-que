import { NextRequest, NextResponse } from "next/server";
import { FoodSearchQuerySchema } from "@/lib/validations/schemas";
import { queryFoods } from "@/lib/db/foods-repository";
import {
  checkRateLimit,
  createRateLimitResponse,
} from "@/lib/security/rate-limit";
import { isHoneypotTriggered } from "@/lib/security/honeypot";

/**
 * GET /api/foods - Tìm kiếm món ăn và lọc danh mục an toàn:
 * 1. Rate Limiting: Tối đa 20 requests / phút / IP.
 * 2. Honeypot Detection: Chặn bot crawler / scraper điền trường ẩn.
 * 3. Validate & Sanitize input qua Zod (chặn SQLi, XSS, query string quá dài).
 * 4. 100% Parameterized query qua Supabase ORM hoặc Local Repository an toàn.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Rate Limiting cho Search Endpoint (Tối đa 20 requests / phút / IP)
    const rateLimitResult = await checkRateLimit(req, "search");
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const { searchParams } = new URL(req.url);

    // 2. Kiểm tra Honeypot cho Search Crawler
    const honeypotVal =
      searchParams.get("hp_field") ||
      searchParams.get("website") ||
      searchParams.get("bepque_hp_token");

    if (isHoneypotTriggered(honeypotVal)) {
      return NextResponse.json(
        {
          success: false,
          error: "Yêu cầu tìm kiếm bị từ chối: Phát hiện bot tự động (Honeypot).",
        },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    // 3. Chuyển searchParams thành object để Zod validate
    const rawParams = {
      q: searchParams.get("q") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      hp_field: searchParams.get("hp_field") ?? undefined,
      bepque_hp_token: searchParams.get("bepque_hp_token") ?? undefined,
      website: searchParams.get("website") ?? undefined,
    };

    const parseResult = FoodSearchQuerySchema.safeParse(rawParams);

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
            "Dữ liệu tìm kiếm không hợp lệ",
          details: errorDetails,
        },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    // 4. Thực hiện truy vấn tham số hóa an toàn
    const data = await queryFoods(parseResult.data);

    return NextResponse.json(
      {
        success: true,
        ...data,
      },
      { headers: rateLimitResult.headers }
    );
  } catch (error: unknown) {
    console.error("Foods search API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Lỗi hệ thống khi tìm kiếm món ăn",
      },
      { status: 500 }
    );
  }
}
