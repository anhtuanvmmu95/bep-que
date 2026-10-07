#!/usr/bin/env node
/**
 * scripts/rotate-keys.mjs
 * Công cụ tự động tạo mới (rotate) các bí mật bảo mật với độ entropy cao (crypto.randomBytes),
 * đồng thời hướng dẫn quy trình thu hồi (revoke) các key đã từng có nguy cơ lộ.
 */

import { randomBytes } from "node:crypto";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function generateSecureToken(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

console.log("===============================================================");
console.log("🔒 BẾP QUÊ - CÔNG CỤ TẠO MỚI & ROTATE BÍ MẬT BẢO MẬT (KEYS ROTATION)");
console.log("===============================================================\n");

const newWebhookSecret = generateSecureToken(32); // 256-bit
const newAdminKey = generateSecureToken(32);       // 256-bit
const newJwtSecret = generateSecureToken(32);      // 256-bit

console.log("1. CÁC SECRET MỚI ĐƯỢC TẠO VỚI ĐỘ ENTROPY CAO (256-bit):");
console.log(`- PAYMENT_WEBHOOK_SECRET: ${newWebhookSecret}`);
console.log(`- ADMIN_API_KEY         : ${newAdminKey}`);
console.log(`- JWT_SECRET            : ${newJwtSecret}`);
console.log("");

console.log("2. QUY TRÌNH THU HỒI (REVOKE) & ROTATE CÁC DỊCH VỤ BÊN THỨ 3:");
console.log("---------------------------------------------------------------");
console.log("a. Vercel OIDC / CLI Tokens:");
console.log("   - Vào https://vercel.com/account/tokens");
console.log("   - Tìm token tương ứng (ví dụ: anh-tuan6:bep-que-vn) và bấm 'Revoke'.");
console.log("   - Trên máy tính cá nhân, chạy lại: `npx vercel login` để cấp lại phiên làm việc an toàn mới.");
console.log("");
console.log("b. Supabase (Database URL & Service Role Key):");
console.log("   - Truy cập https://supabase.com/dashboard/project/_/settings/api");
console.log("   - Bấm 'Roll keys' để vô hiệu hóa ngay Service Role Key & Anon Key cũ.");
console.log("   - Nếu Database Password từng bị commit, vào Settings -> Database -> Reset database password.");
console.log("   - Cập nhật SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY mới vào biến môi trường Server trên hosting (Vercel Project Settings -> Environment Variables).");
console.log("");
console.log("c. Google Sheets Webhook URL:");
console.log("   - Mở Google Apps Script liên kết với trang tính nhận đơn.");
console.log("   - Chọn Deploy -> Manage deployments -> Bấm Edit/Archive deployment cũ.");
console.log("   - Tạo New Deployment và cập nhật URL mới vào GOOGLE_SHEETS_WEBHOOK_URL trên server.");
console.log("---------------------------------------------------------------\n");

// Tự động kiểm tra file .env.local
const envLocalPath = resolve(process.cwd(), ".env.local");
let updatedContent = "";

if (existsSync(envLocalPath)) {
  const currentEnv = readFileSync(envLocalPath, "utf8");
  // Loại bỏ các key cũ nếu có và thêm các key mới
  let lines = currentEnv.split(/\r?\n/).filter(line => {
    return !line.startsWith("PAYMENT_WEBHOOK_SECRET=") &&
           !line.startsWith("ADMIN_API_KEY=") &&
           !line.startsWith("JWT_SECRET=");
  });

  lines.push(`PAYMENT_WEBHOOK_SECRET="${newWebhookSecret}"`);
  lines.push(`ADMIN_API_KEY="${newAdminKey}"`);
  lines.push(`JWT_SECRET="${newJwtSecret}"`);
  
  updatedContent = lines.join("\n");
  writeFileSync(envLocalPath, updatedContent, "utf8");
  console.log("✅ Đã tự động cập nhật PAYMENT_WEBHOOK_SECRET, ADMIN_API_KEY và JWT_SECRET mới vào .env.local (file này đã được .gitignore bảo vệ).");
} else {
  const template = `# Server-Side Environment Variables\nPAYMENT_WEBHOOK_SECRET="${newWebhookSecret}"\nADMIN_API_KEY="${newAdminKey}"\nJWT_SECRET="${newJwtSecret}"\n`;
  writeFileSync(envLocalPath, template, "utf8");
  console.log("✅ Đã tạo mới file .env.local với các khóa bí mật bảo mật cao.");
}

console.log("\nHoàn tất quá trình rotate keys an toàn!");
