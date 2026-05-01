import { ComparePage } from "@/components/ComparePage";
import { readPublicPropertyListings } from "@/lib/real-estate/storage";

export const dynamic = "force-dynamic";

export default async function CompareRoutePage() {
  const propertiesData = await readPublicPropertyListings();

  return <ComparePage propertiesData={propertiesData} />;
}
