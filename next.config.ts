import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * 1. Content-Security-Policy (CSP) Directives:
 * - default-src: Chỉ cho phép tài nguyên từ origin hiện tại ('self')
 * - script-src: Hạn chế domain script, cho phép Cloudflare Turnstile, không cho phép external script lạ
 * - style-src: Cho phép CSS inline và Google Fonts
 * - img-src: Cho phép ảnh từ Unsplash và VietQR
 * - font-src: Cho phép fonts từ Google Fonts và data URIs
 * - connect-src: Cho phép kết nối API nội bộ, Cloudflare Turnstile, Supabase và Upstash Redis
 * - frame-src: Cho phép nhúng iframe của Cloudflare Turnstile widget
 * - frame-ancestors: 'none' (Chống hoàn toàn nguy cơ Clickjacking / iframe injection)
 * - object-src: 'none' (Chặn Flash / Java applets)
 * - base-uri: 'self'
 * - form-action: 'self'
 */
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://images.unsplash.com https://img.vietqr.io",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://challenges.cloudflare.com https://*.supabase.co https://*.upstash.io https://script.google.com",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
]
  .filter(Boolean)
  .join("; ");

/**
 * Danh sách Security Headers toàn diện cho dự án
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: cspDirectives,
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

/**
 * Cấu hình CORS chuẩn cho API Routes:
 * Tuyệt đối KHÔNG dùng 'Access-Control-Allow-Origin: *' cho các route có xử lý dữ liệu/cookie/authorization
 */
const apiCorsHeaders = [
  {
    key: "Access-Control-Allow-Origin",
    value: process.env.NEXT_PUBLIC_SITE_URL || "https://bepque.vn",
  },
  {
    key: "Access-Control-Allow-Credentials",
    value: "true",
  },
  {
    key: "Access-Control-Allow-Methods",
    value: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  },
  {
    key: "Access-Control-Allow-Headers",
    value:
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Tracking-Token, X-Admin-Key, X-Internal-Token, X-Turnstile-Token",
  },
  {
    key: "Access-Control-Max-Age",
    value: "86400",
  },
];

const nextConfig: NextConfig = {
  // 1. Tắt Source Map trên Production để chống rò rỉ mã nguồn và cấu trúc thư mục
  productionBrowserSourceMaps: false,

  // 2. Tắt header X-Powered-By để tránh lộ thông tin công nghệ (Server Fingerprinting)
  poweredByHeader: false,

  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 80, 85],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "img.vietqr.io",
      },
    ],
  },
  async headers() {
    return [
      {
        // Áp dụng Security Headers cho toàn bộ route trên website
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Áp dụng CORS Headers và Security Headers cho các API Routes
        source: "/api/:path*",
        headers: [...securityHeaders, ...apiCorsHeaders],
      },
    ];
  },
};

export default nextConfig;
