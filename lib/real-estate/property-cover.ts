import type { PropertyListing } from "@/lib/real-estate/types";

export const DEFAULT_PROPERTY_COVER_URL =
  "/mock/property-placeholder.svg";

export function getPropertyCoverImage(property: Pick<PropertyListing, "imageUrl" | "imageGallery">): string {
  return property.imageGallery[0] ?? property.imageUrl ?? DEFAULT_PROPERTY_COVER_URL;
}

export function getPropertyImagePosition(
  property: Pick<PropertyListing, "imagePositions">,
  imageUrl: string
) {
  const position = property.imagePositions?.[imageUrl];

  return `${position?.x ?? 50}% ${position?.y ?? 50}%`;
}

export function getPropertyImageStyle(
  property: Pick<PropertyListing, "imagePositions">,
  imageUrl: string
) {
  const position = property.imagePositions?.[imageUrl];
  const x = position?.x ?? 50;
  const y = position?.y ?? 50;
  const scale = Math.min(
    200,
    Math.max(100, typeof position?.scale === "number" ? position.scale : 100)
  );

  return {
    objectPosition: `${x}% ${y}%`,
    transform: scale === 100 ? undefined : `scale(${scale / 100})`,
    transformOrigin: `${x}% ${y}%`,
  };
}
