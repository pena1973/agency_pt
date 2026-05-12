import type { RoomDimensions, RoomType } from "@/lib/room-ai/types";

type BuildAnalyzeRoomPromptInput = {
  roomType: RoomType;
  roomDimensions?: RoomDimensions;
  peopleCount?: number;
  palette?: string;
};

const roomTypeLabels: Record<RoomType, string> = {
  kitchen: "кухня",
  bedroom: "спальня",
  kids_room: "детская комната",
  office: "рабочий кабинет",
  living_room: "гостиная",
};

export function buildAnalyzeRoomPrompt(input: BuildAnalyzeRoomPromptInput) {
  const dimensionsText = [
    input.roomDimensions?.widthM
      ? `ширина: ${input.roomDimensions.widthM} м`
      : null,
    input.roomDimensions?.lengthM
      ? `длина: ${input.roomDimensions.lengthM} м`
      : null,
    input.roomDimensions?.heightM
      ? `высота: ${input.roomDimensions.heightM} м`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  return `
Ты — помощник по планированию интерьера.

Проанализируй загруженные фотографии помещения и верни практичный структурированный JSON-анализ.

Назначение комнаты: ${roomTypeLabels[input.roomType]}
Количество людей: ${input.peopleCount ?? "не указано"}
Известные размеры: ${dimensionsText || "не указаны"}
Желаемая цветовая гамма: ${input.palette ?? "не указана"}

ARCHITECTURE LOCK FOR ANALYSIS:
- The empty source room architecture is the source of truth.
- Detect every visible door, second door, doorway, window, balcony door, arch, frame, trim, sill, and threshold as fixed architectural geometry, not as removable clutter.
- For each door/window/opening, estimate wall, offset from the wall start, visible width, visible height, top edge, bottom edge, height/sill/threshold relationship when visible, and distance to adjacent corners.
- Preserve asymmetry: if a window or door is off-center, record it as off-center.
- Do not normalize the room into a cleaner rectangle if the photo shows a different proportion or perspective.
- Add constraints that explicitly say room geometry, perspective, doors, second doors, doorways, windows, their sizes, heights, and distances to corners must not be changed during generation.
- If there are two doors/openings, both must be listed separately in openings with separate ids.
- Add constraints that the output must keep the same photo framing and room scale: no zoom, no crop change, no camera movement, no changed focal length, and no different amount of visible floor/ceiling/walls.

Важные правила:
- Отвечай на русском языке.
- Не выдумывай точные размеры, если они не видны и не были указаны.
- Если размеры не указаны, оцени их приблизительно и поставь confidence: "low" или "medium".
- Определи фиксированные элементы: двери, окна, радиаторы, вентиляцию, встроенную мебель, сантехнику, плиту, мойку, розетки, если они видны.
- По возможности определи архитектурные проёмы комнаты и их примерное положение на плане сверху.
- Определи временные/лишние предметы, которые можно убрать: сумки, коробки, одежду, случайные вещи.
- Определи ограничения для расстановки мебели.
- Думай как практичный планировщик интерьера, а не только как декоратор.
- Ответ должен быть только валидным JSON.
- Без markdown.
- Без комментариев вне JSON.

Верни JSON строго в этой форме:

{
  "estimatedDimensions": {
    "widthM": number | null,
    "lengthM": number | null,
    "heightM": number | null,
    "confidence": "low" | "medium" | "high"
  },
  "detectedObjects": string[],
  "removableObjects": string[],
  "fixedElements": string[],
  "constraints": string[],
  "notes": string[],
  "openings": [
    {
      "id": "door_1",
      "type": "door" | "window",
      "wall": "top" | "right" | "bottom" | "left",
      "offsetM": number,
      "widthM": number,
      "label": "string",
      "hinge": "start" | "end",
      "swing": "in" | "out"
    }
  ]
}
`.trim();
}
