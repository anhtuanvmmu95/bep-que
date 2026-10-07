"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Star,
  Clock,
  Flame,
  ShieldCheck,
  Plus,
  Minus,
  ShoppingBag,
  Sparkles,
  ArrowLeft,
  Check,
  CheckCircle2,
  Heart,
  Share2,
  Wheat,
  Utensils,
} from "lucide-react";
import { RuralFoodItem, RURAL_FOODS } from "@/lib/data";
import { useCart, CartItemOption } from "@/lib/context/CartContext";
import FoodCard from "@/components/FoodCard";

interface ProductDetailViewProps {
  product: RuralFoodItem;
}

const SPICY_OPTIONS = [
  { id: "none", label: "Không cay", desc: "Thích hợp cho trẻ em, không ớt tiêu" },
  { id: "mild", label: "Cay dịu", desc: "Chỉ thoang thoảng chút tiêu ấm" },
  { id: "medium", label: "Cay vừa (Chuẩn vị)", desc: "Vị cay ấm nồng chuẩn niêu quê", isDefault: true },
  { id: "hot", label: "Cay nồng đồng quê", desc: "Nhiều ớt hiểm & tiêu sọ giã tay" },
];

const SWEET_OPTIONS = [
  { id: "traditional", label: "Chuẩn vị truyền thống", desc: "Cân bằng mặn ngọt đậm đà", isDefault: true },
  { id: "light", label: "Ít ngọt (Thanh đạm)", desc: "Thanh tao chuẩn khẩu vị Bắc" },
  { id: "rich", label: "Đậm đà miền Tây", desc: "Ngọt béo cốt dừa tự nhiên hơn" },
  { id: "low-salt", label: "Ăn nhạt (Giảm mặn)", desc: "Ít muối, thanh nhẹ tốt cho sức khỏe" },
];

const PORTION_OPTIONS = [
  { id: "standard", label: "Phần tiêu chuẩn (1 - 2 người)", additionalPrice: 0 },
  { id: "medium", label: "Phần vừa (2 - 3 người)", additionalPrice: 35000 },
  { id: "family", label: "Mâm đầy đặn (4 - 5 người)", additionalPrice: 70000 },
];

const EXTRA_ADDITIONS: CartItemOption[] = [
  { name: "Thêm niêu cơm cháy giòn rụm", price: 15000 },
  { name: "Thêm đĩa rau vườn luộc tươi ngọt", price: 20000 },
  { name: "Thêm chén tóp mỡ kho quẹt giòn", price: 25000 },
  { name: "Thêm nước mắm đồng nguyên chất", price: 5000 },
];

export default function ProductDetailView({ product }: ProductDetailViewProps) {
  const { addToCart, setIsCartOpen } = useCart();

  const [selectedSpicy, setSelectedSpicy] = useState<string>("Cay vừa (Chuẩn vị)");
  const [selectedSweet, setSelectedSweet] = useState<string>("Chuẩn vị truyền thống");
  const [selectedPortion, setSelectedPortion] = useState(PORTION_OPTIONS[0]);
  const [selectedExtras, setSelectedExtras] = useState<CartItemOption[]>([]);
  const [specialNote, setSpecialNote] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdded, setIsAdded] = useState<boolean>(false);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  const handleToggleExtra = (extra: CartItemOption) => {
    if (selectedExtras.some((e) => e.name === extra.name)) {
      setSelectedExtras((prev) => prev.filter((e) => e.name !== extra.name));
    } else {
      setSelectedExtras((prev) => [...prev, extra]);
    }
  };

  // Calculate final unit price
  const extrasTotal = selectedExtras.reduce((sum, e) => sum + e.price, 0);
  const unitFinalPrice = product.price + selectedPortion.additionalPrice + extrasTotal;
  const totalPrice = unitFinalPrice * quantity;

  const handleAddToCart = () => {
    addToCart({
      productId: product.id,
      name: product.name,
      basePrice: product.price,
      finalPrice: unitFinalPrice,
      imageUrl: product.imageUrl,
      quantity,
      spicyNote: selectedSpicy,
      sweetNote: selectedSweet,
      portion: selectedPortion.label,
      extras: selectedExtras,
      specialNote: specialNote.trim() || undefined,
    });

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    setIsCartOpen(true);
  };

  // Related foods in same category
  const relatedFoods = RURAL_FOODS.filter(
    (item) => item.category === product.category && item.id !== product.id
  ).slice(0, 3);

  return (
    <div className="py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb / Back button */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-amber-900/15 bg-white/80 px-4 py-2 text-xs sm:text-sm font-semibold text-stone-700 hover:bg-amber-100/70 hover:text-amber-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại mâm cơm</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              className={`rounded-full p-2.5 border border-amber-900/15 bg-white transition ${
                isFavorite ? "text-red-600 bg-red-50" : "text-stone-600 hover:bg-amber-50"
              }`}
              aria-label="Yêu thích món này"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: product.name, url: window.location.href });
                } else {
                  alert("Đã sao chép liên kết món ăn!");
                }
              }}
              className="rounded-full p-2.5 border border-amber-900/15 bg-white text-stone-600 hover:bg-amber-50 transition"
              aria-label="Chia sẻ món ăn"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Product Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Food Image & Highlights */}
          <div className="lg:col-span-6 space-y-6">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border-4 border-white bg-stone-200 shadow-xl shadow-amber-950/15">
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/50 via-transparent to-transparent pointer-events-none" />

              {/* Badges */}
              <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
                {product.tag && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-900/85 px-3 py-1 text-xs font-semibold text-amber-200 backdrop-blur-md border border-amber-200/20">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    {product.tag}
                  </span>
                )}
                {product.isFeatured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-700/90 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    Món trứ danh
                  </span>
                )}
              </div>

              {/* Prep time */}
              <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-stone-200 backdrop-blur-sm">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Thời gian nấu niêu: {product.prepTime}</span>
              </div>
            </div>

            {/* Quality assurances banner */}
            <div className="grid grid-cols-3 gap-3 rounded-2xl border border-amber-900/10 bg-amber-50/60 p-4 text-center">
              <div>
                <Flame className="w-5 h-5 mx-auto text-amber-800 mb-1" />
                <div className="font-serif text-xs font-bold text-stone-900">Niêu đất nung</div>
                <div className="text-[10px] text-stone-500">Giữ nóng 45 phút</div>
              </div>
              <div className="border-x border-amber-900/10">
                <Wheat className="w-5 h-5 mx-auto text-amber-800 mb-1" />
                <div className="font-serif text-xs font-bold text-stone-900">Rau vườn nhà</div>
                <div className="text-[10px] text-stone-500">Tươi sạch hái sớm</div>
              </div>
              <div>
                <ShieldCheck className="w-5 h-5 mx-auto text-emerald-700 mb-1" />
                <div className="font-serif text-xs font-bold text-stone-900">Chuẩn vị cội nguồn</div>
                <div className="text-[10px] text-stone-500">Không phẩm màu</div>
              </div>
            </div>

            {/* Culinary Description */}
            <div className="rounded-2xl border border-amber-900/10 bg-white p-6 space-y-3">
              <h3 className="font-serif text-base font-bold text-stone-900 flex items-center gap-2">
                <Utensils className="w-4 h-4 text-amber-800" />
                <span>Hương vị & Bí quyết chế biến</span>
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                {product.description}
              </p>
              <div className="text-xs text-stone-500 pt-2 border-t border-stone-100">
                Món ăn được chế biến theo phương pháp thủ công lưu truyền, kết hợp các loại gia vị đặc trưng từ làng quê Việt.
              </div>
            </div>
          </div>

          {/* Right Column: Customization Options & Add to Cart */}
          <div className="lg:col-span-6 space-y-6">
            <div className="rounded-3xl border border-amber-900/15 bg-white p-6 sm:p-8 shadow-sm">
              {/* Category & Rating */}
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="rounded-md border border-amber-800/20 bg-amber-100/70 px-3 py-1 font-semibold text-amber-900">
                  {product.category}
                </span>
                <div className="flex items-center gap-1.5 text-amber-600">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span className="font-bold text-stone-900 text-sm">{product.rating}</span>
                  <span className="text-stone-400">({product.reviewsCount} thực khách khen ngon)</span>
                </div>
              </div>

              {/* Title & Price */}
              <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-stone-900 mt-2">
                {product.name}
              </h1>

              <div className="mt-4 flex items-baseline gap-3 border-b border-amber-900/10 pb-5">
                <span className="font-serif text-3xl font-extrabold text-amber-900">
                  {formatPrice(unitFinalPrice)}
                </span>
                {product.originalPrice && (
                  <span className="text-sm text-stone-400 line-through">
                    {formatPrice(product.originalPrice + selectedPortion.additionalPrice + extrasTotal)}
                  </span>
                )}
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  Đang sẵn sàng phục vụ
                </span>
              </div>

              {/* 1. PORTION SELECTION */}
              <div className="mt-6 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-800">
                  1. Chọn Khẩu phần ăn:
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {PORTION_OPTIONS.map((portion) => {
                    const isSelected = selectedPortion.id === portion.id;
                    return (
                      <button
                        key={portion.id}
                        type="button"
                        onClick={() => setSelectedPortion(portion)}
                        className={`rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? "border-amber-800 bg-amber-50/70 text-amber-900 ring-2 ring-amber-800/20"
                            : "border-stone-200 bg-stone-50/50 text-stone-700 hover:border-amber-400"
                        }`}
                      >
                        <div className="text-xs font-bold">{portion.label}</div>
                        {portion.additionalPrice > 0 ? (
                          <div className="text-[11px] font-semibold text-amber-800 mt-0.5">
                            +{formatPrice(portion.additionalPrice)}
                          </div>
                        ) : (
                          <div className="text-[11px] text-stone-500 mt-0.5">Tiêu chuẩn</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. SPICY NOTES SELECTION (REQUIREMENT) */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-red-600" />
                    <span>2. Tùy chọn Mức độ cay:</span>
                  </label>
                  <span className="text-xs font-semibold text-amber-800">
                    {selectedSpicy}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SPICY_OPTIONS.map((option) => {
                    const isSelected = selectedSpicy === option.label;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedSpicy(option.label)}
                        className={`flex flex-col rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? "border-amber-800 bg-amber-50/80 text-amber-900 ring-2 ring-amber-800/20"
                            : "border-stone-200 bg-stone-50/50 text-stone-700 hover:border-amber-400"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>{option.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-800 stroke-[3]" />}
                        </div>
                        <span className="text-[11px] text-stone-500 mt-0.5">
                          {option.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. SWEET / SEASONING NOTES SELECTION (REQUIREMENT) */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>3. Tùy chọn Khẩu vị / Độ ngọt:</span>
                  </label>
                  <span className="text-xs font-semibold text-amber-800">
                    {selectedSweet}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SWEET_OPTIONS.map((option) => {
                    const isSelected = selectedSweet === option.label;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedSweet(option.label)}
                        className={`flex flex-col rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? "border-amber-800 bg-amber-50/80 text-amber-900 ring-2 ring-amber-800/20"
                            : "border-stone-200 bg-stone-50/50 text-stone-700 hover:border-amber-400"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>{option.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-800 stroke-[3]" />}
                        </div>
                        <span className="text-[11px] text-stone-500 mt-0.5">
                          {option.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. EXTRAS / SIDES */}
              <div className="mt-6 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-800">
                  4. Món ăn kèm đồng quê (Tùy chọn):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXTRA_ADDITIONS.map((extra) => {
                    const isSelected = selectedExtras.some((e) => e.name === extra.name);
                    return (
                      <button
                        key={extra.name}
                        type="button"
                        onClick={() => handleToggleExtra(extra)}
                        className={`flex items-center justify-between rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? "border-amber-800 bg-amber-50/80 text-amber-900 ring-2 ring-amber-800/20"
                            : "border-stone-200 bg-stone-50/50 text-stone-700 hover:border-amber-400"
                        }`}
                      >
                        <div className="text-xs font-medium">{extra.name}</div>
                        <div className="text-xs font-bold text-amber-800 shrink-0 ml-2">
                          +{formatPrice(extra.price)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. CHEF NOTES */}
              <div className="mt-6 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-800">
                  5. Lời nhắn riêng cho nhà bếp:
                </label>
                <input
                  type="text"
                  value={specialNote}
                  onChange={(e) => setSpecialNote(e.target.value)}
                  placeholder="Ví dụ: Không hành lá, nhiều ớt hiểm, hâm nóng kĩ..."
                  className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 text-base sm:text-xs text-stone-800 placeholder-stone-400 focus:border-amber-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              {/* 6. QUANTITY & ACTIONS */}
              <div className="mt-8 border-t border-amber-900/10 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Số lượng phần:
                  </span>
                  <div className="flex items-center gap-3 rounded-2xl border border-amber-900/20 bg-stone-50 p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-stone-700 shadow-xs hover:bg-amber-100 disabled:opacity-40 transition"
                      aria-label="Giảm"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-serif text-base font-bold text-stone-900 w-8 text-center">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-stone-700 shadow-xs hover:bg-amber-100 transition"
                      aria-label="Tăng"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
                  <span>Tổng tiền ({quantity} phần):</span>
                  <span className="font-serif text-xl font-extrabold text-amber-900">
                    {formatPrice(totalPrice)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className={`flex items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold shadow-md transition-all active:scale-95 ${
                      isAdded
                        ? "bg-emerald-700 text-white shadow-emerald-700/20"
                        : "border-2 border-amber-800 bg-white text-amber-900 hover:bg-amber-50"
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>Đã thêm mâm cơm!</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                        <span>Thêm vào mâm cơm</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="flex items-center justify-center gap-2 rounded-full bg-amber-800 py-3.5 text-sm font-semibold text-amber-100 shadow-lg shadow-amber-950/20 hover:bg-amber-900 active:scale-95 transition"
                  >
                    <ShoppingBag className="w-4 h-4 text-amber-300" />
                    <span>Đặt ăn ngay</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Dishes */}
        {relatedFoods.length > 0 && (
          <div className="mt-16 sm:mt-20 border-t border-amber-900/10 pt-12">
            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Gợi ý mâm cơm tròn vị
              </span>
              <h2 className="font-serif text-2xl font-bold text-stone-900 mt-1">
                Các món cùng danh mục {product.category}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedFoods.map((item) => (
                <FoodCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
