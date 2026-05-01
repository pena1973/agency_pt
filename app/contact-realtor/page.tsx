import type { Metadata } from "next";
import { ContactRealtorPage } from "@/components/ContactRealtorPage";

export const metadata: Metadata = {
  title: "Написать риэлтору | Агентство недвижимости ИРИНА",
  description:
    "Форма запроса на подбор недвижимости и связь с риэлтором агентства ИРИНА.",
};

export default function ContactRealtorRoutePage() {
  return <ContactRealtorPage />;
}
