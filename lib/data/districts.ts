export interface DistrictInfo {
  id: string;
  name: string;
  city: "Hà Nội" | "TP. Hồ Chí Minh";
  distanceKm: number;
  baseShippingFee: number;
  freeShippingThreshold: number;
  estimatedMinutes: string;
  zone: "Nội thành gần" | "Nội thành" | "Ngoại thành gần" | "Ngoại thành xa";
}

export const CITIES = ["Hà Nội", "TP. Hồ Chí Minh"] as const;

export const DISTRICTS_DATA: DistrictInfo[] = [
  // HÀ NỘI (Trụ sở Bếp Quê tại Quận Cầu Giấy)
  {
    id: "hn-cau-giay",
    name: "Quận Cầu Giấy",
    city: "Hà Nội",
    distanceKm: 2,
    baseShippingFee: 15000,
    freeShippingThreshold: 150000,
    estimatedMinutes: "20 - 25 phút",
    zone: "Nội thành gần",
  },
  {
    id: "hn-ba-dinh",
    name: "Quận Ba Đình",
    city: "Hà Nội",
    distanceKm: 4,
    baseShippingFee: 20000,
    freeShippingThreshold: 200000,
    estimatedMinutes: "25 - 30 phút",
    zone: "Nội thành gần",
  },
  {
    id: "hn-dong-da",
    name: "Quận Đống Đa",
    city: "Hà Nội",
    distanceKm: 5,
    baseShippingFee: 22000,
    freeShippingThreshold: 200000,
    estimatedMinutes: "25 - 35 phút",
    zone: "Nội thành",
  },
  {
    id: "hn-nam-tu-liem",
    name: "Quận Nam Từ Liêm",
    city: "Hà Nội",
    distanceKm: 4.5,
    baseShippingFee: 22000,
    freeShippingThreshold: 200000,
    estimatedMinutes: "25 - 35 phút",
    zone: "Nội thành",
  },
  {
    id: "hn-thanh-xuan",
    name: "Quận Thanh Xuân",
    city: "Hà Nội",
    distanceKm: 6,
    baseShippingFee: 25000,
    freeShippingThreshold: 250000,
    estimatedMinutes: "30 - 40 phút",
    zone: "Nội thành",
  },
  {
    id: "hn-tay-ho",
    name: "Quận Tây Hồ",
    city: "Hà Nội",
    distanceKm: 6.5,
    baseShippingFee: 28000,
    freeShippingThreshold: 250000,
    estimatedMinutes: "30 - 40 phút",
    zone: "Nội thành",
  },
  {
    id: "hn-bac-tu-liem",
    name: "Quận Bắc Từ Liêm",
    city: "Hà Nội",
    distanceKm: 7,
    baseShippingFee: 28000,
    freeShippingThreshold: 250000,
    estimatedMinutes: "35 - 45 phút",
    zone: "Nội thành",
  },
  {
    id: "hn-hoan-kiem",
    name: "Quận Hoàn Kiếm",
    city: "Hà Nội",
    distanceKm: 8,
    baseShippingFee: 30000,
    freeShippingThreshold: 300000,
    estimatedMinutes: "35 - 45 phút",
    zone: "Nội thành",
  },
  {
    id: "hn-hai-ba-trung",
    name: "Quận Hai Bà Trưng",
    city: "Hà Nội",
    distanceKm: 8.5,
    baseShippingFee: 32000,
    freeShippingThreshold: 300000,
    estimatedMinutes: "35 - 45 phút",
    zone: "Nội thành",
  },
  {
    id: "hn-ha-dong",
    name: "Quận Hà Đông",
    city: "Hà Nội",
    distanceKm: 11,
    baseShippingFee: 40000,
    freeShippingThreshold: 350000,
    estimatedMinutes: "40 - 55 phút",
    zone: "Ngoại thành gần",
  },
  {
    id: "hn-hoang-mai",
    name: "Quận Hoàng Mai",
    city: "Hà Nội",
    distanceKm: 12,
    baseShippingFee: 42000,
    freeShippingThreshold: 350000,
    estimatedMinutes: "45 - 55 phút",
    zone: "Ngoại thành gần",
  },
  {
    id: "hn-long-bien",
    name: "Quận Long Biên",
    city: "Hà Nội",
    distanceKm: 14,
    baseShippingFee: 48000,
    freeShippingThreshold: 400000,
    estimatedMinutes: "50 - 60 phút",
    zone: "Ngoại thành xa",
  },

  // TP. HỒ CHÍ MINH (Chi nhánh Bếp Quê Quận 1 / Bình Thạnh)
  {
    id: "hcm-quan-1",
    name: "Quận 1",
    city: "TP. Hồ Chí Minh",
    distanceKm: 2.5,
    baseShippingFee: 18000,
    freeShippingThreshold: 180000,
    estimatedMinutes: "20 - 30 phút",
    zone: "Nội thành gần",
  },
  {
    id: "hcm-quan-3",
    name: "Quận 3",
    city: "TP. Hồ Chí Minh",
    distanceKm: 3.5,
    baseShippingFee: 20000,
    freeShippingThreshold: 200000,
    estimatedMinutes: "25 - 35 phút",
    zone: "Nội thành gần",
  },
  {
    id: "hcm-binh-thanh",
    name: "Quận Bình Thạnh",
    city: "TP. Hồ Chí Minh",
    distanceKm: 3,
    baseShippingFee: 18000,
    freeShippingThreshold: 180000,
    estimatedMinutes: "20 - 30 phút",
    zone: "Nội thành gần",
  },
  {
    id: "hcm-phu-nhuan",
    name: "Quận Phú Nhuận",
    city: "TP. Hồ Chí Minh",
    distanceKm: 4.5,
    baseShippingFee: 22000,
    freeShippingThreshold: 200000,
    estimatedMinutes: "25 - 35 phút",
    zone: "Nội thành",
  },
  {
    id: "hcm-quan-10",
    name: "Quận 10",
    city: "TP. Hồ Chí Minh",
    distanceKm: 5.5,
    baseShippingFee: 26000,
    freeShippingThreshold: 250000,
    estimatedMinutes: "30 - 40 phút",
    zone: "Nội thành",
  },
  {
    id: "hcm-quan-7",
    name: "Quận 7",
    city: "TP. Hồ Chí Minh",
    distanceKm: 8,
    baseShippingFee: 35000,
    freeShippingThreshold: 350000,
    estimatedMinutes: "35 - 50 phút",
    zone: "Nội thành",
  },
  {
    id: "hcm-thu-duc",
    name: "TP. Thủ Đức",
    city: "TP. Hồ Chí Minh",
    distanceKm: 10,
    baseShippingFee: 40000,
    freeShippingThreshold: 350000,
    estimatedMinutes: "40 - 55 phút",
    zone: "Ngoại thành gần",
  },
];

export function calculateShippingFee(
  subtotal: number,
  district: DistrictInfo,
  couponCode?: string
): {
  fee: number;
  originalFee: number;
  isFree: boolean;
  freeReason?: string;
} {
  const originalFee = district.baseShippingFee;

  // Coupon FOODIE99 gives free shipping
  if (couponCode && couponCode.trim().toUpperCase() === "FOODIE99") {
    return {
      fee: 0,
      originalFee,
      isFree: true,
      freeReason: "Mã giảm giá FOODIE99 (Freeship)",
    };
  }

  // Free shipping threshold reached
  if (subtotal >= district.freeShippingThreshold) {
    return {
      fee: 0,
      originalFee,
      isFree: true,
      freeReason: `Đạt mốc đơn trên ${new Intl.NumberFormat("vi-VN").format(
        district.freeShippingThreshold
      )}đ của ${district.name}`,
    };
  }

  return {
    fee: originalFee,
    originalFee,
    isFree: false,
  };
}
