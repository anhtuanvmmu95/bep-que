import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

/**
 * Khởi tạo kết nối Supabase Client (SERVER-SIDE ONLY):
 * 1. Tuyệt đối KHÔNG sử dụng tiền tố NEXT_PUBLIC_ cho URL hoặc Service Role Key
 *    để ngăn chặn Next.js tự động nhúng secrets vào client bundle.
 * 2. Bảo vệ chống rò rỉ: Chặn hoàn toàn nếu bị import hoặc thực thi trên trình duyệt.
 */
export function getSupabaseClient(): SupabaseClient | null {
  // Server-side execution guard
  if (typeof window !== "undefined") {
    throw new Error(
      "Vi phạm bảo mật: Supabase client chứa quyền truy cập database chỉ được phép chạy trên Server, tuyệt đối cấm gọi từ Client Component!"
    );
  }

  // Sử dụng biến môi trường Server-only (Tuyệt đối KHÔNG dùng NEXT_PUBLIC_)
  const supabaseUrl = process.env.SUPABASE_URL;

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  }

  return supabaseClient;
}
