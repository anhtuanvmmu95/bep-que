"use client";

import React from "react";
import { sanitizeHtml } from "@/lib/security/sanitize";

interface SafeHtmlProps {
  html: string;
  className?: string;
  as?: React.ElementType;
}

/**
 * Component an toàn hiển thị HTML động:
 * Tự động chạy qua DOMPurify để lọc sạch mọi payload XSS (Stored / Reflected)
 * trước khi mount vào DOM.
 */
export default function SafeHtml({
  html,
  className,
  as: Component = "div",
}: SafeHtmlProps) {
  const cleanHtml = sanitizeHtml(html);

  return (
    <Component
      className={className}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}
