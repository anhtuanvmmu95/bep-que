import React from "react";
import Link from "next/link";
import { UtensilsCrossed, Home, Search, Compass } from "lucide-react";

/**
 * app/not-found.tsx - Trang 404 tùy chỉnh chuẩn phong cách Bếp Quê
 */
export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 bg-[#FFFDF9]">
      <div className="max-w-lg w-full bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-amber-100/80 text-center relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-100/50 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-orange-100/50 rounded-full blur-2xl pointer-events-none" />

        {/* Icon 404 */}
        <div className="relative mx-auto w-24 h-24 rounded-3xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-700 shadow-inner mb-6">
          <UtensilsCrossed className="w-12 h-12 stroke-[1.5]" />
        </div>

        <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-amber-100/80 text-amber-900 mb-3">
          Lỗi 404 • Không tìm thấy trang
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-800 tracking-tight mb-3">
          Món ngon này chưa lên mâm
        </h1>

        <p className="text-stone-600 text-sm sm:text-base leading-relaxed mb-8">
          Đường dẫn quý khách đang tìm kiếm có thể đã thay đổi hoặc không tồn tại
          trong thực đơn của Bếp Quê. Quý khách vui lòng chọn lại món hoặc về
          trang chủ nhé!
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            <span>Về trang chủ</span>
          </Link>

          <Link
            href="/tracking"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-sm transition-all active:scale-[0.98]"
          >
            <Compass className="w-4 h-4" />
            <span>Tra cứu đơn hàng</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
