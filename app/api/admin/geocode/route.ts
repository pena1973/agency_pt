import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-access";

type GeocodeRequest = {
  address?: string;
  city?: string;
};

type NominatimResult = {
  lat: string;
  lon: string;
};

export async function POST(request: Request) {
  const forbiddenResponse = await requireAdminApiAccess();
  if (forbiddenResponse) return forbiddenResponse;

  const payload = (await request.json()) as GeocodeRequest;
  const address = payload.address?.trim();
  const city = payload.city?.trim();

  if (!address) {
    return NextResponse.json({ error: "Укажите адрес." }, { status: 400 });
  }

  const normalizedAddress = address.toLowerCase();
  const normalizedCity = city?.toLowerCase();
  const shouldAppendCity =
    Boolean(city) &&
    normalizedCity !== normalizedAddress &&
    !normalizedAddress.includes(normalizedCity ?? "");

  const query = [address, shouldAppendCity ? city : undefined, "Portugal"]
    .filter(Boolean)
    .join(", ");
  const endpoint = new URL("https://nominatim.openstreetmap.org/search");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("limit", "1");
  endpoint.searchParams.set("countrycodes", "pt");

  try {
    const response = await fetch(endpoint.toString(), {
      headers: {
        "User-Agent": "IrinaRealEstateAdmin/1.0",
        "Accept-Language": "ru,en",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Сервис координат временно недоступен." },
        { status: 502 }
      );
    }

    const results = (await response.json()) as NominatimResult[];
    const firstResult = results[0];

    if (!firstResult) {
      return NextResponse.json(
        { error: "Не удалось найти координаты по этому адресу." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      latitude: Number(firstResult.lat),
      longitude: Number(firstResult.lon),
    });
  } catch {
    return NextResponse.json(
      { error: "Не удалось получить координаты." },
      { status: 500 }
    );
  }
}
