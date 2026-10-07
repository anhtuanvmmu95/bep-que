"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home, PhoneCall } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * app/error.tsx - Trang xử lý lỗi tập trung (Segment Error Boundary)
 * Nguyên tắc bảo mật OWASP:
 * 1. TUYỆT ĐỐI KHÔNG in stack trace, câu truy vấn database, mã nguồn hay thông tin nhạy cảm ra giao diện.
 * 2. Chỉ hiển thị thông điệp thân thiện, mộc mạc và an tâm cho khách hàng.
 * 3. Cung cấp mã digest vô hại (nếu có) để đối soát với server-side log khi cần hỗ trợ.
 */
export default function ErrorBoundary({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Ghi log bảo mật vào console của trình duyệt / hệ thống giám sát phía server
    console.error("Lỗi ứng dụng được bắt bởi Error Boundary:", {
      digest: error.digest,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-[#FFFDF9]">
      <div className="max-w-lg w-full bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-amber-100 text-center relative overflow-hidden">
        {/* Họa tiết nền dân dã */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-50 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-orange-50 rounded-full blur-2xl pointer-events-none" />

        {/* Biểu tượng lỗi trang nhã */}
        <div className="relative mx-auto w-20 h-20 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-700 shadow-inner mb-6">
          <AlertCircle className="w-10 h-10 stroke-[1.75]" />
        </div>

        {/* Tiêu đề lỗi thân thiện (Không chứa chi tiết kỹ thuật) */}
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-100/70 text-amber-900 mb-3">
          Thông báo hệ thống
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 tracking-tight mb-3">
          Bếp gặp chút sự cố ngoài ý muốn
        </h1>

        <p className="text-stone-600 text-sm sm:text-base leading-relaxed mb-6">
          Hệ thống đang được đội ngũ kỹ thuật Bếp Quê kiểm tra và tinh chỉnh lại. Mọi
          dữ liệu đặt món của quý khách vẫn được bảo vệ an toàn. Xin quý khách vui
          lòng thử tải lại hoặc quay về trang chủ.
        </p>

        {/* Mã sự cố ẩn danh (Chỉ hiển thị hash digest vô hại phục vụ tra cứu log) */}
        {error.digest && (
          <div className="mb-6 px-4 py-2 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-500 font-mono inline-block">
            Mã đối soát hỗ trợ: <span className="font-semibold text-stone-700">#BQ-{error.digest.slice(0, 8).toUpperCase()}</span>
          </div>
        )}

        {/* Các nút điều hướng an toàn */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-medium text-sm transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Thử tải lại</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-sm transition-all active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            <span>Về trang chủ</span>
          </Link>
        </div>

        {/* Hỗ trợ khách hàng */}
        <div className="mt-8 pt-6 border-t border-stone-100 flex items-center justify-center gap-2 text-xs text-stone-500">
          <PhoneCall className="w-3.5 h-3.5 text-amber-700" />
          <span>Hotline hỗ trợ món ăn: <strong className="text-stone-700 font-semibold">1900 6868</strong> (8:00 - 22:00)</span>
        </div>
      </div>
    </div>
  );
}
