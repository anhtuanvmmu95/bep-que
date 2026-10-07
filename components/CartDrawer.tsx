"use client";

import { useCart } from "@/lib/context/CartContext";
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function CartDrawer() {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    totalCount,
    totalPrice,
    clearCart,
  } = useCart();

  if (!isCartOpen) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-4 sm:pl-10">
        <div className="w-screen max-w-md bg-[#FCFAF7] shadow-2xl flex flex-col border-l border-stone-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-amber-900/10 px-6 py-4 bg-white/70">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-800 text-amber-100">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold text-stone-900">
                  Mâm Cơm Của Bạn
                </h2>
                <p className="text-xs text-stone-500 font-medium">
                  {totalCount} phần ăn đã chọn
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="rounded-full p-2 text-stone-500 hover:bg-amber-100 hover:text-stone-800 transition"
              aria-label="Đóng giỏ hàng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 mb-4">
                  <ShoppingBag className="h-8 w-8" />
                </div>
                <h3 className="font-serif text-lg font-bold text-stone-800">
                  Mâm cơm còn trống
                </h3>
                <p className="mt-1 text-xs text-stone-500 max-w-xs">
                  Hãy chọn thêm các món cá kho, canh quê thanh mát hoặc món nướng than hoa cho bữa cơm hôm nay.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-800 px-5 py-2.5 text-xs font-semibold text-amber-100 shadow-sm hover:bg-amber-900 transition"
                >
                  <span>Khám phá thực đơn</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs text-stone-500 pb-1">
                  <span>Chi tiết các món</span>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-amber-800 hover:underline font-medium"
                  >
                    Xóa tất cả
                  </button>
                </div>

                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3.5 rounded-2xl border border-amber-900/10 bg-white p-3.5 shadow-xs"
                  >
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      width={80}
                      height={80}
                      className="h-20 w-20 rounded-xl object-cover shrink-0 border border-amber-900/10"
                      quality={75}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <Link
                          href={`/products/${item.productId}`}
                          onClick={() => setIsCartOpen(false)}
                          className="font-serif text-sm font-bold text-stone-900 hover:text-amber-800 line-clamp-1"
                        >
                          {item.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="text-stone-400 hover:text-red-600 transition p-1"
                          aria-label="Xóa món"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Options breakdown */}
                      <div className="mt-1 space-y-0.5 text-[11px] text-stone-500">
                        {item.portion && (
                          <div>• Khẩu phần: <span className="font-medium text-stone-700">{item.portion}</span></div>
                        )}
                        {item.spicyNote && (
                          <div>• Độ cay: <span className="font-medium text-amber-800">{item.spicyNote}</span></div>
                        )}
                        {item.sweetNote && (
                          <div>• Khẩu vị: <span className="font-medium text-stone-700">{item.sweetNote}</span></div>
                        )}
                        {item.extras && item.extras.length > 0 && (
                          <div>
                            • Kèm:{" "}
                            <span className="font-medium text-stone-700">
                              {item.extras.map((e) => e.name).join(", ")}
                            </span>
                          </div>
                        )}
                        {item.specialNote && (
                          <div className="italic text-stone-400 truncate">
                            &quot;{item.specialNote}&quot;
                          </div>
                        )}
                      </div>

                      {/* Price and quantity counter */}
                      <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-2">
                        <div className="font-serif text-sm font-bold text-amber-900">
                          {formatPrice(item.finalPrice * item.quantity)}
                        </div>

                        <div className="flex items-center gap-2 rounded-lg border border-amber-900/15 bg-stone-50 px-2 py-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="text-stone-600 hover:text-amber-900 transition"
                            aria-label="Giảm số lượng"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-bold text-stone-800 w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="text-stone-600 hover:text-amber-900 transition"
                            aria-label="Tăng số lượng"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer Checkout */}
          {items.length > 0 && (
            <div className="border-t border-amber-900/10 bg-white/90 p-6 space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>Tạm tính ({totalCount} phần)</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="flex items-center gap-1">
                  <span>Phí giao niêu giữ nhiệt</span>
                  <Sparkles className="h-3 w-3 text-amber-700" />
                </span>
                <span className="text-emerald-700 font-semibold">Miễn phí (25 phút)</span>
              </div>
              <div className="border-t border-stone-200/60 pt-2 flex items-center justify-between">
                <span className="font-serif font-bold text-stone-900">Tổng thanh toán:</span>
                <span className="font-serif text-xl font-extrabold text-amber-900">
                  {formatPrice(totalPrice)}
                </span>
              </div>

              <Link
                href="/checkout"
                onClick={() => setIsCartOpen(false)}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-amber-800 py-3.5 text-sm font-semibold text-amber-100 shadow-lg shadow-amber-950/20 hover:bg-amber-900 active:scale-95 transition"
              >
                <span>Tiến hành đặt cỗ / Thanh toán</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
