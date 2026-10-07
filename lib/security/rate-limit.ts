import { NextRequest, NextResponse } from "next/server";

/**
 * lib/security/rate-limit.ts
 * Hệ thống Rate Limiting cấp độ API:
 * 1. Hỗ trợ Sliding Window In-Memory (Zero dependencies, hiệu năng cao, tự dọn dẹp bộ nhớ).
 * 2. Tích hợp sẵn Upstash Redis REST API khi có biến môi trường UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN.
 * 3. Chuẩn hóa quy định giới hạn:
 *    - Email form: Tối đa 5 requests / phút / IP.
 *    - Search & Order Tracking: Tối đa 20 requests / phút / IP.
 */

export type RateLimitType = "email" | "search" | "tracking" | "order_create";

export interface RateLimitConfig {
  limit: number;
  windowMs: number; // Thời gian cửa sổ tính bằng milliseconds
}

export const RATE_LIMIT_RULES: Record<RateLimitType, RateLimitConfig> = {
  email: {
    limit: 5, // 5 requests / phút
    windowMs: 60 * 1000,
  },
  search: {
    limit: 20, // 20 requests / phút
    windowMs: 60 * 1000,
  },
  tracking: {
    limit: 20, // 20 requests / phút
    windowMs: 60 * 1000,
  },
  order_create: {
    limit: 100, // 100 requests / phút (tránh nghẽn khi chạy song song các bộ test)
    windowMs: 60 * 1000,
  },
};

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number; // Unix timestamp tính bằng giây
  retryAfter: number; // Số giây cần chờ nếu bị 429
  headers: Record<string, string>;
  ip: string;
}

// Bộ nhớ Sliding Window cục bộ
interface MemoryWindow {
  timestamps: number[];
}

const memoryStore = new Map<string, MemoryWindow>();

// Định kỳ dọn dẹp các IP đã hết hạn sau 2 phút để giải phóng RAM
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, windowData] of memoryStore.entries()) {
      windowData.timestamps = windowData.timestamps.filter((t) => now - t < 120_000);
      if (windowData.timestamps.length === 0) {
        memoryStore.delete(key);
      }
    }
  }, 60_000);

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

/**
 * Trích xuất địa chỉ IP người dùng một cách an toàn và chuẩn xác
 */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  return "127.0.0.1";
}

/**
 * Reset dữ liệu rate limit của một IP hoặc toàn bộ (phục vụ unit test)
 */
export function resetRateLimits(keyPrefix?: string): void {
  if (!keyPrefix) {
    memoryStore.clear();
    return;
  }
  for (const key of memoryStore.keys()) {
    if (key.startsWith(keyPrefix)) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Kiểm tra giới hạn tần suất request (Rate Limit)
 * @param req NextRequest
 * @param type Loại hành động cần kiểm tra (email | search | tracking)
 * @param customIdentifier Tùy chọn định danh riêng (mặc định lấy client IP)
 */
export async function checkRateLimit(
  req: NextRequest,
  type: RateLimitType,
  customIdentifier?: string
): Promise<RateLimitResult> {
  const ip = customIdentifier || getClientIp(req);
  const rule = RATE_LIMIT_RULES[type] || { limit: 20, windowMs: 60_000 };
  const storeKey = `rl:${type}:${ip}`;
  const now = Date.now();

  // 1. Kiểm tra Upstash Redis nếu cấu hình có sẵn
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      // Dùng lệnh INCR & EXPIRE qua Upstash REST API
      const redisRes = await fetch(`${upstashUrl}/multi-exec`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", storeKey],
          ["EXPIRE", storeKey, Math.ceil(rule.windowMs / 1000)],
          ["TTL", storeKey],
        ]),
      });

      if (redisRes.ok) {
        const redisData = await redisRes.json();
        const currentCount = Number(redisData[0]?.result || 1);
        const ttl = Number(redisData[2]?.result || Math.ceil(rule.windowMs / 1000));
        const remaining = Math.max(0, rule.limit - currentCount);
        const resetTime = Math.ceil((now + ttl * 1000) / 1000);
        const success = currentCount <= rule.limit;
        const retryAfter = success ? 0 : Math.max(1, ttl);

        return {
          success,
          limit: rule.limit,
          remaining,
          resetTime,
          retryAfter,
          ip,
          headers: {
            "X-RateLimit-Limit": rule.limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": resetTime.toString(),
          },
        };
      }
    } catch (e) {
      console.warn("Upstash Redis connection error, fallback to in-memory rate limiter:", e);
    }
  }

  // 2. Thuật toán Sliding Window In-Memory (Mặc định)
  let windowData = memoryStore.get(storeKey);
  if (!windowData) {
    windowData = { timestamps: [] };
    memoryStore.set(storeKey, windowData);
  }

  // Lọc bỏ các timestamp nằm ngoài cửa sổ windowMs
  const windowStart = now - rule.windowMs;
  windowData.timestamps = windowData.timestamps.filter((t) => t > windowStart);

  const currentCount = windowData.timestamps.length;
  const success = currentCount < rule.limit;

  if (success) {
    windowData.timestamps.push(now);
  }

  const remaining = Math.max(0, rule.limit - windowData.timestamps.length);
  const oldestTimestamp = windowData.timestamps[0] || now;
  const timeToOldestExpire = Math.max(0, oldestTimestamp + rule.windowMs - now);
  const retryAfter = success ? 0 : Math.ceil(timeToOldestExpire / 1000);
  const resetTime = Math.ceil((now + (success ? rule.windowMs : timeToOldestExpire)) / 1000);

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": rule.limit.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": resetTime.toString(),
  };

  if (!success) {
    headers["Retry-After"] = retryAfter.toString();
  }

  return {
    success,
    limit: rule.limit,
    remaining,
    resetTime,
    retryAfter,
    headers,
    ip,
  };
}

/**
 * Trả về response HTTP 429 Too Many Requests chuẩn mực kèm theo headers
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const headers = new Headers();
  for (const [key, val] of Object.entries(result.headers)) {
    headers.set(key, val);
  }

  return NextResponse.json(
    {
      success: false,
      error: `Bạn đã thực hiện quá nhiều yêu cầu. Vui lòng thử lại sau ${result.retryAfter} giây.`,
      retryAfter: result.retryAfter,
      limit: result.limit,
    },
    {
      status: 429,
      headers,
    }
  );
}
