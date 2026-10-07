import { RURAL_FOODS, RuralFoodItem } from "@/lib/data";

export interface AuthoritativeItemInput {
  productId?: string;
  id?: string;
  quantity: number;
  portion?: string;
  extras?: Array<{ name: string; price?: number }>;
  spicyNote?: string;
  sweetNote?: string;
  specialNote?: string;
}

export interface AuthoritativePricedItem {
  productId: string;
  name: string;
  basePrice: number;
  portionPrice: number;
  extrasPrice: number;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  portion?: string;
  extras?: Array<{ name: string; price: number }>;
  spicyNote?: string;
  sweetNote?: string;
  specialNote?: string;
}

// Bảng giá khẩu phần chuẩn (Server-Authoritative)
export const AUTHORITATIVE_PORTION_PRICES: Record<string, number> = {
  standard: 0,
  "Phần tiêu chuẩn (1 - 2 người)": 0,
  medium: 35000,
  "Phần vừa (2 - 3 người)": 35000,
  family: 70000,
  "Mâm đầy đặn (4 - 5 người)": 70000,
};

// Bảng giá món ăn kèm chuẩn (Server-Authoritative)
export const AUTHORITATIVE_EXTRA_PRICES: Record<string, number> = {
  "Thêm niêu cơm cháy giòn rụm": 15000,
  "Thêm đĩa rau vườn luộc tươi ngọt": 20000,
  "Thêm chén tóp mỡ kho quẹt giòn": 25000,
  "Thêm nước mắm đồng nguyên chất": 5000,
};

export function getAuthoritativeProduct(productId: string): RuralFoodItem | undefined {
  return RURAL_FOODS.find((f) => f.id === productId);
}

/**
 * Tính toán đơn giá từng món hoàn toàn trên Server:
 * Tuyệt đối bỏ qua mọi giá tiền (price, unitPrice, finalPrice) do client gửi lên.
 */
export function calculateAuthoritativeItem(
  itemInput: AuthoritativeItemInput
): { success: true; item: AuthoritativePricedItem } | { success: false; error: string } {
  const pid = itemInput.productId || itemInput.id;
  if (!pid) {
    return { success: false, error: "Thiếu mã sản phẩm (productId)" };
  }

  const product = getAuthoritativeProduct(pid);
  if (!product) {
    return {
      success: false,
      error: `Sản phẩm không tồn tại trong thực đơn: ${pid}`,
    };
  }

  // Ép kiểu số lượng là số nguyên dương >= 1
  const quantity = Math.max(1, Math.floor(Number(itemInput.quantity) || 1));
  const basePrice = product.price; // Lấy giá gốc từ catalog/database

  // Tính phụ thu khẩu phần
  let portionPrice = 0;
  if (itemInput.portion && AUTHORITATIVE_PORTION_PRICES[itemInput.portion] !== undefined) {
    portionPrice = AUTHORITATIVE_PORTION_PRICES[itemInput.portion];
  }

  // Tính phụ thu món ăn kèm dựa trên bảng giá chuẩn backend (loại bỏ giá client gửi)
  const verifiedExtras: Array<{ name: string; price: number }> = [];
  let extrasPrice = 0;
  if (Array.isArray(itemInput.extras)) {
    for (const ex of itemInput.extras) {
      if (ex && ex.name && AUTHORITATIVE_EXTRA_PRICES[ex.name] !== undefined) {
        const verifiedPrice = AUTHORITATIVE_EXTRA_PRICES[ex.name];
        verifiedExtras.push({ name: ex.name, price: verifiedPrice });
        extrasPrice += verifiedPrice;
      }
    }
  }

  // Đơn giá thực tế được tính bằng: Giá gốc + Khẩu phần + Topping
  const unitPrice = basePrice + portionPrice + extrasPrice;
  const subtotal = unitPrice * quantity;

  return {
    success: true,
    item: {
      productId: product.id,
      name: product.name,
      basePrice,
      portionPrice,
      extrasPrice,
      unitPrice,
      quantity,
      subtotal,
      portion: itemInput.portion,
      extras: verifiedExtras.length > 0 ? verifiedExtras : undefined,
      spicyNote: itemInput.spicyNote,
      sweetNote: itemInput.sweetNote,
      specialNote: itemInput.specialNote,
    },
  };
}
