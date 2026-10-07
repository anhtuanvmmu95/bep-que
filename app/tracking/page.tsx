"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TurnstileWidget, { TurnstileWidgetRef } from "@/components/TurnstileWidget";
import type { SanitizedTrackingOrder } from "@/lib/db/orders-repository";
import {
  Search,
  Clock,
  MapPin,
  Flame,
  CheckCircle2,
  Truck,
  PackageCheck,
  FileText,
  CreditCard,
  Banknote,
  QrCode,
  ArrowLeft,
  Share2,
  PhoneCall,
  Utensils,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
} from "lucide-react";

const ORDER_STEPS = [
  {
    key: "PENDING",
    label: "Đã tiếp nhận đơn",
    desc: "Nhà bếp đã nhận đơn và lên thực đơn",
    icon: FileText,
  },
  {
    key: "PREPARING",
    label: "Đang đỏ lửa nấu niêu",
    desc: "Kho cá, nấu cơm niêu than hồng",
    icon: Flame,
  },
  {
    key: "PACKING",
    label: "Đóng hộp giữ nhiệt",
    desc: "Niêm phong niêu đất trong túi ủ nóng",
    icon: PackageCheck,
  },
  {
    key: "DELIVERING",
    label: "Tài xế đang giao",
    desc: "Đang trên đường mang đến tận nhà",
    icon: Truck,
  },
  {
    key: "COMPLETED",
    label: "Giao thành công",
    desc: "Mâm cơm nóng hổi đã tới tay bạn",
    icon: CheckCircle2,
  },
];

function TrackingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const codeParam = searchParams.get("code") || searchParams.get("id") || "";
  const tokenParam = searchParams.get("token") || "";
  const [searchInput, setSearchInput] = useState(codeParam);
  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileWidgetRef>(null);
  const [order, setOrder] = useState<SanitizedTrackingOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchOrder = async (queryValue: string, explicitToken?: string) => {
    if (!queryValue.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const trimmed = queryValue.trim();
      let token = explicitToken || tokenParam;

      // Look up locally stored token for this device/session if not in URL
      if (!token && typeof window !== "undefined") {
        try {
          const stored = JSON.parse(
            localStorage.getItem("bepque_order_tokens") || "{}"
          );
          token = stored[trimmed.toUpperCase()] || "";
        } catch {
          // Ignore localStorage errors
        }
      }

      let url = "";
      if (trimmed.startsWith("BQ-") || trimmed.startsWith("bq-")) {
        url = token
          ? `/api/orders?code=${encodeURIComponent(trimmed)}&token=${encodeURIComponent(token)}`
          : `/api/orders?code=${encodeURIComponent(trimmed)}`;
      } else {
        url = token
          ? `/api/orders?code=${encodeURIComponent(trimmed)}&token=${encodeURIComponent(token)}`
          : `/api/orders?token=${encodeURIComponent(trimmed)}`;
      }

      // Gửi kèm Turnstile token và Honeypot field nếu có
      if (turnstileToken) {
        url += `&turnstileToken=${encodeURIComponent(turnstileToken)}`;
      }
      if (honeypot) {
        url += `&hp_field=${encodeURIComponent(honeypot)}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.success || !data.order) {
        setOrder(null);
        if (res.status === 403) {
          setErrorMessage(
            "Truy cập bị từ chối (Bảo mật IDOR): Để bảo vệ quyền riêng tư người nhận, hệ thống yêu cầu mã Token tra cứu hợp lệ. Vui lòng mở đường liên kết theo dõi được cấp khi đặt hàng."
          );
        } else {
          setErrorMessage(
            data.error ||
              `Không tìm thấy thông tin đơn hàng "${queryValue}". Vui lòng kiểm tra lại mã tra cứu.`
          );
        }
      } else {
        setOrder(data.order);
      }
    } catch {
      setErrorMessage("Không thể kết nối đến máy chủ tra cứu. Vui lòng thử lại sau!");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (codeParam || tokenParam) {
      queueMicrotask(() => {
        setSearchInput(codeParam || tokenParam);
        void fetchOrder(codeParam || tokenParam, tokenParam);
      });
    }
  }, [codeParam, tokenParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    const val = searchInput.trim();

    let token = tokenParam;
    if (!token && typeof window !== "undefined") {
      try {
        const stored = JSON.parse(
          localStorage.getItem("bepque_order_tokens") || "{}"
        );
        token = stored[val.toUpperCase()] || "";
      } catch {
        // ignore
      }
    }

    const nextUrl = token
      ? `/tracking?code=${encodeURIComponent(val.toUpperCase())}&token=${encodeURIComponent(token)}`
      : `/tracking?code=${encodeURIComponent(val.toUpperCase())}`;

    router.push(nextUrl);
    fetchOrder(val, token);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "full",
        timeStyle: "short",
      }).format(d);
    } catch {
      return dateString;
    }
  };

  // Determine active step index
  const getActiveStepIndex = (status: string) => {
    switch (status) {
      case "PENDING":
        return 0;
      case "CONFIRMED":
      case "PREPARING":
        return 1;
      case "PACKING":
        return 2;
      case "DELIVERING":
        return 3;
      case "COMPLETED":
        return 4;
      default:
        return 1;
    }
  };

  const activeStep = order ? getActiveStepIndex(order.status) : 1;

  return (
    <div className="py-8 sm:py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-amber-900/15 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-stone-700 hover:bg-amber-50 hover:text-amber-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về mâm cơm Bếp Quê</span>
          </Link>

          <div className="flex items-center gap-2">
            <a
              href="tel:19006868"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-900/15 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-amber-100/60 hover:text-amber-900 transition"
            >
              <PhoneCall className="w-3.5 h-3.5 text-amber-700" />
              <span>Hotline: 1900 6868</span>
            </a>
          </div>
        </div>

        {/* Page Title & Search Box */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100/70 px-3 py-1 rounded-full border border-amber-900/10">
            <Truck className="w-3.5 h-3.5" />
            Trực tiếp từ nhà bếp
          </span>
          <h1 className="font-serif mt-3 text-3xl sm:text-4xl font-extrabold text-stone-900">
            Theo Dõi Mâm Cơm Quê
          </h1>
          <p className="mt-2 text-sm text-stone-600 leading-relaxed">
            Nhập mã đơn hàng để theo dõi tiến độ nấu niêu đất, đóng hộp giữ nhiệt và vị trí tài xế giao tới nhà bạn.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="mt-6 flex flex-col gap-2 max-w-lg mx-auto">
            {/* Honeypot field (Ẩn đối với người thường, bẫy bot crawler) */}
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
              <label htmlFor="tracking_hp_field">Website</label>
              <input
                id="tracking_hp_field"
                type="text"
                name="bepque_hp_token"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Nhập mã đơn (Ví dụ: BQ-20261006-6006)"
                  className="h-12 w-full rounded-full border border-amber-900/20 bg-white pl-10 pr-4 text-base sm:text-sm font-medium uppercase text-stone-900 placeholder:normal-case placeholder-stone-400 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-amber-800 px-6 text-sm font-semibold text-amber-100 shadow-md hover:bg-amber-900 transition disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Đang tìm...</span>
                ) : (
                  <>
                    <span>Tra cứu</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Cloudflare Turnstile Bot Protection */}
            <TurnstileWidget
              ref={turnstileRef}
              onVerify={(token) => setTurnstileToken(token)}
              size="flexible"
              theme="light"
              className="mt-1"
            />
          </form>

          {/* Quick suggestions */}
          <div className="mt-3 text-xs text-stone-500">
            <span>Mã mẫu thử nghiệm: </span>
            <button
              type="button"
              onClick={() => {
                setSearchInput("BQ-20261006-6006");
                router.push(
                  "/tracking?code=BQ-20261006-6006&token=demo-token-bq-6006"
                );
                fetchOrder("BQ-20261006-6006", "demo-token-bq-6006");
              }}
              className="font-mono text-amber-900 font-bold hover:underline"
            >
              BQ-20261006-6006 (kèm token)
            </button>
          </div>
        </div>

        {/* ERROR STATE */}
        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center text-xs sm:text-sm text-red-700 space-y-2 mb-8 animate-in fade-in duration-200">
            <AlertCircle className="w-6 h-6 mx-auto text-red-600" />
            <p className="font-semibold">{errorMessage}</p>
            <p className="text-xs text-red-600/80">
              Nếu vừa đặt hàng, quý khách có thể kiểm tra lại tin nhắn hoặc gọi hotline <strong>1900 6868</strong> để được hỗ trợ tức thì.
            </p>
          </div>
        )}

        {/* ORDER DETAILS & STATUS TRACKER */}
        {order && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Top Order Badge Card */}
            <div className="rounded-3xl border border-amber-900/15 bg-white p-6 sm:p-7 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-amber-900/10 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
                      Mã đơn: <span className="text-amber-900 font-mono">{order.orderCode}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(order.orderCode);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="p-1 rounded-md text-stone-400 hover:text-amber-800 transition"
                      title="Sao chép mã đơn"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="text-xs text-stone-500 mt-1">
                    Đặt lúc: {formatDate(order.createdAt)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1.5 text-xs font-bold text-amber-900 border border-amber-900/15">
                    <Flame className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                    <span>{ORDER_STEPS[activeStep].label}</span>
                  </span>
                </div>
              </div>

              {/* TIMELINE STEPPER */}
              <div className="pt-8 pb-4">
                <div className="relative">
                  {/* Desktop horizontal progress track line */}
                  <div className="absolute top-5 left-6 right-6 h-1 bg-stone-200 hidden sm:block -z-0">
                    <div
                      className="h-full bg-amber-800 transition-all duration-500"
                      style={{ width: `${(activeStep / (ORDER_STEPS.length - 1)) * 100}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 sm:gap-2">
                    {ORDER_STEPS.map((step, idx) => {
                      const Icon = step.icon;
                      const isPassed = idx <= activeStep;
                      const isCurrent = idx === activeStep;

                      return (
                        <div
                          key={step.key}
                          className="flex sm:flex-col items-start sm:items-center text-left sm:text-center gap-3.5 sm:gap-2 relative z-10"
                        >
                          {/* Mobile vertical connector line to next step */}
                          {idx < ORDER_STEPS.length - 1 && (
                            <div
                              className={`absolute left-[21px] top-11 bottom-[-24px] w-0.5 sm:hidden ${
                                idx < activeStep ? "bg-amber-800" : "bg-stone-200"
                              }`}
                            />
                          )}

                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 transition-all ${
                              isCurrent
                                ? "border-amber-800 bg-amber-800 text-amber-100 shadow-lg shadow-amber-900/30 scale-105"
                                : isPassed
                                ? "border-amber-700 bg-amber-100 text-amber-800"
                                : "border-stone-200 bg-white text-stone-400"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>

                          <div className="pt-0.5 sm:pt-0">
                            <div
                              className={`text-xs sm:text-sm font-bold ${
                                isCurrent
                                  ? "text-amber-900"
                                  : isPassed
                                  ? "text-stone-900"
                                  : "text-stone-400"
                              }`}
                            >
                              {step.label}
                            </div>
                            <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-2 max-w-[200px] sm:max-w-[140px]">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ORDER INFO & ITEMS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Delivery & Payment Details */}
              <div className="lg:col-span-6 space-y-6">
                {/* Delivery Information */}
                <div className="rounded-3xl border border-amber-900/15 bg-white p-6 shadow-xs space-y-4">
                  <h3 className="font-serif text-base font-bold text-stone-900 flex items-center gap-2 border-b border-amber-900/10 pb-3">
                    <MapPin className="w-4 h-4 text-amber-800" />
                    <span>Thông tin giao hàng</span>
                  </h3>

                  <div className="space-y-3 text-xs sm:text-sm">
                    <div>
                      <span className="text-stone-400 text-xs">Người nhận mâm cơm:</span>
                      <div className="font-bold text-stone-900 mt-0.5">
                        {order.recipientName} • <span className="font-mono text-amber-900">{order.phone}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-stone-400 text-xs">Địa chỉ nhận niêu:</span>
                      <div className="font-medium text-stone-800 mt-0.5 leading-relaxed">
                        {order.address}, {order.districtName}, {order.city}
                      </div>
                    </div>

                    <div className="rounded-xl border border-amber-900/10 bg-amber-50/50 p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-900 font-semibold text-xs">
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        <span>Thời gian giao dự kiến:</span>
                      </div>
                      <div className="font-bold text-stone-900 text-xs sm:text-sm">
                        {order.timing}
                      </div>
                      {order.deliveryNote && (
                        <div className="text-xs text-stone-600 italic pt-1 border-t border-amber-900/10 mt-1">
                          Lời nhắn tài xế: &quot;{order.deliveryNote}&quot;
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                <div className="rounded-3xl border border-amber-900/15 bg-white p-6 shadow-xs space-y-4">
                  <h3 className="font-serif text-base font-bold text-stone-900 flex items-center gap-2 border-b border-amber-900/10 pb-3">
                    <CreditCard className="w-4 h-4 text-amber-800" />
                    <span>Phương thức thanh toán</span>
                  </h3>

                  <div className="space-y-3 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Hình thức:</span>
                      <span className="font-bold text-stone-900 flex items-center gap-1.5">
                        {order.paymentMethod === "cod" ? (
                          <>
                            <Banknote className="w-4 h-4 text-amber-800" />
                            <span>Tiền mặt khi nhận hàng (COD)</span>
                          </>
                        ) : (
                          <>
                            <QrCode className="w-4 h-4 text-amber-800" />
                            <span>Chuyển khoản VietQR</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Trạng thái:</span>
                      <span
                        className={`font-semibold px-2.5 py-0.5 rounded-full text-xs ${
                          order.paymentStatus === "PAID"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {order.paymentStatus === "PAID" ? "Đã thanh toán" : "Thanh toán khi nhận niêu"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Ordered Items List & Total */}
              <div className="lg:col-span-6 space-y-6">
                <div className="rounded-3xl border border-amber-900/15 bg-white p-6 shadow-xs space-y-4">
                  <h3 className="font-serif text-base font-bold text-stone-900 flex items-center gap-2 border-b border-amber-900/10 pb-3">
                    <Utensils className="w-4 h-4 text-amber-800" />
                    <span>Mâm cơm đã đặt ({order.items.reduce((s, i) => s + i.quantity, 0)} món)</span>
                  </h3>

                  <div className="divide-y divide-stone-100 max-h-72 overflow-y-auto pr-1 space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="pt-2 first:pt-0 pb-2">
                        <div className="flex justify-between font-bold text-xs sm:text-sm text-stone-900">
                          <span>
                            {item.name} <span className="text-amber-800">x{item.quantity}</span>
                          </span>
                          <span className="font-serif text-amber-900">
                            {formatPrice(item.subtotal)}
                          </span>
                        </div>

                        {/* Options summary */}
                        <div className="text-[11px] text-stone-500 mt-0.5 space-y-0.5">
                          {item.portion && <div>• Khẩu phần: {item.portion}</div>}
                          {item.spicyNote && <div>• Độ cay: <span className="text-amber-800 font-medium">{item.spicyNote}</span></div>}
                          {item.sweetNote && <div>• Khẩu vị: {item.sweetNote}</div>}
                          {item.extras && item.extras.length > 0 && (
                            <div>• Kèm: {item.extras.map((e) => e.name).join(", ")}</div>
                          )}
                          {item.specialNote && (
                            <div className="italic text-stone-400 truncate">&quot;{item.specialNote}&quot;</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Financial breakdown */}
                  <div className="border-t border-amber-900/10 pt-4 space-y-2 text-xs text-stone-600">
                    <div className="flex justify-between">
                      <span>Tiền món ăn:</span>
                      <span className="font-semibold text-stone-800">{formatPrice(order.subtotalAmount)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Phí giao niêu đất:</span>
                      {order.shippingFee === 0 ? (
                        <span className="font-bold text-emerald-700">Miễn phí</span>
                      ) : (
                        <span className="font-semibold text-stone-800">{formatPrice(order.shippingFee)}</span>
                      )}
                    </div>

                    {order.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Giảm giá voucher:</span>
                        <span>-{formatPrice(order.discountAmount)}</span>
                      </div>
                    )}

                    <div className="border-t border-stone-200/80 pt-3 flex items-baseline justify-between text-base">
                      <span className="font-serif font-bold text-stone-900">Tổng thanh toán:</span>
                      <span className="font-serif text-2xl font-extrabold text-amber-900">
                        {formatPrice(order.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Support CTA */}
                  <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row items-center gap-2">
                    <a
                      href="tel:19006868"
                      className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 rounded-xl border border-amber-900/20 py-2.5 text-xs font-semibold text-stone-800 hover:bg-amber-50 transition"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-amber-800" />
                      <span>Cần hỗ trợ đơn hàng</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: `Theo dõi đơn hàng ${order.orderCode} - Bếp Quê`,
                            url: window.location.href,
                          });
                        } else {
                          navigator.clipboard.writeText(window.location.href);
                          alert("Đã sao chép liên kết theo dõi đơn hàng!");
                        }
                      }}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-amber-800 px-4 py-2.5 text-xs font-semibold text-amber-100 hover:bg-amber-900 transition"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Chia sẻ</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FCFAF7] text-stone-900">
      <Navbar />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="py-20 text-center text-sm text-stone-500">
              <Sparkles className="w-6 h-6 mx-auto text-amber-800 animate-pulse mb-2" />
              <span>Đang kết nối hệ thống theo dõi đơn hàng...</span>
            </div>
          }
        >
          <TrackingContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
