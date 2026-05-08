import { AdminDashboard } from "@/components/AdminDashboard";
import { requireAdminPageAccess } from "@/lib/auth/admin-access";
import {
  readCustomerInquiries,
  readPropertyListings,
  readRegisteredUsers,
} from "@/lib/real-estate/storage";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdminPageAccess();

  const initialProperties = await readPropertyListings();
  const initialInquiries = await readCustomerInquiries();
  const initialUsers = await readRegisteredUsers();

  return (
    <AdminDashboard
      initialProperties={initialProperties}
      initialInquiries={initialInquiries}
      initialUsers={initialUsers}
    />
  );
}
