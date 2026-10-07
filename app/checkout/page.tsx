"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/lib/context/CartContext";
import {
  DISTRICTS_DATA,
  DistrictInfo,
  calculateShippingFee,
  CITIES,
} from "@/lib/data/districts";
import {
  MapPin,
  Clock,
  Phone,
  User,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  Truck,
  Flame,
  CreditCard,
  Banknote,
  QrCode,
  Calendar,
  AlertCircle,
  Tag,
  FileText,
  Copy,
  Check,
  Info,
} from "lucide-react";

const DELIVERY_TIME_SLOTS = [
  "Giao ngay càng sớm càng tốt",
  "11:30 - 12:00 (Bữa trưa hôm nay)",
  "12:00 - 12:30 (Bữa trưa hôm nay)",
  "12:30 - 13:00 (Bữa trưa hôm nay)",
  "18:00 - 18:30 (Bữa tối hôm nay)",
  "18:30 - 19:00 (Bữa tối hôm nay)",
  "19:00 - 19:30 (Bữa tối hôm nay)",
  "19:30 - 20:00 (Bữa tối hôm nay)",
  "11:30 - 12:30 (Trưa mai)",
  "18:00 - 19:00 (Tối mai)",
];

const CHANGE_OPTIONS = [
  "Tôi có tiền vừa đủ",
  "Cần thối từ 500.000đ",
  "Cần thối từ 200.000đ",
  "Khác (ghi chú riêng)",
];

export default function CheckoutPage() {
  const { items, totalPrice, totalCount, clearCart } = useCart();

  // Recipient form state
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [selectedCity, setSelectedCity] = useState<"Hà Nội" | "TP. Hồ Chí Minh">("Hà Nội");

  // Filter districts by selected city
  const cityDistricts = useMemo(() => {
    return DISTRICTS_DATA.filter((d) => d.city === selectedCity);
  }, [selectedCity]);

  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(cityDistricts[0].id);
  const [addressLine, setAddressLine] = useState("");

  // Delivery time notes state
  const [deliveryTimingType, setDeliveryTimingType] = useState<"asap" | "scheduled">("asap");
  const [scheduledSlot, setScheduledSlot] = useState(DELIVERY_TIME_SLOTS[1]);
  const [deliveryNote, setDeliveryNote] = useState("");

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "vietqr">("cod");
  const [codChangeOption, setCodChangeOption] = useState<string>(CHANGE_OPTIONS[0]);
  const [isQrConfirmed, setIsQrConfirmed] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Order submission state
  const [honeypot, setHoneypot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{
    orderCode: string;
    trackingToken: string;
    recipientName: string;
    phone: string;
    address: string;
    districtName: string;
    cityName: string;
    timing: string;
    deliveryNote: string;
    totalAmount: number;
    paymentMethod: "cod" | "vietqr";
    codChangeNote?: string;
    itemsCount: number;
  } | null>(null);

  // Selected district info
  const selectedDistrict: DistrictInfo = useMemo(() => {
    return (
      cityDistricts.find((d) => d.id === selectedDistrictId) ||
      cityDistricts[0]
    );
  }, [cityDistricts, selectedDistrictId]);

  // Calculate dynamic shipping fee based on district & subtotal
  const shippingCalculation = useMemo(() => {
    return calculateShippingFee(totalPrice, selectedDistrict, appliedCoupon || undefined);
  }, [totalPrice, selectedDistrict, appliedCoupon]);

  // Coupon discount calculation
  const couponDiscount = useMemo(() => {
    if (appliedCoupon === "BEPQUE20" && totalPrice >= 100000) return 20000;
    return 0;
  }, [appliedCoupon, totalPrice]);

  const finalTotal = Math.max(0, totalPrice + shippingCalculation.fee - couponDiscount);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  // VietQR parameters
  const bankInfo = {
    bankName: "MB Bank (Ngân hàng Quân Đội)",
    accountNumber: "0912345678",
    accountHolder: "BEP QUE VIET NAM",
    memoPrefix: `BEPQUE ${phoneNumber ? phoneNumber.slice(-4) : "8941"}`,
  };

  const vietQrUrl = useMemo(() => {
    const memo = encodeURIComponent(bankInfo.memoPrefix);
    return `https://img.vietqr.io/image/MB-0912345678-compact2.png?amount=${finalTotal}&addInfo=${memo}&accountName=BEP%20QUE%20VIET%20NAM`;
  }, [finalTotal, bankInfo.memoPrefix]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    const code = couponCode.trim().toUpperCase();

    if (code === "FOODIE99") {
      setAppliedCoupon("FOODIE99");
    } else if (code === "BEPQUE20") {
      if (totalPrice < 100000) {
        setCouponError("Mã BEPQUE20 yêu cầu đơn hàng tối thiểu 100.000đ");
        return;
      }
      setAppliedCoupon("BEPQUE20");
    } else {
      setCouponError("Mã giảm giá không hợp lệ. Thử mã FOODIE99 hoặc BEPQUE20");
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !phoneNumber.trim() || !addressLine.trim()) {
      alert("Vui lòng điền đầy đủ họ tên, số điện thoại và số nhà/đường!");
      return;
    }

    if (items.length === 0) {
      alert("Mâm cơm của bạn chưa có món ăn nào!");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          email: email.trim() || undefined,
          addressLine: addressLine.trim(),
          city: selectedCity,
          districtId: selectedDistrict.id,
          deliveryTimingType,
          scheduledSlot: deliveryTimingType === "scheduled" ? scheduledSlot : undefined,
          deliveryNote: deliveryNote.trim() || undefined,
          paymentMethod,
          codChangeOption: paymentMethod === "cod" ? codChangeOption : undefined,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            portion: item.portion,
            extras: item.extras?.map((e) => ({ name: e.name })),
            spicyNote: item.spicyNote,
            sweetNote: item.sweetNote,
            specialNote: item.specialNote,
          })),
          couponCode: appliedCoupon || undefined,
          bepque_hp_token: honeypot || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể lưu đơn hàng vào hệ thống");
      }

      const saved = data.order;
      const trackingToken = data.trackingToken || saved.trackingToken;

      try {
        const storedTokens = JSON.parse(
          localStorage.getItem("bepque_order_tokens") || "{}"
        );
        storedTokens[saved.orderCode.toUpperCase()] = trackingToken;
        localStorage.setItem("bepque_order_tokens", JSON.stringify(storedTokens));
      } catch {
        // Ignore localStorage error if disabled
      }

      setOrderSuccess({
        orderCode: saved.orderCode,
        trackingToken,
        recipientName: saved.recipientName,
        phone: saved.phone,
        address: saved.address,
        districtName: saved.districtName,
        cityName: saved.city,
        timing: saved.timing,
        deliveryNote: saved.deliveryNote || "",
        totalAmount: saved.totalAmount,
        paymentMethod,
        codChangeNote: paymentMethod === "cod" ? codChangeOption : undefined,
        itemsCount: totalCount,
      });

      clearCart();
    } catch (err: unknown) {
      console.error("Order error:", err);
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi khi gửi đơn hàng. Vui lòng thử lại!";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS SCREEN
  if (orderSuccess) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FCFAF7] text-stone-900">
        <Navbar />
        <main className="flex-1 py-12 sm:py-16">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-amber-900/15 bg-white p-6 sm:p-10 shadow-xl text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/80 px-3 py-1 text-xs font-semibold text-amber-900 border border-amber-900/10">
                  <Flame className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                  Bếp đang nhóm than hồng chuẩn bị niêu đất!
                </span>
                <h1 className="font-serif mt-3 text-2xl sm:text-3xl font-extrabold text-stone-900">
                  Đặt Mâm Cơm Quê Thành Công!
                </h1>
                <p className="mt-1 text-sm text-stone-500">
                  Mã đơn hàng: <strong className="text-amber-900">{orderSuccess.orderCode}</strong>
                </p>
              </div>

              {/* Order summary card */}
              <div className="rounded-2xl border border-amber-900/10 bg-amber-50/40 p-5 text-left text-xs sm:text-sm space-y-3">
                <div className="flex justify-between border-b border-amber-900/10 pb-2">
                  <span className="text-stone-500">Người nhận:</span>
                  <span className="font-semibold text-stone-900">
                    {orderSuccess.recipientName} ({orderSuccess.phone})
                  </span>
                </div>
                <div className="flex justify-between border-b border-amber-900/10 pb-2">
                  <span className="text-stone-500">Địa chỉ giao:</span>
                  <span className="font-medium text-stone-800 text-right max-w-xs">
                    {orderSuccess.address}, {orderSuccess.districtName}, {orderSuccess.cityName}
                  </span>
                </div>
                <div className="flex justify-between border-b border-amber-900/10 pb-2">
                  <span className="text-stone-500">Thời gian nhận niêu:</span>
                  <span className="font-semibold text-amber-900">
                    {orderSuccess.timing}
                  </span>
                </div>
                {orderSuccess.deliveryNote && (
                  <div className="flex justify-between border-b border-amber-900/10 pb-2">
                    <span className="text-stone-500">Ghi chú cho tài xế:</span>
                    <span className="italic text-stone-700">{orderSuccess.deliveryNote}</span>
                  </div>
                )}

                {/* Payment method breakdown */}
                <div className="flex justify-between border-b border-amber-900/10 pb-2">
                  <span className="text-stone-500">Hình thức thanh toán:</span>
                  <div className="text-right">
                    <span className="font-semibold text-stone-900">
                      {orderSuccess.paymentMethod === "cod"
                        ? "Thanh toán tiền mặt khi nhận hàng (COD)"
                        : "Chuyển khoản VietQR"}
                    </span>
                    {orderSuccess.codChangeNote && (
                      <div className="text-[11px] text-amber-800 font-medium">
                        (Chuẩn bị tiền: {orderSuccess.codChangeNote})
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-1 text-base">
                  <span className="font-serif font-bold text-stone-900">Tổng thanh toán:</span>
                  <span className="font-serif font-extrabold text-amber-900">
                    {formatPrice(orderSuccess.totalAmount)}
                  </span>
                </div>
              </div>

              {/* VietQR Instructions if chosen */}
              {orderSuccess.paymentMethod === "vietqr" && (
                <div className="rounded-2xl border-2 border-amber-800/30 bg-white p-5 text-left space-y-4">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-amber-800" />
                    <h3 className="font-serif text-sm font-bold text-stone-900">
                      Quét mã VietQR để hoàn tất thanh toán
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="text-center bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                      <Image
                        src={vietQrUrl}
                        alt="Mã VietQR thanh toán Bếp Quê"
                        width={192}
                        height={192}
                        unoptimized
                        className="mx-auto h-48 w-48 object-contain rounded-lg"
                      />
                      <span className="text-[11px] text-stone-500 mt-1 block">
                        Quét bằng App Ngân hàng hoặc MoMo
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-stone-500">Ngân hàng:</span>
                        <div className="font-bold text-stone-900">{bankInfo.bankName}</div>
                      </div>
                      <div>
                        <span className="text-stone-500">Số tài khoản:</span>
                        <div className="font-mono font-bold text-amber-900 text-sm">
                          {bankInfo.accountNumber}
                        </div>
                      </div>
                      <div>
                        <span className="text-stone-500">Chủ tài khoản:</span>
                        <div className="font-bold text-stone-900">{bankInfo.accountHolder}</div>
                      </div>
                      <div>
                        <span className="text-stone-500">Số tiền:</span>
                        <div className="font-serif font-bold text-amber-900 text-sm">
                          {formatPrice(orderSuccess.totalAmount)}
                        </div>
                      </div>
                      <div>
                        <span className="text-stone-500">Nội dung chuyển khoản:</span>
                        <div className="font-mono font-semibold text-stone-800 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                          {orderSuccess.orderCode}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* COD note reminder */}
              {orderSuccess.paymentMethod === "cod" && (
                <div className="rounded-2xl bg-amber-50/70 p-4 border border-amber-900/10 text-xs text-stone-600 text-left flex items-start gap-3">
                  <Banknote className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-stone-900">Lưu ý khi nhận niêu đất:</strong>
                    <p className="mt-0.5">
                      Tài xế sẽ giao mâm cơm đến trong hộp giữ nhiệt. Quý khách vui lòng chuẩn bị số tiền{" "}
                      <strong className="text-amber-900">{formatPrice(orderSuccess.totalAmount)}</strong> và kiểm tra món ăn còn nóng hổi trước khi gửi tiền.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href={`/tracking?code=${orderSuccess.orderCode}&token=${orderSuccess.trackingToken}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-amber-800 px-7 py-3.5 text-sm font-semibold text-amber-100 shadow-md hover:bg-amber-900 transition"
                >
                  <Truck className="w-4 h-4 text-amber-300" />
                  <span>Theo dõi đơn hàng ngay</span>
                </Link>
                <Link
                  href="/"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-amber-900/20 bg-white px-6 py-3.5 text-sm font-medium text-stone-700 hover:bg-amber-50 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Về trang chủ Bếp Quê</span>
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FCFAF7] text-stone-900">
      <Navbar />

      <main className="flex-1 py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb & Navigation */}
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-amber-900/15 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-stone-700 hover:bg-amber-50 hover:text-amber-900 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Tiếp tục chọn món quê</span>
            </Link>

            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-stone-500">
              <span className="text-amber-800 font-bold">1. Chọn món</span>
              <span>→</span>
              <span className="text-amber-900 font-bold bg-amber-100 px-3 py-1 rounded-full border border-amber-900/10">
                2. Đặt giao & Thanh toán
              </span>
              <span>→</span>
              <span>3. Hoàn tất</span>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-amber-900/20 bg-white/70 p-12 text-center max-w-xl mx-auto">
              <ShoppingBag className="mx-auto h-16 w-16 text-amber-800/40 mb-4" />
              <h2 className="font-serif text-2xl font-bold text-stone-900">
                Mâm cơm của bạn chưa có món ăn nào
              </h2>
              <p className="mt-2 text-sm text-stone-600">
                Hãy quay lại thực đơn để chọn những niêu cá kho, canh quê ngọt mát hoặc đĩa thịt kho quẹt nóng hổi.
              </p>
              <Link
                href="/#menu"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-800 px-6 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-900 transition"
              >
                <span>Xem thực đơn ngay</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Honeypot field (Ẩn đối với người dùng thông thường, phát hiện bot tự động spam đơn hàng) */}
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
                <label htmlFor="checkout_bepque_hp_token">Website</label>
                <input
                  id="checkout_bepque_hp_token"
                  type="text"
                  name="bepque_hp_token"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              {/* LEFT COLUMN: CUSTOMER INFO, LOCATION, TIMING & PAYMENT */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Recipient Information */}
                <div className="rounded-3xl border border-amber-900/15 bg-white p-6 sm:p-7 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-amber-900/10 pb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-800 text-amber-100">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="font-serif text-base font-bold text-stone-900">
                        1. Thông tin người nhận
                      </h2>
                      <p className="text-xs text-stone-500">Tài xế sẽ gọi xác nhận trước khi giao</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Họ và tên người nhận <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ví dụ: Nguyễn Văn An"
                        className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 text-base sm:text-sm text-stone-800 placeholder-stone-400 focus:border-amber-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Số điện thoại nhận hàng <span className="text-red-600">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                        <input
                          type="tel"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="0912 345 678"
                          className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-3.5 text-base sm:text-sm text-stone-800 placeholder-stone-400 focus:border-amber-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Email nhận hóa đơn (Tùy chọn)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ban@example.com"
                      className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 text-base sm:text-sm text-stone-800 placeholder-stone-400 focus:border-amber-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                </div>

                {/* 2. District Selection & Shipping Fee Calculation */}
                <div className="rounded-3xl border border-amber-900/15 bg-white p-6 sm:p-7 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-amber-900/10 pb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-800 text-amber-100">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="font-serif text-base font-bold text-stone-900">
                        2. Địa chỉ nhận mâm cơm & Chọn Quận/Huyện
                      </h2>
                      <p className="text-xs text-stone-500">
                        Phí giao niêu được tính toán tự động theo khoảng cách từ bếp
                      </p>
                    </div>
                  </div>

                  {/* City Selector */}
                  <div className="grid grid-cols-2 gap-3">
                    {CITIES.map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          setSelectedCity(city);
                          const firstInCity = DISTRICTS_DATA.find((d) => d.city === city);
                          if (firstInCity) setSelectedDistrictId(firstInCity.id);
                        }}
                        className={`rounded-xl border py-2.5 px-3 text-xs sm:text-sm font-semibold transition ${
                          selectedCity === city
                            ? "border-amber-800 bg-amber-50 text-amber-900 ring-2 ring-amber-800/20"
                            : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>

                  {/* District Selection Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Chọn Quận / Huyện <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={selectedDistrictId}
                      onChange={(e) => setSelectedDistrictId(e.target.value)}
                      className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 text-base sm:text-sm font-medium text-stone-800 focus:border-amber-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                    >
                      {cityDistricts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.zone} • ~{d.distanceKm}km • {d.estimatedMinutes})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dynamic District Shipping Fee Badge */}
                  <div className="rounded-2xl border border-amber-900/10 bg-amber-50/70 p-4 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-medium">
                      <span className="flex items-center gap-1.5 text-stone-700">
                        <Truck className="h-4 w-4 text-amber-800" />
                        <span>Khoảng cách từ Bếp Quê:</span>
                      </span>
                      <span className="font-bold text-stone-900">
                        ~{selectedDistrict.distanceKm} km ({selectedDistrict.zone})
                      </span>
                    </div>

                    <div className="flex items-center justify-between font-medium">
                      <span className="flex items-center gap-1.5 text-stone-700">
                        <Clock className="h-4 w-4 text-amber-800" />
                        <span>Thời gian giao niêu ước tính:</span>
                      </span>
                      <span className="font-bold text-amber-900">
                        {selectedDistrict.estimatedMinutes}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-amber-900/10 pt-1.5">
                      <span className="text-stone-700">Phí giao niêu đất:</span>
                      <div className="text-right">
                        {shippingCalculation.isFree ? (
                          <span className="font-bold text-emerald-700">
                            Miễn phí ({shippingCalculation.freeReason})
                          </span>
                        ) : (
                          <div>
                            <span className="font-bold text-amber-900">
                              {formatPrice(shippingCalculation.fee)}
                            </span>
                            <div className="text-[10px] text-stone-500">
                              (Miễn phí khi đơn từ{" "}
                              {formatPrice(selectedDistrict.freeShippingThreshold)})
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Street address */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Địa chỉ cụ thể (Số nhà, tên ngõ/ngách, tên đường) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={addressLine}
                      onChange={(e) => setAddressLine(e.target.value)}
                      placeholder="Ví dụ: Số 24 Ngõ 165 Cầu Giấy, Tòa nhà Bamboo, P. Dịch Vọng"
                      className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 text-base sm:text-sm text-stone-800 placeholder-stone-400 focus:border-amber-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                </div>

                {/* 3. Delivery Time Notes */}
                <div className="rounded-3xl border border-amber-900/15 bg-white p-6 sm:p-7 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-amber-900/10 pb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-800 text-amber-100">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="font-serif text-base font-bold text-stone-900">
                        3. Ghi chú thời gian giao hàng & Hẹn giờ
                      </h2>
                      <p className="text-xs text-stone-500">
                        Chọn giao nóng tức thì hoặc hẹn giờ cúng/ăn cơm gia đình
                      </p>
                    </div>
                  </div>

                  {/* Timing options: ASAP vs Scheduled */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDeliveryTimingType("asap")}
                      className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                        deliveryTimingType === "asap"
                          ? "border-amber-800 bg-amber-50/80 text-amber-900 ring-2 ring-amber-800/20"
                          : "border-stone-200 bg-stone-50 text-stone-700 hover:border-amber-400"
                      }`}
                    >
                      <Sparkles className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs sm:text-sm font-bold">Giao nóng ngay tức thì</div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Ước tính khoảng {selectedDistrict.estimatedMinutes} tới nơi
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryTimingType("scheduled")}
                      className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                        deliveryTimingType === "scheduled"
                          ? "border-amber-800 bg-amber-50/80 text-amber-900 ring-2 ring-amber-800/20"
                          : "border-stone-200 bg-stone-50 text-stone-700 hover:border-amber-400"
                      }`}
                    >
                      <Clock className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs sm:text-sm font-bold">Hẹn giờ nhận niêu</div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Đúng khung giờ bữa trưa hoặc bữa tối
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Scheduled Slot Dropdown */}
                  {deliveryTimingType === "scheduled" && (
                    <div className="rounded-2xl border border-amber-900/10 bg-amber-50/40 p-4 space-y-2 animate-in fade-in duration-200">
                      <label className="block text-xs font-semibold text-stone-700">
                        Chọn khung giờ nhận mâm cơm:
                      </label>
                      <select
                        value={scheduledSlot}
                        onChange={(e) => setScheduledSlot(e.target.value)}
                        className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-base sm:text-sm text-stone-800 focus:border-amber-700 focus:outline-none"
                      >
                        {DELIVERY_TIME_SLOTS.slice(1).map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Delivery instructions note */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-800" />
                      <span>Lời nhắn thời gian & Giao hàng đặc biệt cho tài xế:</span>
                    </label>
                    <textarea
                      rows={2}
                      value={deliveryNote}
                      onChange={(e) => setDeliveryNote(e.target.value)}
                      placeholder="Ví dụ: Gọi trước 10 phút, gửi lễ tân tòa nhà, mang lên tầng 5 phòng 502, nhà trong ngõ hẹp..."
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-base sm:text-xs text-stone-800 placeholder-stone-400 focus:border-amber-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                </div>

                {/* 4. PAYMENT OPTIONS: COD & VIETQR (REQUIREMENT) */}
                <div className="rounded-3xl border border-amber-900/15 bg-white p-6 sm:p-7 shadow-xs space-y-5">
                  <div className="flex items-center gap-2.5 border-b border-amber-900/10 pb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-800 text-amber-100">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="font-serif text-base font-bold text-stone-900">
                        4. Phương thức thanh toán (COD & VietQR)
                      </h2>
                      <p className="text-xs text-stone-500">
                        Lựa chọn phương thức thanh toán an toàn và tiện lợi
                      </p>
                    </div>
                  </div>

                  {/* Two Payment Options Cards */}
                  <div className="space-y-4">
                    {/* OPTION 1: COD (Cash on Delivery) */}
                    <div
                      className={`rounded-2xl border-2 p-4 transition-all ${
                        paymentMethod === "cod"
                          ? "border-amber-800 bg-amber-50/50 shadow-xs"
                          : "border-stone-200 bg-white hover:border-amber-300"
                      }`}
                    >
                      <label className="flex items-start justify-between cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                            <Banknote className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-serif text-sm font-bold text-stone-900">
                                Thanh toán tiền mặt khi nhận hàng (COD)
                              </span>
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                                Tiện lợi
                              </span>
                            </div>
                            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                              Nhận mâm cơm trong niêu đất giữ nhiệt, mở nắp kiểm tra độ nóng hổi rồi gửi tiền mặt cho tài xế.
                            </p>
                          </div>
                        </div>
                        <input
                          type="radio"
                          name="payment"
                          checked={paymentMethod === "cod"}
                          onChange={() => setPaymentMethod("cod")}
                          className="accent-amber-800 h-5 w-5 mt-1 shrink-0"
                        />
                      </label>

                      {/* COD Specific Options: Change assistance */}
                      {paymentMethod === "cod" && (
                        <div className="mt-4 pt-4 border-t border-amber-900/10 space-y-2 animate-in fade-in duration-200">
                          <label className="block text-xs font-semibold text-stone-700">
                            Bạn có cần tài xế chuẩn bị tiền thối trước không?
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {CHANGE_OPTIONS.map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setCodChangeOption(opt)}
                                className={`rounded-xl border py-2 px-2.5 text-xs font-medium text-center transition ${
                                  codChangeOption === opt
                                    ? "border-amber-800 bg-amber-800 text-white shadow-xs"
                                    : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-stone-500 pt-1">
                            <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span>
                              Số tiền mặt cần chuẩn bị: <strong>{formatPrice(finalTotal)}</strong>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* OPTION 2: VietQR Transfer */}
                    <div
                      className={`rounded-2xl border-2 p-4 transition-all ${
                        paymentMethod === "vietqr"
                          ? "border-amber-800 bg-amber-50/50 shadow-xs"
                          : "border-stone-200 bg-white hover:border-amber-300"
                      }`}
                    >
                      <label className="flex items-start justify-between cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                            <QrCode className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-serif text-sm font-bold text-stone-900">
                                Chuyển khoản VietQR / Ứng dụng ngân hàng
                              </span>
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                                Tức thì • Miễn phí
                              </span>
                            </div>
                            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                              Quét mã QR tự động điền đúng số tiền và nội dung bằng bất kỳ App ngân hàng nào (MB, VCB, Techcombank, MoMo...).
                            </p>
                          </div>
                        </div>
                        <input
                          type="radio"
                          name="payment"
                          checked={paymentMethod === "vietqr"}
                          onChange={() => setPaymentMethod("vietqr")}
                          className="accent-amber-800 h-5 w-5 mt-1 shrink-0"
                        />
                      </label>

                      {/* VietQR Dynamic Card */}
                      {paymentMethod === "vietqr" && (
                        <div className="mt-4 pt-4 border-t border-amber-900/10 space-y-4 animate-in fade-in duration-200">
                          <div className="rounded-2xl border border-amber-900/15 bg-white p-4 sm:p-5 shadow-xs">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                              {/* QR Code Graphic */}
                              <div className="md:col-span-5 text-center flex flex-col items-center">
                                <div className="p-2 rounded-2xl bg-white border border-amber-900/15 shadow-sm">
                                  <Image
                                    src={vietQrUrl}
                                    alt="VietQR Bếp Quê"
                                    width={176}
                                    height={176}
                                    unoptimized
                                    className="h-44 w-44 object-contain rounded-xl mx-auto"
                                  />
                                </div>
                                <span className="text-[11px] font-medium text-stone-500 mt-2">
                                  Quét mã bằng App Ngân hàng hoặc MoMo
                                </span>
                              </div>

                              {/* Bank Details with Copy buttons */}
                              <div className="md:col-span-7 space-y-2.5 text-xs">
                                <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-2.5 flex items-center justify-between">
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-stone-400">Ngân hàng</span>
                                    <div className="font-bold text-stone-900 text-xs">{bankInfo.bankName}</div>
                                  </div>
                                </div>

                                <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-2.5 flex items-center justify-between">
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-stone-400">Số tài khoản</span>
                                    <div className="font-mono font-bold text-amber-900 text-sm">
                                      {bankInfo.accountNumber}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(bankInfo.accountNumber, "acc")}
                                    className="flex items-center gap-1 rounded-lg bg-white border border-stone-200 px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:bg-amber-50"
                                  >
                                    {copiedField === "acc" ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-600" />
                                        <span className="text-emerald-700">Đã chép</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3 text-stone-500" />
                                        <span>Sao chép</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-2.5 flex items-center justify-between">
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-stone-400">Chủ tài khoản</span>
                                    <div className="font-bold text-stone-900 text-xs">
                                      {bankInfo.accountHolder}
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-2.5 flex items-center justify-between">
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-stone-400">Số tiền</span>
                                    <div className="font-serif font-extrabold text-amber-900 text-sm">
                                      {formatPrice(finalTotal)}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(String(finalTotal), "amt")}
                                    className="flex items-center gap-1 rounded-lg bg-white border border-stone-200 px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:bg-amber-50"
                                  >
                                    {copiedField === "amt" ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-600" />
                                        <span className="text-emerald-700">Đã chép</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3 text-stone-500" />
                                        <span>Sao chép</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-2.5 flex items-center justify-between">
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-stone-400">Nội dung chuyển</span>
                                    <div className="font-mono font-bold text-stone-900 text-xs">
                                      {bankInfo.memoPrefix}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(bankInfo.memoPrefix, "memo")}
                                    className="flex items-center gap-1 rounded-lg bg-white border border-stone-200 px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:bg-amber-50"
                                  >
                                    {copiedField === "memo" ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-600" />
                                        <span className="text-emerald-700">Đã chép</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3 text-stone-500" />
                                        <span>Sao chép</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Checkbox confirmation */}
                          <label className="flex items-center gap-2.5 cursor-pointer text-xs text-stone-700 pt-1">
                            <input
                              type="checkbox"
                              checked={isQrConfirmed}
                              onChange={(e) => setIsQrConfirmed(e.target.checked)}
                              className="accent-amber-800 h-4 w-4 rounded"
                            />
                            <span>
                              Tôi đã / sẽ hoàn tất quét mã chuyển khoản đúng số tiền <strong>{formatPrice(finalTotal)}</strong>
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: ORDER SUMMARY & SUBMISSION */}
              <div className="lg:col-span-5 space-y-6">
                <div className="sticky top-24 rounded-3xl border border-amber-900/15 bg-white p-6 sm:p-7 shadow-lg space-y-5">
                  <div className="flex items-center justify-between border-b border-amber-900/10 pb-3">
                    <h2 className="font-serif text-lg font-bold text-stone-900">
                      Tóm tắt mâm cơm ({totalCount} phần)
                    </h2>
                    <Link
                      href="/"
                      className="text-xs text-amber-800 hover:underline font-semibold"
                    >
                      Sửa món
                    </Link>
                  </div>

                  {/* List of items */}
                  <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3 text-xs border-b border-stone-100 pb-2.5">
                        <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between font-bold text-stone-900">
                            <span className="truncate">{item.name}</span>
                            <span className="shrink-0 ml-2 font-serif text-amber-900">
                              {formatPrice(item.finalPrice * item.quantity)}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-500 mt-0.5 space-y-0.5">
                            <div>SL: x{item.quantity}</div>
                            {item.spicyNote && <div className="text-amber-800">• {item.spicyNote}</div>}
                            {item.sweetNote && <div>• {item.sweetNote}</div>}
                            {item.extras && item.extras.length > 0 && (
                              <div className="truncate">• Kèm: {item.extras.map((e) => e.name).join(", ")}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Coupon Code Input */}
                  <div className="border-t border-amber-900/10 pt-4">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="Mã giảm giá (FOODIE99 / BEPQUE20)"
                          className="h-9 w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-3 text-base sm:text-xs uppercase text-stone-800 placeholder-stone-400 focus:border-amber-700 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="h-9 rounded-xl bg-amber-800 px-4 text-xs font-semibold text-amber-100 hover:bg-amber-900 transition"
                      >
                        Áp dụng
                      </button>
                    </div>

                    {appliedCoupon && (
                      <div className="mt-2 text-xs font-medium text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Đã áp dụng mã: <strong>{appliedCoupon}</strong></span>
                      </div>
                    )}
                    {couponError && (
                      <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>{couponError}</span>
                      </div>
                    )}
                  </div>

                  {/* Financial Breakdown */}
                  <div className="border-t border-amber-900/10 pt-4 space-y-2 text-xs text-stone-600">
                    <div className="flex justify-between">
                      <span>Tiền món ăn:</span>
                      <span className="font-semibold text-stone-800">{formatPrice(totalPrice)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="flex items-center gap-1">
                        <span>Phí giao niêu ({selectedDistrict.name}):</span>
                      </span>
                      {shippingCalculation.isFree ? (
                        <span className="font-bold text-emerald-700">Miễn phí</span>
                      ) : (
                        <span className="font-semibold text-stone-800">
                          {formatPrice(shippingCalculation.fee)}
                        </span>
                      )}
                    </div>

                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Giảm giá voucher:</span>
                        <span>-{formatPrice(couponDiscount)}</span>
                      </div>
                    )}

                    <div className="border-t border-stone-200/80 pt-3 flex items-baseline justify-between text-base">
                      <span className="font-serif font-bold text-stone-900">Tổng thanh toán:</span>
                      <span className="font-serif text-2xl font-extrabold text-amber-900">
                        {formatPrice(finalTotal)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                      <span>Phương thức:</span>
                      <span className="font-semibold text-stone-800">
                        {paymentMethod === "cod" ? "Tiền mặt (COD)" : "Chuyển khoản VietQR"}
                      </span>
                    </div>
                  </div>

                  {/* Delivery commitment reminder */}
                  <div className="rounded-xl bg-amber-50 p-3 text-[11px] text-amber-900 leading-relaxed border border-amber-900/10">
                    🍲 <strong>Cam kết niêu giữ nhiệt:</strong> Cơm và cá kho được niêm phong trong hộp ủ nhiệt giữ nguyên độ nóng hổi và hương vị than hồng khi đến tay bạn.
                  </div>

                  {/* Submit Order Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 rounded-full bg-amber-800 py-4 text-sm font-semibold text-amber-100 shadow-lg shadow-amber-950/20 hover:bg-amber-900 active:scale-95 disabled:opacity-50 transition"
                  >
                    {isSubmitting ? (
                      <span>Đang kết nối nhà bếp...</span>
                    ) : (
                      <>
                        <Flame className="w-4 h-4 text-amber-300" />
                        <span>Xác nhận đặt mâm cơm ({formatPrice(finalTotal)})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
