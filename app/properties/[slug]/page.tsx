import { notFound } from "next/navigation";
import { PropertyDetailPage } from "@/components/PropertyDetailPage";
import {
  getPropertyBySlugFromStorage,
  getPublicPropertyBySlugFromStorage,
} from "@/lib/real-estate/storage";

export const dynamic = "force-dynamic";

type PropertyPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ admin_preview?: string }>;
};

export default async function PropertyPage({ params, searchParams }: PropertyPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isAdminPreview = resolvedSearchParams?.admin_preview === "1";
  const property = isAdminPreview
    ? await getPropertyBySlugFromStorage(slug)
    : await getPublicPropertyBySlugFromStorage(slug);

  if (!property) {
    notFound();
  }

  return <PropertyDetailPage property={property} />;
}
