import type { Metadata } from "next";
import { Be_Vietnam_Pro, Playfair_Display } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/context/CartContext";
import CartDrawer from "@/components/CartDrawer";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://bepque.vn"),
  title: "Bếp Quê - Hương Vị Đồng Quê Mộc Mạc & Giao Niêu Giữ Nhiệt",
  description: "Thưởng thức mâm cơm quê truyền thống: cơm niêu cháy giòn, cá bống kho tộ, cá lóc nướng trui, rau vườn luộc chấm kho quẹt.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${playfairDisplay.variable} h-full antialiased font-sans`}
      style={{ colorScheme: "light" }}
    >
      <body className="min-h-full flex flex-col bg-[#FCFAF7] text-stone-900 font-sans selection:bg-amber-800 selection:text-white">
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
