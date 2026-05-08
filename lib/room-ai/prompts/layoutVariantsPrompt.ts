import type { RoomAnalysis, RoomDimensions, RoomType } from "@/lib/room-ai/types";

type BuildLayoutVariantsPromptInput = {
  roomType: RoomType;
  roomAnalysis: RoomAnalysis;
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

export function buildLayoutVariantsPrompt(input: BuildLayoutVariantsPromptInput) {
  const widthM =
    input.roomDimensions?.widthM ??
    input.roomAnalysis.estimatedDimensions.widthM ??
    null;

  const lengthM =
    input.roomDimensions?.lengthM ??
    input.roomAnalysis.estimatedDimensions.lengthM ??
    null;

  const heightM =
    input.roomDimensions?.heightM ??
    input.roomAnalysis.estimatedDimensions.heightM ??
    null;

  return `
Ты — практичный интерьерный планировщик.

На основе анализа помещения предложи 1 готовый вариант расстановки мебели.

Назначение комнаты: ${roomTypeLabels[input.roomType]}
Количество людей: ${input.peopleCount ?? "не указано"}
Размеры:
- ширина: ${widthM ?? "неизвестно"} м
- длина: ${lengthM ?? "неизвестно"} м
- высота: ${heightM ?? "неизвестно"} м
Цветовая гамма: ${input.palette ?? "не указана"}

Анализ помещения:
${JSON.stringify(input.roomAnalysis, null, 2)}

Правила:
- Отвечай на русском языке.
- Нужно предложить ровно 1 вариант.
- Каждый вариант должен быть реалистичным.
- Не блокируй двери, окна, батареи, вентиляцию, розетки и проходы.
- Координаты мебели задавай примерно в метрах от левого верхнего угла комнаты на плане сверху.
- xM — отступ от левой стены.
- yM — отступ от верхней стены.
- widthM — ширина предмета на плане.
- depthM — глубина предмета на плане.
- rotationDeg — 0, 90, 180 или 270.
- Для поля type используй нормализованные типы:
  "bed", "nightstand", "desk", "wardrobe", "lamp", "rug", "sofa", "table", "chair", "dresser", "cabinet", "shelf", "tv", "other".
- Для двери и окна обязательно верни openings.
- Если в анализе уже есть openings, опирайся в первую очередь на них и не придумывай другую архитектуру комнаты.
- openings — это архитектурные проёмы помещения:
  - wall: "top" | "right" | "bottom" | "left"
  - offsetM: расстояние от начала стены
  - widthM: ширина проёма
  - для двери добавь hinge: "start" | "end" и swing: "in" | "out"
- Если точные проёмы не видны, оцени их разумно по описанию комнаты.
- Ответ должен быть только валидным JSON.
- Без markdown.
- Без комментариев вне JSON.
- Не размещай мебель в зоне двери и в секторе открывания двери.
- Оставляй минимум 70 см свободного прохода от двери к основной зоне комнаты.
- Не размещай мебель вплотную к окну, если это мешает доступу к окну или проветриванию.
- Ковёр должен иметь type: "rug" и располагаться под кроватью, диваном или столом как фоновый предмет.
- Кровать должна иметь type: "bed".
- Шкаф/гардероб должен иметь type: "wardrobe".
- Тумба у кровати должна иметь type: "nightstand".
- Торшер или напольный светильник должен иметь type: "lamp".
- Не допускай пересечения предметов мебели между собой. Между крупными предметами оставляй хотя бы 10–20 см визуального зазора.
- Делай план консервативным: лучше меньше мебели, но реалистичнее и с нормальными проходами.
- Крупную мебель по умолчанию ставь вдоль стен, а центр комнаты оставляй свободнее, если сценарий не требует иного.

Верни JSON строго в этой форме:

{
  "variants": [
    {
      "id": "variant_1",
      "title": "string",
      "description": "string",
      "palette": ["#hex", "#hex", "#hex"],
      "pros": ["string"],
      "cons": ["string"],
      "openings": [
        {
          "id": "door_1",
          "type": "door",
          "wall": "left",
          "offsetM": 0.2,
          "widthM": 0.8,
          "label": "дверь",
          "hinge": "start",
          "swing": "in"
        },
        {
          "id": "window_1",
          "type": "window",
          "wall": "bottom",
          "offsetM": 1.2,
          "widthM": 1.4,
          "label": "окно"
        }
      ],
      "furniture": [
        {
          "id": "string",
          "type": "bed",
          "label": "Кровать",
          "xM": number,
          "yM": number,
          "widthM": number,
          "depthM": number,
          "rotationDeg": number,
          "color": "string"
        }
      ]
    }
  ]
}
`.trim();
}
