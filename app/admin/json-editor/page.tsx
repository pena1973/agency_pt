import { AdminJsonEditor } from "@/components/AdminJsonEditor";
import { requireAdminPageAccess } from "@/lib/auth/admin-access";
import { readPropertyListings } from "@/lib/real-estate/storage";

export const dynamic = "force-dynamic";

export default async function AdminJsonEditorPage() {
  await requireAdminPageAccess();

  const initialProperties = await readPropertyListings();

  return <AdminJsonEditor initialProperties={initialProperties} />;
}
