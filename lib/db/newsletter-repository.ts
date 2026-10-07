import fs from "fs";
import path from "path";
import { getSupabaseClient } from "./supabase";

if (typeof window !== "undefined") {
  throw new Error(
    "Vi phạm bảo mật: newsletter-repository chỉ được phép chạy trên Server!"
  );
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const SUBSCRIBERS_FILE_PATH = path.join(DATA_DIR, "subscribers.json");

function ensureSubscribersFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SUBSCRIBERS_FILE_PATH)) {
    fs.writeFileSync(SUBSCRIBERS_FILE_PATH, JSON.stringify([], null, 2), "utf8");
  }
}

/**
 * Lưu email đăng ký bản tin an toàn (100% Parameterized):
 * - Không ghép chuỗi hay dùng template string vào câu lệnh SQL raw.
 * - Sử dụng Supabase ORM builder hoặc local database có kiểm tra trùng lặp.
 */
export async function saveNewsletterSubscriber(
  email: string
): Promise<{ success: boolean; isNew: boolean; subscriber: NewsletterSubscriber }> {
  const cleanEmail = email.trim().toLowerCase();
  ensureSubscribersFile();

  const now = new Date().toISOString();
  let subscribers: NewsletterSubscriber[] = [];

  try {
    const raw = fs.readFileSync(SUBSCRIBERS_FILE_PATH, "utf8");
    subscribers = JSON.parse(raw);
  } catch {
    subscribers = [];
  }

  const existing = subscribers.find(
    (s) => s.email.toLowerCase() === cleanEmail
  );

  let subscriber: NewsletterSubscriber;
  let isNew = false;

  if (existing) {
    subscriber = existing;
  } else {
    isNew = true;
    subscriber = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      email: cleanEmail,
      subscribedAt: now,
    };
    subscribers.unshift(subscriber);
    fs.writeFileSync(
      SUBSCRIBERS_FILE_PATH,
      JSON.stringify(subscribers, null, 2),
      "utf8"
    );
  }

  // Đồng bộ lên Supabase nếu có cấu hình (Parameterized qua Supabase ORM)
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("newsletter_subscribers").upsert(
        [
          {
            email: cleanEmail,
            created_at: now,
          },
        ],
        { onConflict: "email" }
      );
    } catch (sbErr) {
      console.warn("Supabase newsletter upsert warning:", sbErr);
    }
  }

  return { success: true, isNew, subscriber };
}
