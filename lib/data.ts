export interface RuralFoodItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  rating: number;
  reviewsCount: number;
  prepTime: string;
  imageUrl: string;
  isFeatured?: boolean;
  tag?: string;
}

import ruralFoodsRaw from "./data/vietnamese-rural-foods.json";

export const RURAL_CATEGORIES = [
  "Tất cả",
  "Cơm quê",
  "Đặc sản đồng quê",
  "Món dân dã",
  "Canh quê",
  "Bánh quê",
  "Lẩu quê",
  "Tráng miệng",
] as const;

export const RURAL_FOODS: RuralFoodItem[] = ruralFoodsRaw as RuralFoodItem[];

export const FEATURED_RURAL_FOODS: RuralFoodItem[] = RURAL_FOODS.filter(
  (food) => food.isFeatured
);
