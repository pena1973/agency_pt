import { AdminDashboard } from "@/components/AdminDashboard";
import { readPropertyListings } from "@/lib/real-estate/storage";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const initialProperties = await readPropertyListings();

  return <AdminDashboard initialProperties={initialProperties} />;
}
