import { AdminJsonEditor } from "@/components/AdminJsonEditor";
import { readPropertyListings } from "@/lib/real-estate/storage";

export const dynamic = "force-dynamic";

export default async function AdminJsonEditorPage() {
  const initialProperties = await readPropertyListings();

  return <AdminJsonEditor initialProperties={initialProperties} />;
}
