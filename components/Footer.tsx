"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import TurnstileWidget, { TurnstileWidgetRef } from "@/components/TurnstileWidget";
import {
  Flame,
  Heart,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  Send,
  MessageCircle,
  Globe,
  Share2,
  Wheat,
  Check,
} from "lucide-react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileWidgetRef>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          bepque_hp_token: honeypot,
          turnstileToken: turnstileToken || undefined,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setIsSuccess(true);
        setMessage(data.message || "Đăng ký nhận ưu đãi thành công!");
        setEmail("");
        setHoneypot("");
        turnstileRef.current?.reset();
      } else {
        setIsSuccess(false);
        setMessage(data.error || "Không thể đăng ký. Vui lòng kiểm tra lại email.");
      }
    } catch {
      setIsSuccess(false);
      setMessage("Lỗi kết nối máy chủ. Vui lòng thử lại sau!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer id="contact" className="mt-auto border-t border-stone-200 bg-white">
      {/* Rustic Newsletter Banner */}
      <div className="border-b border-stone-200 bg-[#FCFAF7] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">
                <Wheat className="w-4 h-4 text-amber-700" />
                <span>Bếp lửa truyền thống</span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-stone-900">
                Nhận ưu đãi 20% mâm cơm đầu tiên
              </h3>
              <p className="mt-1 text-sm text-stone-600">
                Đăng ký email để nhận mã giảm giá và gợi ý thực đơn món quê tươi mới mỗi ngày.
              </p>
            </div>
            <div className="w-full max-w-md">
              <form
                onSubmit={handleSubscribe}
                className="flex flex-col gap-2 w-full"
              >
                {/* Honeypot field (Ẩn đối với người dùng thông thường, bẫy spam bot) */}
                <div
                  style={{
                    position: "absolute",
                    left: "-9999px",
                    opacity: 0,
                    height: "1px",
                    width: "1px",
                    overflow: "hidden",
                    pointerEvents: "none",
                  }}
                  aria-hidden="true"
                >
                  <label htmlFor="newsletter_bepque_hp_token">Website</label>
                  <input
                    id="newsletter_bepque_hp_token"
                    type="text"
                    name="bepque_hp_token"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <div className="flex w-full items-center gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Nhập email của bạn..."
                    required
                    className="h-11 flex-1 rounded-full border border-amber-900/20 bg-white px-4 text-base sm:text-sm text-stone-800 placeholder-stone-400 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-amber-800 px-6 text-sm font-semibold text-amber-100 shadow-sm transition hover:bg-amber-900 active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Đang gửi...</span>
                    ) : isSuccess ? (
                      <>
                        <span>Đã lưu</span>
                        <Check className="h-4 w-4 text-amber-300" />
                      </>
                    ) : (
                      <>
                        <span>Đăng ký</span>
                        <Send className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>

                {/* Cloudflare Turnstile Bot Protection Widget */}
                <TurnstileWidget
                  ref={turnstileRef}
                  onVerify={(token) => setTurnstileToken(token)}
                  size="flexible"
                  theme="light"
                  className="mt-1"
                />
              </form>
              {message && (
                <p
                  className={`mt-2 text-xs font-medium ${
                    isSuccess ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {message}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand & Introduction */}
          <div className="lg:col-span-2 space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-3 tracking-tight"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-800 text-amber-100 shadow-md shadow-amber-950/20 border border-amber-700/50">
                <Flame className="h-5 w-5 text-amber-300" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-xl font-extrabold text-stone-900 leading-none">
                  Bếp Quê<span className="text-amber-800">.vn</span>
                </span>
                <span className="text-[10px] font-medium text-stone-500 leading-none mt-1 italic">
                  Hương vị đồng quê mộc mạc
                </span>
              </div>
            </Link>

            <p className="max-w-sm text-sm text-stone-600 leading-relaxed">
              Tái hiện trọn vẹn hương vị mâm cơm quê nhà với niêu đất đỏ lửa, cá đồng tươi rói và rau vườn sạch tươi xanh. Đưa hồn quê Việt về bên mâm cơm gia đình hiện đại.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <a
                href="#contact"
                aria-label="Chia sẻ"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-200 text-stone-700 transition hover:bg-amber-800 hover:text-white"
              >
                <Share2 className="h-4 w-4" />
              </a>
              <a
                href="#contact"
                aria-label="Nhắn tin"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-200 text-stone-700 transition hover:bg-amber-800 hover:text-white"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <a
                href="#contact"
                aria-label="Trang chủ"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-200 text-stone-700 transition hover:bg-amber-800 hover:text-white"
              >
                <Globe className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Menu Categories */}
          <div>
            <h4 className="font-serif text-sm font-bold uppercase tracking-wider text-stone-900 mb-4">
              Mâm cơm quê
            </h4>
            <ul className="space-y-2.5 text-sm text-stone-600">
              <li>
                <Link href="#menu" className="transition hover:text-amber-800">
                  Cơm niêu đất cháy giòn
                </Link>
              </li>
              <li>
                <Link href="#menu" className="transition hover:text-amber-800">
                  Cá đồng nướng trui & kho tộ
                </Link>
              </li>
              <li>
                <Link href="#menu" className="transition hover:text-amber-800">
                  Thịt kho quẹt & Rau vườn luộc
                </Link>
              </li>
              <li>
                <Link href="#menu" className="transition hover:text-amber-800">
                  Canh cua mồng tơi cà pháo
                </Link>
              </li>
              <li>
                <Link href="#menu" className="transition hover:text-amber-800">
                  Lẩu mắm & lẩu cua đồng
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Support */}
          <div>
            <h4 className="font-serif text-sm font-bold uppercase tracking-wider text-stone-900 mb-4">
              Chăm sóc thực khách
            </h4>
            <ul className="space-y-2.5 text-sm text-stone-600">
              <li>
                <Link href="#" className="transition hover:text-amber-800">
                  Đặt cỗ quê & tiệc gia đình
                </Link>
              </li>
              <li>
                <Link href="#" className="transition hover:text-amber-800">
                  Chính sách giao niêu đất giữ nhiệt
                </Link>
              </li>
              <li>
                <Link href="#" className="transition hover:text-amber-800">
                  Cam kết vệ sinh an toàn
                </Link>
              </li>
              <li>
                <Link href="#" className="transition hover:text-amber-800">
                  Hỏi đáp thường gặp (FAQ)
                </Link>
              </li>
              <li>
                <Link href="#" className="transition hover:text-amber-800">
                  Điều khoản & Quy định
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Hours */}
          <div>
            <h4 className="font-serif text-sm font-bold uppercase tracking-wider text-stone-900 mb-4">
              Thông tin quán quê
            </h4>
            <ul className="space-y-3 text-sm text-stone-600">
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-amber-800 mt-0.5" />
                <span>Số 18 Ngõ Làng Gốm, Cầu Giấy, Hà Nội</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-amber-800" />
                <span className="font-semibold text-stone-800">1900 6868 - 0912 345 678</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-amber-800" />
                <span>bepque@foodie.vn</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 shrink-0 text-amber-800" />
                <span>Đỏ lửa: 07:00 - 22:00 mỗi ngày</span>
              </li>
              <li className="flex items-center gap-2.5 pt-1">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" />
                <span className="text-xs text-emerald-800 font-medium">Nguyên liệu sạch từ vườn quê</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-amber-900/10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-3">
          <p>© {new Date().getFullYear()} Bếp Quê Việt Nam. Giữ trọn tinh hoa ẩm thực truyền thống.</p>
          <div className="flex items-center gap-4 text-xs">
            <Link href="#" className="hover:text-stone-800 transition">Bảo mật</Link>
            <span>•</span>
            <Link href="#" className="hover:text-stone-800 transition">Quy chế hoạt động</Link>
            <span>•</span>
            <span className="flex items-center gap-1">
              Gìn giữ với <Heart className="h-3 w-3 fill-red-600 text-red-600" /> hương vị quê hương
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
