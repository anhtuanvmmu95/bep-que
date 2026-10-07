"use client";

import React, { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * app/global-error.tsx - Xử lý lỗi cấp toàn cục (Root Layout Error Boundary)
 * Thay thế root layout khi xảy ra sự cố nghiêm trọng ở cấp cao nhất.
 * Tự định nghĩa cấu trúc <html> và <body> độc lập, sử dụng inline styles an toàn.
 * TUYỆT ĐỐI không in stack trace hay database queries ra màn hình người dùng.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Lỗi toàn cục Root Layout:", {
      digest: error.digest,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <html lang="vi">
      <head>
        <title>Sự cố hệ thống - Bếp Quê</title>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          backgroundColor: "#FFFDF9",
          color: "#292524",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: "480px",
            width: "90%",
            backgroundColor: "#FFFFFF",
            borderRadius: "24px",
            padding: "40px 32px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
            border: "1px solid #FEF3C7",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 20px auto",
              borderRadius: "16px",
              backgroundColor: "#FEF3C7",
              color: "#B45309",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
            }}
          >
            🍲
          </div>

          <h1
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "#292524",
              marginBottom: "12px",
            }}
          >
            Bếp Quê đang bảo trì hệ thống
          </h1>

          <p
            style={{
              fontSize: "14px",
              lineHeight: "1.6",
              color: "#57534E",
              marginBottom: "24px",
            }}
          >
            Đã có gián đoạn tạm thời ngoài ý muốn từ máy chủ. Bếp Quê đang tiến
            hành khắc phục để phục vụ quý khách sớm nhất có thể. Dữ liệu của quý
            khách hoàn toàn an toàn.
          </p>

          {error.digest && (
            <p
              style={{
                fontSize: "12px",
                fontFamily: "monospace",
                color: "#78716C",
                backgroundColor: "#F5F5F4",
                padding: "8px 12px",
                borderRadius: "8px",
                display: "inline-block",
                marginBottom: "24px",
              }}
            >
              Mã đối soát: #BQ-{error.digest.slice(0, 8).toUpperCase()}
            </p>
          )}

          <div>
            <button
              onClick={() => reset()}
              style={{
                backgroundColor: "#B45309",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "12px",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                marginRight: "8px",
              }}
            >
              Thử tải lại trang
            </button>
            <a
              href="/"
              style={{
                backgroundColor: "#F5F5F4",
                color: "#44403C",
                textDecoration: "none",
                borderRadius: "12px",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: 600,
                display: "inline-block",
              }}
            >
              Về trang chủ
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
