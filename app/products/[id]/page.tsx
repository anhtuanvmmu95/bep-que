import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductDetailView from "@/components/ProductDetailView";
import { RURAL_FOODS } from "@/lib/data";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return RURAL_FOODS.map((food) => ({
    id: food.id,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = RURAL_FOODS.find((item) => item.id === id);

  if (!product) {
    return {
      title: "Không tìm thấy món ăn - Bếp Quê",
    };
  }

  return {
    title: `${product.name} - Bếp Quê Đồng Quê`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [{ url: product.imageUrl }],
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const product = RURAL_FOODS.find((item) => item.id === id);

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FCFAF7] text-stone-900">
      <Navbar />
      <main className="flex-1">
        <ProductDetailView product={product} />
      </main>
      <Footer />
    </div>
  );
}
