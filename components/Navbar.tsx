"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Flame,
  Search,
  ShoppingBag,
  User,
  Heart,
  Menu,
  X,
  PhoneCall,
  Clock,
  Leaf,
  Sparkles,
} from "lucide-react";
import { useCart } from "@/lib/context/CartContext";

interface NavbarProps {
  cartCount?: number;
}

export default function Navbar({ cartCount }: NavbarProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [navSearchQuery, setNavSearchQuery] = useState("");
  const { totalCount, setIsCartOpen } = useCart();
  const displayCartCount = cartCount !== undefined ? cartCount : totalCount;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Trang chủ", href: "/" },
    { label: "Thực đơn", href: "/#menu" },
    { label: "Đặc sản", href: "/#dac-san" },
    { label: "Chuyện bếp", href: "/#story" },
    { label: "Tra cứu đơn", href: "/tracking" },
    { label: "Liên hệ", href: "#contact" },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!navSearchQuery.trim()) return;
    router.push(`/?q=${encodeURIComponent(navSearchQuery.trim())}#menu`);
    setIsSearchOpen(false);
    setIsOpen(false);
  };

  return (
    <>
      {/* Top rustic announcement banner - Luminous light warm golden cream */}
      <div className="bg-[#FAF4EB] border-b border-amber-200/60 px-4 py-1.5 text-center text-xs font-semibold text-amber-950 sm:text-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
          <Leaf className="h-3.5 w-3.5 text-amber-700 shrink-0" />
          <span>
            Hương vị đồng quê mộc mạc — Rau vườn tươi non, cá đồng tươi sống nấu niêu đất mỗi ngày
          </span>
          <span className="hidden md:inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full text-[11px] border border-amber-300/60">
            <Sparkles className="w-3 h-3 text-amber-600" />
            Tặng niêu cơm cháy cho đơn từ 200.000đ
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-200 ${
          isScrolled
            ? "border-b border-stone-200/90 bg-white/95 shadow-sm shadow-stone-900/5 backdrop-blur-md"
            : "border-b border-stone-200/80 bg-white/90 backdrop-blur-sm"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-3 sm:gap-4">
          {/* Logo & Desktop Nav */}
          <div className="flex items-center gap-3 xl:gap-6 min-w-0">
            <Link
              href="/"
              className="group flex items-center gap-2.5 sm:gap-3 tracking-tight transition shrink-0"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-800 text-amber-100 shadow-sm transition-transform group-hover:scale-105 border border-amber-700/50">
                <Flame className="h-5 w-5 text-amber-300" />
              </div>
              <div className="flex flex-col whitespace-nowrap">
                <span className="font-serif text-xl sm:text-2xl font-bold text-stone-900 leading-none">
                  Bếp Quê<span className="text-amber-800">.vn</span>
                </span>
                <span className="text-[10px] font-medium text-stone-500 leading-none mt-1">
                  Hương vị đồng quê mộc mạc
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="whitespace-nowrap shrink-0 rounded-xl px-2.5 xl:px-3 py-1.5 text-xs xl:text-sm font-semibold text-stone-700 transition-colors hover:bg-amber-50 hover:text-amber-900"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right Action Icons & Search */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Desktop Search Bar (Fixed width on large screens, perfectly bounded) */}
            <form
              onSubmit={handleSearchSubmit}
              className="relative hidden 2xl:block w-52"
            >
              <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={navSearchQuery}
                onChange={(e) => setNavSearchQuery(e.target.value)}
                placeholder="Tìm món niêu, cá kho..."
                className="h-9 w-full rounded-full border border-stone-200 bg-stone-50/90 pl-9 pr-7 text-xs text-stone-800 placeholder-stone-400 transition focus:border-amber-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
              {navSearchQuery && (
                <button
                  type="button"
                  onClick={() => setNavSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </form>

            {/* Search Toggle Button for Screens without permanent navbar input */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              aria-label="Tìm kiếm món ăn"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
                isSearchOpen
                  ? "bg-amber-100 text-amber-900"
                  : "text-stone-600 hover:bg-amber-50 hover:text-amber-800"
              } 2xl:hidden`}
            >
              {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>

            {/* Wishlist Button */}
            <button
              type="button"
              aria-label="Món ăn yêu thích"
              className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-stone-600 transition hover:bg-amber-50 hover:text-amber-800"
            >
              <Heart className="h-5 w-5" />
            </button>

            {/* Cart Button */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label="Giỏ hàng mâm cơm"
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-stone-700 transition hover:bg-amber-50 hover:text-amber-900"
            >
              <ShoppingBag className="h-5 w-5" />
              {displayCartCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-800 text-[10px] font-bold text-amber-100 shadow-sm animate-in zoom-in-50">
                  {displayCartCount}
                </span>
              )}
            </button>

            {/* Sign In Button - Warm Light Theme Style */}
            <button
              type="button"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-amber-800 px-4 py-2 text-xs xl:text-sm font-semibold text-white shadow-xs transition hover:bg-amber-900 active:scale-95 whitespace-nowrap shrink-0"
            >
              <User className="h-3.5 w-3.5 text-amber-200 shrink-0" />
              <span className="whitespace-nowrap">Đăng nhập</span>
            </button>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(!isOpen);
                setIsSearchOpen(false);
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-800 transition hover:bg-amber-50 lg:hidden"
              aria-expanded={isOpen}
              aria-label="Menu điều hướng"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Dropdown Search Bar for Mobile & Medium Viewports (Zero Overlap Guaranteed) */}
        {isSearchOpen && (
          <div className="border-t border-stone-200/80 bg-white/98 px-4 py-3 shadow-md backdrop-blur-md 2xl:hidden animate-in slide-in-from-top-2 duration-200">
            <form onSubmit={handleSearchSubmit} className="mx-auto max-w-2xl relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                autoFocus
                value={navSearchQuery}
                onChange={(e) => setNavSearchQuery(e.target.value)}
                placeholder="Tìm món niêu, cá kho, lẩu mắm, canh chua..."
                className="h-11 w-full rounded-full border border-amber-900/20 bg-stone-50/80 pl-10 pr-24 text-sm text-stone-900 placeholder-stone-400 focus:border-amber-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-amber-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-900 transition"
              >
                Tìm
              </button>
            </form>
          </div>
        )}

        {/* Mobile Navigation Dropdown Menu */}
        {isOpen && (
          <div className="border-b border-amber-900/15 bg-white px-4 pt-3 pb-6 shadow-xl lg:hidden">
            {/* Mobile Search */}
            <form onSubmit={handleSearchSubmit} className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={navSearchQuery}
                onChange={(e) => setNavSearchQuery(e.target.value)}
                placeholder="Tìm kiếm món ăn quê..."
                className="h-10 w-full rounded-xl border border-amber-900/20 bg-stone-50 pl-10 pr-4 text-base sm:text-sm text-stone-800 placeholder-stone-400 focus:border-amber-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </form>

            {/* Mobile Navigation Links */}
            <nav className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-amber-100/70 hover:text-amber-900"
                >
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>

            <div className="mt-4 border-t border-amber-900/10 pt-4 space-y-3">
              <div className="flex items-center justify-between px-2 text-xs text-stone-600">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-700" />
                  <span>Bếp đỏ lửa: 07:00 - 22:00</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <PhoneCall className="h-3.5 w-3.5 text-amber-700" />
                  <span>Đặt cỗ: 1900 6868</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsCartOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-amber-900/20 bg-stone-50 py-2.5 text-sm font-medium text-stone-700 hover:bg-amber-50"
                >
                  <ShoppingBag className="h-4 w-4 text-amber-800" />
                  <span>Giỏ hàng ({displayCartCount})</span>
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-xl bg-amber-800 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-900"
                >
                  <User className="h-4 w-4" />
                  <span>Đăng nhập</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
