"use client";

import Image from "next/image";

type AgencyLogoProps = {
  className?: string;
  priority?: boolean;
};

export function AgencyLogo({ className, priority = false }: AgencyLogoProps) {
  return (
    <Image
      src="/branding/irina-logo-v5.png"
      alt="Агентство недвижимости Ирина"
      width={1231}
      height={350}
      priority={priority}
      className={className ?? "h-[32px] w-auto object-contain sm:h-[42px]"}
    />
  );
}
