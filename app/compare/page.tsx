import { ComparePage } from "@/components/ComparePage";
import { readPropertyListings } from "@/lib/real-estate/storage";

export const dynamic = "force-dynamic";

export default async function CompareRoutePage() {
  const propertiesData = await readPropertyListings();

  return <ComparePage propertiesData={propertiesData} />;
}
