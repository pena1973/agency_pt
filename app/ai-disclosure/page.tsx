import type { Metadata } from "next";
import { FooterInfoPage } from "@/components/FooterInfoPage";

export const metadata: Metadata = {
  title: "AI disclosure | IRINA Real Estate",
};

export default function AiDisclosurePage() {
  return <FooterInfoPage kind="aiDisclosure" />;
}
