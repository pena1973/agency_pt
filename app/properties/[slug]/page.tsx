import { notFound } from "next/navigation";
import { PropertyDetailPage } from "@/components/PropertyDetailPage";
import { readPropertyListings } from "@/lib/real-estate/storage";

export const dynamic = "force-dynamic";

type PropertyPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { slug } = await params;
  const propertyListings = await readPropertyListings();
  const property = propertyListings.find((item) => item.slug === slug);

  if (!property) {
    notFound();
  }

  return <PropertyDetailPage property={property} />;
}
