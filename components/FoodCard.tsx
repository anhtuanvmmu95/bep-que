"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, Plus, Clock, Check, Sparkles, SlidersHorizontal } from "lucide-react";
import { RuralFoodItem } from "@/lib/data";
import { useCart } from "@/lib/context/CartContext";

interface FoodCardProps {
  item: RuralFoodItem;
  onAddToCart?: (item: RuralFoodItem) => void;
  priority?: boolean;
}

export default function FoodCard({ item, onAddToCart, priority = false }: FoodCardProps) {
  const [added, setAdded] = useState(false);
  const { addToCart } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAdded(true);

    addToCart({
      productId: item.id,
      name: item.name,
      basePrice: item.price,
      finalPrice: item.price,
      imageUrl: item.imageUrl,
      quantity: 1,
      spicyNote: "Cay vừa",
      sweetNote: "Chuẩn vị truyền thống",
      portion: "Phần tiêu chuẩn (1-2 người)",
    });

    if (onAddToCart) {
      onAddToCart(item);
    }
    setTimeout(() => setAdded(false), 1200);
  };

  const discountPercent =
    item.originalPrice && item.originalPrice > item.price
      ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
      : null;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-amber-600/40 hover:shadow-lg hover:shadow-amber-950/5">
      {/* Clickable Image to Product Detail with Next.js Image Optimization */}
      <Link
        href={`/products/${item.id}`}
        className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100 block"
      >
        <Image
          src={item.imageUrl}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          priority={priority}
          loading={priority ? undefined : "lazy"}
        />

        {/* Gradient overlay for rustic depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3 flex flex-wrap items-center gap-1.5 z-10">
          {item.tag && (
            <span className="inline-flex items-center gap-1 rounded-full bg-stone-900/85 px-2.5 py-1 text-[10px] sm:text-[11px] font-medium text-amber-200 shadow-xs backdrop-blur-md border border-amber-200/20">
              <Sparkles className="w-3 h-3 text-amber-400" />
              {item.tag}
            </span>
          )}
          {discountPercent && (
            <span className="rounded-full bg-red-700 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
              -{discountPercent}%
            </span>
          )}
        </div>

        {/* Prep Time pill */}
        <div className="absolute bottom-2 right-2.5 sm:bottom-2.5 sm:right-3 inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-medium text-stone-200 backdrop-blur-xs z-10">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>{item.prepTime}</span>
        </div>
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3.5 sm:p-5">
        <div className="flex items-center justify-between text-xs mb-1.5 sm:mb-2">
          <span className="rounded-md border border-amber-800/15 bg-amber-100/70 px-2 sm:px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold text-amber-900">
            {item.category}
          </span>
          <div className="flex items-center gap-1 text-amber-600 font-medium text-xs">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span className="font-bold text-stone-800">{item.rating}</span>
            <span className="text-stone-400 text-[11px]">({item.reviewsCount})</span>
          </div>
        </div>

        <Link href={`/products/${item.id}`} className="block">
          <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 transition-colors group-hover:text-amber-800 line-clamp-1">
            {item.name}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-600 flex-1">
          {item.description}
        </p>

        {/* Price & Action (Optimized for Mobile Touch) */}
        <div className="mt-3.5 sm:mt-4 flex items-center justify-between border-t border-amber-900/10 pt-3">
          <div>
            <div className="font-serif text-base sm:text-lg font-extrabold text-amber-900">
              {formatPrice(item.price)}
            </div>
            {item.originalPrice && (
              <div className="text-[11px] sm:text-xs text-stone-400 line-through">
                {formatPrice(item.originalPrice)}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href={`/products/${item.id}`}
              className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-amber-900/20 text-stone-600 hover:bg-amber-100 hover:text-amber-900 active:scale-95 transition"
              title="Tùy chọn độ cay/ngọt"
              aria-label={`Xem chi tiết và tùy chọn món ${item.name}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </Link>

            <button
              type="button"
              onClick={handleAdd}
              className={`flex h-10 sm:h-9 items-center gap-1.5 rounded-xl px-3 sm:px-3 text-xs font-semibold shadow-xs transition-all duration-200 active:scale-95 ${
                added
                  ? "bg-emerald-700 text-white shadow-emerald-700/20"
                  : "bg-amber-800 text-white shadow-amber-900/20 hover:bg-amber-900"
              }`}
              aria-label={`Thêm ${item.name} vào mâm cơm`}
            >
              {added ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Đã thêm</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="hidden xs:inline sm:inline">Chọn món</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
