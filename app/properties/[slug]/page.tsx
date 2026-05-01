import { notFound } from "next/navigation";
import { PropertyDetailPage } from "@/components/PropertyDetailPage";
import { getPublicPropertyBySlugFromStorage } from "@/lib/real-estate/storage";

export const dynamic = "force-dynamic";

type PropertyPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { slug } = await params;
  const property = await getPublicPropertyBySlugFromStorage(slug);

  if (!property) {
    notFound();
  }

  return <PropertyDetailPage property={property} />;
}
