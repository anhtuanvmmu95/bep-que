"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FoodCard from "@/components/FoodCard";
import { RURAL_CATEGORIES, RURAL_FOODS, RuralFoodItem } from "@/lib/data";
import {
  Flame,
  Leaf,
  Clock,
  ShieldCheck,
  Search,
  ArrowRight,
  SlidersHorizontal,
  Sparkles,
  CheckCircle2,
  HeartHandshake,
  Utensils,
  Award,
  X,
} from "lucide-react";

function HomeContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [selectedCategory, setSelectedCategory] = useState<string>("Tất cả");
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc" | "rating">("default");
  const [lastAddedItem, setLastAddedItem] = useState<string | null>(null);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      queueMicrotask(() => {
        setSearchQuery(q);
        const menuEl = document.getElementById("menu");
        if (menuEl) {
          menuEl.scrollIntoView({ behavior: "smooth" });
        }
      });
    }
  }, [searchParams]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { "Tất cả": RURAL_FOODS.length };
    RURAL_FOODS.forEach((food) => {
      counts[food.category] = (counts[food.category] || 0) + 1;
    });
    return counts;
  }, []);

  // Filtered & Sorted foods
  const filteredFoods = useMemo(() => {
    let result = RURAL_FOODS.filter((food) => {
      const matchesCategory =
        selectedCategory === "Tất cả" || food.category === selectedCategory;
      const matchesSearch =
        food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        food.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    if (sortBy === "price-asc") {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      result = [...result].sort((a, b) => b.price - a.price);
    } else if (sortBy === "rating") {
      result = [...result].sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [selectedCategory, searchQuery, sortBy]);

  const handleAddToCart = (item: RuralFoodItem) => {
    setLastAddedItem(item.name);
    setTimeout(() => setLastAddedItem(null), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-stone-800 antialiased selection:bg-amber-800 selection:text-amber-50">
      <Navbar />

      {/* Floating Add-to-cart Toast - Bright Luminous Style */}
      {lastAddedItem && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-3 rounded-2xl border border-amber-200 bg-white/98 px-4 py-3 text-sm text-stone-900 shadow-xl shadow-amber-950/10 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-[90vw] sm:max-w-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-amber-900 text-xs sm:text-sm">Đã thêm vào mâm cơm:</span>
            <p className="text-xs text-stone-600 font-medium truncate">{lastAddedItem}</p>
          </div>
        </div>
      )}

      <main className="flex-1">
        {/* HERO SECTION: Bright, warm ivory and elegant rustic atmosphere */}
        <section className="relative overflow-hidden border-b border-stone-200/80 bg-gradient-to-b from-[#FFFDF9] via-[#FAF6EE] to-[#FCFAF7] py-12 sm:py-16 lg:py-20">
          {/* Subtle rustic background accents */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:24px_24px]" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
              {/* Hero Left Content */}
              <div className="space-y-5 sm:space-y-6 text-center lg:text-left lg:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-800/20 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-900 shadow-xs">
                  <Flame className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                  <span>Bếp Lửa Quê Nhà • Nấu Bằng Niêu Đất Truyền Thống</span>
                </div>

                <h1 className="font-serif text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl lg:text-5xl xl:text-6xl leading-[1.2]">
                  Về lại bữa cơm nhà,{" "}
                  <span className="text-amber-800 block mt-1.5 sm:mt-2">
                    đượm nồng hương vị quê xưa
                  </span>
                </h1>

                <p className="max-w-2xl text-sm sm:text-base lg:text-lg text-stone-600 leading-relaxed mx-auto lg:mx-0">
                  Cơm niêu cháy giòn đáy nồi, cá bống suối kho tộ sền sệt, rau vườn luộc chấm kho quẹt đậm đà. Mỗi món ăn là một ký ức tuổi thơ ấm áp bên bếp lửa quê xưa.
                </p>

                {/* Hero Quick Search Bar - Seamless, non-overlapping, instant access */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const menuEl = document.getElementById("menu");
                    if (menuEl) menuEl.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="relative flex items-center w-full max-w-lg mx-auto lg:mx-0 shadow-sm rounded-full bg-white border border-amber-900/15 p-1.5 transition focus-within:border-amber-700 focus-within:ring-2 focus-within:ring-amber-200"
                >
                  <Search className="ml-3.5 h-4 w-4 text-stone-400 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm món niêu, cá kho, lẩu mắm..."
                    className="w-full bg-transparent px-3 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="p-1 mr-1 text-stone-400 hover:text-stone-700"
                      aria-label="Xóa nội dung"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-800 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-amber-900 transition shrink-0"
                  >
                    <span>Tìm món</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-1">
                  <a
                    href="#menu"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-900 active:scale-95"
                  >
                    <span>Khám phá thực đơn</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href="#dac-san"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-6 py-3 text-sm font-semibold text-stone-800 shadow-xs transition hover:bg-amber-50"
                  >
                    <Utensils className="w-4 h-4 text-amber-700" />
                    <span>Đặc sản ba miền</span>
                  </a>
                </div>

                {/* Rustic Highlights Cards */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-4 border-t border-stone-200/80 pt-5 sm:pt-6">
                  <div className="rounded-2xl border border-stone-200 bg-white p-3 sm:p-4 text-center sm:text-left shadow-xs">
                    <div className="font-serif text-xl sm:text-2xl font-bold text-amber-800">100%</div>
                    <div className="text-[11px] sm:text-xs text-stone-600 font-medium leading-tight mt-0.5">Nguyên liệu sạch</div>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-white p-3 sm:p-4 text-center sm:text-left shadow-xs">
                    <div className="font-serif text-xl sm:text-2xl font-bold text-amber-800">25 Phút</div>
                    <div className="text-[11px] sm:text-xs text-stone-600 font-medium leading-tight mt-0.5">Giao niêu giữ nhiệt</div>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-white p-3 sm:p-4 text-center sm:text-left shadow-xs">
                    <div className="font-serif text-xl sm:text-2xl font-bold text-amber-800">4.9 / 5.0</div>
                    <div className="text-[11px] sm:text-xs text-stone-600 font-medium leading-tight mt-0.5">2,000+ thực khách</div>
                  </div>
                </div>
              </div>

              {/* Hero Right Visuals with next/image */}
              <div className="relative mx-auto w-full max-w-md lg:col-span-5 lg:max-w-none">
                <div className="relative rounded-3xl border-4 border-white bg-white p-2 shadow-xl shadow-stone-900/10">
                  <div className="relative aspect-square overflow-hidden rounded-2xl bg-stone-100">
                    <Image
                      src="/images/foods/rural-food-01.jpg"
                      alt="Cơm Niêu Cá Kho Tộ Đồng Quê"
                      fill
                      sizes="(max-width: 1024px) 100vw, 45vw"
                      className="object-cover transition duration-700 hover:scale-105"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 text-white">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-700/90 px-3 py-1 text-xs font-semibold backdrop-blur-xs">
                        <Sparkles className="w-3.5 h-3.5" />
                        Món bán chạy nhất hôm nay
                      </div>
                      <h4 className="font-serif text-lg sm:text-xl font-bold mt-1.5">
                        Cơm Niêu Cá Bống Kho Tộ Than Hồng
                      </h4>
                      <p className="text-xs text-stone-200 mt-0.5 line-clamp-1">
                        Cơm cháy giòn rụm đáy niêu, cá kho đậm đà chuẩn vị quê xưa
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* VALUE PROPOSITION: Rural commitments */}
        <section className="border-b border-stone-200/80 bg-white py-8 sm:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
              <div className="flex items-start gap-3.5 rounded-2xl border border-stone-200 bg-[#FCFAF7] p-4.5 hover:bg-amber-50/40 hover:border-amber-200 transition shadow-xs">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-800 text-amber-100 shadow-xs">
                  <Flame className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-sm sm:text-base">Niêu đất đỏ lửa</h3>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">Kho cá, nấu cơm trong niêu đất truyền thống giữ trọn dinh dưỡng.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl border border-stone-200 bg-[#FCFAF7] p-4.5 hover:bg-amber-50/40 hover:border-amber-200 transition shadow-xs">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-800 text-amber-100 shadow-xs">
                  <Leaf className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-sm sm:text-base">Rau vườn hái sớm</h3>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">Rau đọt bầu, bông súng, điên điển tươi non hái trực tiếp tại vườn.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl border border-stone-200 bg-[#FCFAF7] p-4.5 hover:bg-amber-50/40 hover:border-amber-200 transition shadow-xs">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-800 text-amber-100 shadow-xs">
                  <Clock className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-sm sm:text-base">Giao nóng 25 phút</h3>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">Hộp giữ nhiệt chuyên dụng giúp cơm canh bốc khói khi đến nơi.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl border border-stone-200 bg-[#FCFAF7] p-4.5 hover:bg-amber-50/40 hover:border-amber-200 transition shadow-xs">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-800 text-amber-100 shadow-xs">
                  <ShieldCheck className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-sm sm:text-base">Chuẩn vị không mì chính</h3>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">Vị ngọt tự nhiên từ nước hầm xương mía lau, mắm cá đồng truyền thống.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FOOD MENU SECTION WITH CATEGORY FILTER */}
        <section id="menu" className="py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Header Title */}
            <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100/70 px-3 py-1 rounded-full border border-amber-900/10">
                <Utensils className="w-3.5 h-3.5" />
                Thực đơn hôm nay
              </span>
              <h2 className="font-serif mt-2.5 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-stone-900">
                Mâm Cơm Quê Thuần Khiết
              </h2>
              <p className="mt-2 text-xs sm:text-sm lg:text-base text-stone-600 leading-relaxed">
                Lựa chọn theo từng danh mục món ăn dân dã ba miền, từ niêu cá kho, canh quê thanh mát đến các món lẩu đồng ngào ngạt.
              </p>
            </div>

            {/* Category Filter Pills & Search Controls Bar */}
            <div className="rounded-3xl border border-amber-900/15 bg-white p-4 sm:p-6 shadow-xs mb-8 sm:mb-10">
              {/* Search & Sort Controls - Perfectly responsive & clearly spaced */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-5 border-b border-amber-900/10 pb-4 sm:pb-5">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm tên món (cá bống, cơm niêu, lẩu...)"
                    className="h-10 w-full rounded-full border border-amber-900/20 bg-stone-50 pl-10 pr-9 text-base sm:text-sm text-stone-800 placeholder-stone-400 focus:border-amber-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600"
                      aria-label="Xóa tìm kiếm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 whitespace-nowrap">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-stone-400" />
                    <span>Sắp xếp:</span>
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "default" | "price-asc" | "price-desc" | "rating")}
                    className="h-10 rounded-xl border border-amber-900/20 bg-stone-50 px-3 text-xs font-medium text-stone-700 focus:border-amber-700 focus:bg-white focus:outline-none"
                  >
                    <option value="default">Mặc định</option>
                    <option value="price-asc">Giá: Thấp đến Cao</option>
                    <option value="price-desc">Giá: Cao đến Thấp</option>
                    <option value="rating">Đánh giá cao nhất</option>
                  </select>
                </div>
              </div>

              {/* Mobile swipeable & desktop centered category pills */}
              <div className="flex sm:flex-wrap items-center sm:justify-center gap-2 overflow-x-auto sm:overflow-visible no-scrollbar pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
                {RURAL_CATEGORIES.map((category) => {
                  const isSelected = selectedCategory === category;
                  const count = categoryCounts[category] || 0;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`group shrink-0 flex items-center gap-2 rounded-full px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-95 ${
                        isSelected
                          ? "bg-amber-800 text-amber-100 shadow-md shadow-amber-950/20"
                          : "border border-amber-900/15 bg-stone-50 text-stone-700 hover:border-amber-800/40 hover:bg-amber-50/60"
                      }`}
                    >
                      <span className="whitespace-nowrap">{category}</span>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                          isSelected
                            ? "bg-amber-950/50 text-amber-200"
                            : "bg-stone-200 text-stone-600 group-hover:bg-amber-200 group-hover:text-amber-900"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Food Grid: responsive 1 col mobile, 2 col tablet, 3-4 col desktop */}
            {filteredFoods.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredFoods.map((food, index) => (
                  <FoodCard
                    key={food.id}
                    item={food}
                    onAddToCart={handleAddToCart}
                    priority={index < 4}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-amber-900/20 bg-white p-8 sm:p-12 text-center">
                <Utensils className="mx-auto h-12 w-12 text-amber-800/40 mb-3" />
                <h3 className="font-serif text-lg font-bold text-stone-800">
                  Không tìm thấy món ăn phù hợp
                </h3>
                <p className="mt-1 text-xs text-stone-500">
                  {searchQuery ? (
                    <>
                      Không có món ăn nào khớp với từ khóa{" "}
                      <strong className="text-amber-900">&quot;{searchQuery}&quot;</strong>.
                    </>
                  ) : (
                    "Thử tìm kiếm với từ khóa khác hoặc bấm để xem tất cả món quê."
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("Tất cả");
                    setSearchQuery("");
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-800 px-5 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-900 transition"
                >
                  Xem toàn bộ thực đơn
                </button>
              </div>
            )}
          </div>
        </section>

        {/* FEATURED STORY SECTION: "Chuyện Bếp Xưa" */}
        <section id="story" className="border-y border-amber-900/10 bg-[#FAF4EB] py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-900/10">
                  <Award className="w-3.5 h-3.5" />
                  Ký ức ẩm thực
                </span>
                <h2 className="font-serif mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 leading-tight">
                  Chuyện niêu đất đỏ lửa & linh hồn mâm cơm mẹ nấu
                </h2>
                <p className="mt-3 sm:mt-4 text-stone-600 text-xs sm:text-sm lg:text-base leading-relaxed">
                  Ở Bếp Quê, chúng tôi không dùng bếp công nghiệp vội vã. Cá bống được kho chậm trên niêu đất nung Bát Tràng từ 4 đến 6 tiếng cùng nước dừa xiêm và củi than hồng. Hạt cơm chín từ tốn, để lại lớp cháy giòn màu cánh gián thơm phức.
                </p>

                <div className="mt-5 sm:mt-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-amber-800 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-stone-700">
                      <strong>Nồi đất nung thủ công:</strong> Giữ trọn vị ngọt thơm và khoáng chất tự nhiên của nguyên liệu.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-amber-800 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-stone-700">
                      <strong>Cá đồng tự nhiên:</strong> Thu mua từ các ghe xuồng đánh bắt tự nhiên tại miệt vườn miền Tây.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-amber-800 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-stone-700">
                      <strong>Gia vị cội nguồn:</strong> Mắm nhỉ Phú Quốc 40 độ đạm nguyên chất, tiêu đen Phú Quốc giã tay.
                    </p>
                  </div>
                </div>

                <div className="mt-6 sm:mt-8">
                  <a
                    href="#menu"
                    className="inline-flex items-center gap-2 rounded-full bg-amber-800 px-6 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-900 transition"
                  >
                    <span>Thưởng thức ngay</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Story Visuals with next/image */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-3 sm:space-y-4">
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl shadow-md bg-stone-300">
                    <Image
                      src="/images/foods/rural-food-02.jpg"
                      alt="Cá lóc nướng trui"
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="rounded-2xl border border-amber-900/15 bg-white p-3 sm:p-4 shadow-xs text-center">
                    <div className="font-serif text-lg sm:text-xl font-bold text-amber-900">100% Niêu Đất</div>
                    <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">Không dùng nồi kim loại công nghiệp</p>
                  </div>
                </div>
                <div className="space-y-3 sm:space-y-4 pt-6 sm:pt-8">
                  <div className="rounded-2xl border border-amber-900/15 bg-amber-800 p-3 sm:p-4 shadow-xs text-center text-amber-100">
                    <HeartHandshake className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 text-amber-300" />
                    <div className="font-serif text-base sm:text-lg font-bold">Vẹn Nguyên Vị Quê</div>
                    <p className="text-[11px] sm:text-xs text-amber-200 mt-0.5">Đậm đà như bàn tay mẹ nấu</p>
                  </div>
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl shadow-md bg-stone-300">
                    <Image
                      src="/images/foods/rural-food-03.jpg"
                      alt="Thịt kho quẹt rau luộc"
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF7F2]" />}>
      <HomeContent />
    </Suspense>
  );
}
