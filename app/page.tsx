import { cookies } from "next/headers";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { RealEstateCatalog } from "@/components/RealEstateCatalog";
import { readPublicPropertyListings } from "@/lib/real-estate/storage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const propertiesData = await readPublicPropertyListings();
  const initialAccepted =
    cookieStore.get("irina_cookie_consent")?.value === "accepted";

  return (
    <>
      <RealEstateCatalog propertiesData={propertiesData} />
      <CookieConsentBanner initialAccepted={initialAccepted} />
    </>
  );
}
