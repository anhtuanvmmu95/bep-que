import { RURAL_FOODS, RuralFoodItem } from "@/lib/data";
import { getSupabaseClient } from "@/lib/db/supabase";
import { FoodSearchQuery } from "@/lib/validations/schemas";

if (typeof window !== "undefined") {
  throw new Error(
    "Vi phạm bảo mật: foods-repository chỉ được phép chạy trên Server!"
  );
}

export interface FoodQueryResult {
  foods: RuralFoodItem[];
  total: number;
  page: number;
  limit: number;
  categories: Array<{ name: string; count: number }>;
}

/**
 * Truy vấn món ăn an toàn 100% bằng Parameterized Query / ORM builder:
 * - KHÔNG sử dụng template string hay ghép chuỗi vào SQL raw.
 * - Sử dụng Supabase query builder (tham số hóa tự động) hoặc local dataset an toàn.
 */
export async function queryFoods(
  params: FoodSearchQuery
): Promise<FoodQueryResult> {
  const { q, category, sortBy, page, limit } = params;

  // 1. Thử truy vấn qua Supabase với parameterized query builder nếu có cấu hình
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      let query = supabase.from("products").select("*", { count: "exact" });

      // Parameterized filter: .ilike() tự động escape và tham số hóa biến
      if (q && q.trim()) {
        query = query.ilike("name", `%${q.trim()}%`);
      }

      // Parameterized category filter: .eq()
      if (category && category !== "Tất cả") {
        query = query.eq("category_name", category.trim());
      }

      // Parameterized sort
      if (sortBy === "price-asc") {
        query = query.order("price", { ascending: true });
      } else if (sortBy === "price-desc") {
        query = query.order("price", { ascending: false });
      } else if (sortBy === "rating") {
        query = query.order("rating_average", { ascending: false });
      }

      // Parameterized pagination range
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (!error && data && data.length > 0) {
        const mappedFoods: RuralFoodItem[] = data.map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description || "",
          price: Number(d.price),
          originalPrice: d.original_price ? Number(d.original_price) : undefined,
          category: d.category_name || "Món dân dã",
          rating: Number(d.rating_average || 5.0),
          reviewsCount: Number(d.reviews_count || 0),
          prepTime: `${d.preparation_time_minutes || 20} phút`,
          imageUrl: d.image_url || "/images/foods/rural-food-01.jpg",
          isFeatured: Boolean(d.is_featured),
          tag: d.tag || undefined,
        }));

        return {
          foods: mappedFoods,
          total: count || mappedFoods.length,
          page,
          limit,
          categories: computeCategoryCounts(RURAL_FOODS),
        };
      }
    } catch (err) {
      console.warn("Supabase products query fallback to local:", err);
    }
  }

  // 2. Local Query Handler (An toàn, không SQL Injection)
  let result = [...RURAL_FOODS];

  // Lọc theo danh mục
  if (category && category !== "Tất cả") {
    result = result.filter(
      (food) => food.category.toLowerCase() === category.toLowerCase()
    );
  }

  // Lọc theo từ khóa tìm kiếm (so khớp an toàn, không dùng regex từ user input)
  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    result = result.filter(
      (food) =>
        food.name.toLowerCase().includes(term) ||
        food.description.toLowerCase().includes(term) ||
        food.category.toLowerCase().includes(term) ||
        (food.tag && food.tag.toLowerCase().includes(term))
    );
  }

  // Sắp xếp an toàn
  if (sortBy === "price-asc") {
    result.sort((a, b) => a.price - b.price);
  } else if (sortBy === "price-desc") {
    result.sort((a, b) => b.price - a.price);
  } else if (sortBy === "rating") {
    result.sort((a, b) => b.rating - a.rating);
  }

  const total = result.length;
  const startIndex = (page - 1) * limit;
  const paginatedFoods = result.slice(startIndex, startIndex + limit);

  return {
    foods: paginatedFoods,
    total,
    page,
    limit,
    categories: computeCategoryCounts(RURAL_FOODS),
  };
}

function computeCategoryCounts(foods: RuralFoodItem[]): Array<{ name: string; count: number }> {
  const counts: Record<string, number> = { "Tất cả": foods.length };
  foods.forEach((f) => {
    counts[f.category] = (counts[f.category] || 0) + 1;
  });
  return Object.entries(counts).map(([name, count]) => ({ name, count }));
}
