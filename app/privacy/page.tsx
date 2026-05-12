import type { Metadata } from "next";
import { FooterInfoPage } from "@/components/FooterInfoPage";

export const metadata: Metadata = {
  title: "Privacy policy | IRINA Real Estate",
};

export default function PrivacyPage() {
  return <FooterInfoPage kind="privacy" />;
}
