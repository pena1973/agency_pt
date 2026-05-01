import type { Metadata } from "next";
import { LoginPage } from "@/components/LoginPage";

export const metadata: Metadata = {
  title: "Вход | Агентство недвижимости ИРИНА",
  description:
    "Страница входа для клиентов и администраторов агентства недвижимости ИРИНА.",
};

export default function LoginRoutePage() {
  return <LoginPage />;
}
