export type UserRole = "CUSTOMER" | "ADMIN" | "DRIVER" | "MERCHANT";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "DELIVERING"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type PaymentMethod =
  | "COD"
  | "MOMO"
  | "VNPAY"
  | "BANK_TRANSFER"
  | "CREDIT_CARD";

export interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserAddress {
  id: string;
  userId: string;
  recipientName: string;
  phoneNumber: string;
  addressLine: string;
  ward: string;
  district: string;
  city: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  preparationTimeMinutes: number;
  isAvailable: boolean;
  isFeatured: boolean;
  ratingAverage: number;
  reviewsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductOptionValue {
  id: string;
  name: string;
  additionalPrice: number;
  isDefault: boolean;
}

export interface ProductOption {
  id: string;
  productId: string;
  name: string;
  isRequired: boolean;
  maxSelection: number;
  values: ProductOptionValue[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productImageUrl?: string;
  unitPrice: number;
  quantity: number;
  selectedOptions?: Array<{
    name: string;
    value: string;
    additionalPrice: number;
  }>;
  subtotalPrice: number;
  itemNotes?: string;
}

export interface Order {
  id: string;
  orderCode: string;
  userId: string;
  couponId?: string;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  latitude?: number;
  longitude?: number;
  subtotalAmount: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  orderStatus: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  driverId?: string;
  customerNotes?: string;
  cancelReason?: string;
  estimatedDeliveryTime?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}
