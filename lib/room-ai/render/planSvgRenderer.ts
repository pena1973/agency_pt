import type {
    FurnitureItem,
    RoomAnalysis,
    RoomDimensions,
    RoomOpening,
    RoomType,
    RoomVariant,
} from "@/lib/room-ai/types";

type RenderPlanSvgInput = {
    variant: RoomVariant;
    roomType: RoomType;
    roomAnalysis: RoomAnalysis;
    roomDimensions?: RoomDimensions;
};

type PreparedFurniture = FurnitureItem & {
    kind: string;
    xM: number;
    yM: number;
    widthM: number;
    depthM: number;
};

const DEFAULT_ROOM_WIDTH_M = 4;
const DEFAULT_ROOM_LENGTH_M = 5;
const WALL_STROKE = 4;

export function renderPlanSvg(input: RenderPlanSvgInput): string {
    const roomWidthM = normalizeRoomSize(
        input.roomDimensions?.widthM ??
        input.roomAnalysis.estimatedDimensions.widthM ??
        DEFAULT_ROOM_WIDTH_M
    );

    const roomLengthM = normalizeRoomSize(
        input.roomDimensions?.lengthM ??
        input.roomAnalysis.estimatedDimensions.lengthM ??
        DEFAULT_ROOM_LENGTH_M
    );

    const canvasWidth = 1100;
    const canvasHeight = 860;

    const headerHeight = 130;
    const footerHeight = 80;
    const sidePadding = 90;

    const availableWidth = canvasWidth - sidePadding * 2;
    const availableHeight = canvasHeight - headerHeight - footerHeight - 10;

    const scale = Math.min(
        availableWidth / roomWidthM,
        availableHeight / roomLengthM
    );

    const roomPxWidth = roomWidthM * scale;
    const roomPxHeight = roomLengthM * scale;
    const roomX = (canvasWidth - roomPxWidth) / 2;
    const roomY = headerHeight;

    const palette = normalizePalette(input.variant.palette);

    const openings = prepareOpenings(
        input.variant.openings?.length
            ? input.variant.openings
            : input.roomAnalysis.openings ?? [],
        roomWidthM,
        roomLengthM
    );

    const preparedFurniture = prepareFurniture(
        input.variant.furniture,
        roomWidthM,
        roomLengthM,
        openings,
        input.variant.layoutSource === "photo_refined"
    );

    const autoRug = createAutoRugIfNeeded(preparedFurniture, input.roomType);
    const rugs = [
        ...preparedFurniture.filter((item) => item.kind === "rug"),
        ...(autoRug ? [autoRug] : []),
    ];

    const furnitureWithoutRugs = preparedFurniture.filter(
        (item) => item.kind !== "rug"
    );

    return `
<svg width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="rugPattern" patternUnits="userSpaceOnUse" width="12" height="12" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="12" stroke="#94a3b8" stroke-width="2" opacity="0.55"/>
    </pattern>
    <pattern id="rugDots" patternUnits="userSpaceOnUse" width="10" height="10">
      <circle cx="3" cy="3" r="1.2" fill="#94a3b8" opacity="0.35"/>
    </pattern>
  </defs>

  <rect width="${canvasWidth}" height="${canvasHeight}" fill="#f8fafc"/>
  <rect x="24" y="20" width="${canvasWidth - 48}" height="${canvasHeight - 40}" rx="28" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>

  <text x="60" y="60" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#059669">
    ПЛАН РАССТАНОВКИ
  </text>

  <text x="60" y="96" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#0f172a">
    ${escapeXml(trimText(input.variant.title, 58))}
  </text>

  <text x="${canvasWidth - 60}" y="60" text-anchor="end" font-family="Arial, sans-serif" font-size="15" fill="#475569">
    ${escapeXml(getRoomTypeLabel(input.roomType))}
  </text>

  <text x="${canvasWidth - 60}" y="84" text-anchor="end" font-family="Arial, sans-serif" font-size="15" fill="#475569">
    Размер: ${escapeXml(`${roundOne(roomWidthM)} × ${roundOne(roomLengthM)} м`)}
  </text>

  <text x="${canvasWidth - 60}" y="108" text-anchor="end" font-family="Arial, sans-serif" font-size="13" fill="#64748b">
    Точность: ${escapeXml(input.roomAnalysis.estimatedDimensions.confidence)}
  </text>

  ${renderRoomGrid(roomX, roomY, roomPxWidth, roomPxHeight, roomWidthM, roomLengthM, scale)}

  <rect
    x="${roundTwo(roomX)}"
    y="${roundTwo(roomY)}"
    width="${roundTwo(roomPxWidth)}"
    height="${roundTwo(roomPxHeight)}"
    rx="8"
    fill="#fffefc"
    stroke="#1e293b"
    stroke-width="${WALL_STROKE}"
  />

  ${renderOpenings(openings, roomX, roomY, roomWidthM, roomLengthM, scale)}

  ${rugs
            .map((rug, index) =>
                renderFurnitureShape(rug, roomX, roomY, scale, palette[index % palette.length])
            )
            .join("")}

  ${furnitureWithoutRugs
            .map((item, index) =>
                renderFurnitureShape(item, roomX, roomY, scale, palette[index % palette.length])
            )
            .join("")}

  ${buildDimensionLabels(roomX, roomY, roomPxWidth, roomPxHeight, roomWidthM, roomLengthM)}

  <text x="60" y="${canvasHeight - 40}" font-family="Arial, sans-serif" font-size="14" fill="#64748b">
    Вид сверху. Схема построена автоматически по координатам мебели и проёмов. Это концептуальный план, а не строительный чертёж.
  </text>
</svg>
`.trim();
}

function prepareFurniture(
    items: FurnitureItem[],
    roomWidthM: number,
    roomLengthM: number,
    openings: RoomOpening[],
    preservePlacement = false
): PreparedFurniture[] {
    const normalized = items.map((item) => {
        const isRotated = item.rotationDeg === 90 || item.rotationDeg === 270;

        const widthM = clampNumber(
            isRotated ? item.depthM : item.widthM,
            0.35,
            roomWidthM
        );

        const depthM = clampNumber(
            isRotated ? item.widthM : item.depthM,
            0.35,
            roomLengthM
        );

        return {
            ...item,
            kind: classifyFurniture(item),
            widthM,
            depthM,
            xM: clampNumber(item.xM, 0, Math.max(0, roomWidthM - widthM)),
            yM: clampNumber(item.yM, 0, Math.max(0, roomLengthM - depthM)),
        };
    });

    if (preservePlacement) {
        return normalized;
    }

    return resolveFurniturePlacement(
        normalized,
        roomWidthM,
        roomLengthM,
        openings
    );
}
function prepareOpenings(
    openings: RoomOpening[],
    roomWidthM: number,
    roomLengthM: number
): RoomOpening[] {
    const fallback: RoomOpening[] =
        openings.length > 0
            ? openings
            : [
                {
                    id: "door_fallback",
                    type: "door",
                    wall: "left",
                    offsetM: 0.25,
                    widthM: 0.8,
                    hinge: "start",
                    swing: "in",
                    label: "дверь",
                },
                {
                    id: "window_fallback",
                    type: "window",
                    wall: "bottom",
                    offsetM: Math.max(0.6, roomWidthM / 2 - 0.7),
                    widthM: Math.min(1.6, roomWidthM - 1.2),
                    label: "окно",
                },
            ];

    return fallback.map((opening) => {
        const wallLength =
            opening.wall === "top" || opening.wall === "bottom"
                ? roomWidthM
                : roomLengthM;

        const widthM = clampNumber(opening.widthM, 0.5, Math.max(0.5, wallLength));
        const offsetM = clampNumber(
            opening.offsetM,
            0,
            Math.max(0, wallLength - widthM)
        );

        return {
            ...opening,
            widthM,
            offsetM,
        };
    });
}

function createAutoRugIfNeeded(
    furniture: PreparedFurniture[],
    roomType: RoomType
): PreparedFurniture | null {
    const hasRug = furniture.some((item) => item.kind === "rug");
    if (hasRug) return null;

    if (roomType === "bedroom" || roomType === "kids_room") {
        const bed = furniture.find((item) => item.kind === "bed");
        if (!bed) return null;

        const rugWidth = clampNumber(bed.widthM + 0.5, 1.2, bed.widthM + 1);
        const rugDepth = clampNumber(bed.depthM * 0.55, 0.8, 1.4);

        return {
            id: "auto_rug_bed",
            type: "rug",
            label: "Ковёр",
            color: "#e2e8f0",
            rotationDeg: 0,
            kind: "rug",
            widthM: rugWidth,
            depthM: rugDepth,
            xM: Math.max(0, bed.xM + (bed.widthM - rugWidth) / 2),
            yM: bed.yM + bed.depthM * 0.55,
        };
    }

    if (roomType === "living_room") {
        const sofa = furniture.find((item) => item.kind === "sofa");
        if (!sofa) return null;

        return {
            id: "auto_rug_sofa",
            type: "rug",
            label: "Ковёр",
            color: "#e2e8f0",
            rotationDeg: 0,
            kind: "rug",
            widthM: clampNumber(sofa.widthM + 0.8, 1.4, sofa.widthM + 1.2),
            depthM: clampNumber(sofa.depthM + 0.9, 1.2, sofa.depthM + 1.4),
            xM: Math.max(0, sofa.xM - 0.2),
            yM: Math.max(0, sofa.yM + sofa.depthM + 0.15),
        };
    }

    return null;
}

function renderRoomGrid(
    roomX: number,
    roomY: number,
    roomPxWidth: number,
    roomPxHeight: number,
    roomWidthM: number,
    roomLengthM: number,
    scale: number
) {
    const lines: string[] = [];

    for (let x = 1; x < Math.floor(roomWidthM); x++) {
        const px = roomX + x * scale;
        lines.push(`
      <line x1="${roundTwo(px)}" y1="${roundTwo(roomY)}" x2="${roundTwo(px)}" y2="${roundTwo(
            roomY + roomPxHeight
        )}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="5 7"/>
    `);
    }

    for (let y = 1; y < Math.floor(roomLengthM); y++) {
        const py = roomY + y * scale;
        lines.push(`
      <line x1="${roundTwo(roomX)}" y1="${roundTwo(py)}" x2="${roundTwo(
            roomX + roomPxWidth
        )}" y2="${roundTwo(py)}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="5 7"/>
    `);
    }

    return lines.join("");
}

function renderOpenings(
    openings: RoomOpening[],
    roomX: number,
    roomY: number,
    roomWidthM: number,
    roomLengthM: number,
    scale: number
) {
    return openings
        .map((opening) => {
            if (opening.type === "window") {
                return renderWindow(opening, roomX, roomY, roomWidthM, roomLengthM, scale);
            }

            return renderDoor(opening, roomX, roomY, roomWidthM, roomLengthM, scale);
        })
        .join("");
}

function renderWindow(
    opening: RoomOpening,
    roomX: number,
    roomY: number,
    roomWidthM: number,
    roomLengthM: number,
    scale: number
) {
    const color = "#38bdf8";
    const label = opening.label || "Окно";

    if (opening.wall === "top" || opening.wall === "bottom") {
        const x = roomX + opening.offsetM * scale;
        const y = opening.wall === "top" ? roomY - 2 : roomY + roomLengthM * scale - 2;

        return `
      <g>
        <line x1="${roundTwo(x)}" y1="${roundTwo(y)}" x2="${roundTwo(
            x + opening.widthM * scale
        )}" y2="${roundTwo(y)}" stroke="${color}" stroke-width="8" stroke-linecap="round"/>
        <text x="${roundTwo(x + (opening.widthM * scale) / 2)}" y="${roundTwo(
            opening.wall === "top" ? y - 10 : y + 22
        )}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="${color}">
          ${escapeXml(label)}
        </text>
      </g>
    `;
    }

    const y = roomY + opening.offsetM * scale;
    const x = opening.wall === "left" ? roomX - 2 : roomX + roomWidthM * scale - 2;

    return `
    <g>
      <line x1="${roundTwo(x)}" y1="${roundTwo(y)}" x2="${roundTwo(x)}" y2="${roundTwo(
        y + opening.widthM * scale
    )}" stroke="${color}" stroke-width="8" stroke-linecap="round"/>
      <text x="${roundTwo(opening.wall === "left" ? x - 16 : x + 16)}" y="${roundTwo(
        y + (opening.widthM * scale) / 2
    )}" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="${color}" text-anchor="${opening.wall === "left" ? "end" : "start"
        }">
        ${escapeXml(label)}
      </text>
    </g>
  `;
}

function renderDoor(
    opening: RoomOpening,
    roomX: number,
    roomY: number,
    roomWidthM: number,
    roomLengthM: number,
    scale: number
) {
    const widthPx = opening.widthM * scale;
    const label = opening.label || "Дверь";

    if (opening.wall === "left") {
        const hingeAtStart = opening.hinge !== "end";
        const hingeY = roomY + (hingeAtStart ? opening.offsetM : opening.offsetM + opening.widthM) * scale;
        const leafEndY = hingeAtStart ? hingeY + widthPx : hingeY - widthPx;
        const leafEndX = roomX + widthPx;

        return `
      <g>
        <line x1="${roundTwo(roomX)}" y1="${roundTwo(hingeY)}" x2="${roundTwo(
            leafEndX
        )}" y2="${roundTwo(leafEndY)}" stroke="#475569" stroke-width="2"/>
        <path d="M ${roundTwo(roomX)} ${roundTwo(hingeY)} A ${roundTwo(
            widthPx
        )} ${roundTwo(widthPx)} 0 0 1 ${roundTwo(leafEndX)} ${roundTwo(
            leafEndY
        )}" fill="none" stroke="#94a3b8" stroke-width="1.8" stroke-dasharray="5 5"/>
        <text x="${roundTwo(roomX + 14)}" y="${roundTwo(
            Math.min(roomY + roomLengthM * scale - 8, hingeAtStart ? hingeY + 18 : hingeY - 8)
        )}" font-family="Arial, sans-serif" font-size="12" fill="#475569">
          ${escapeXml(label)}
        </text>
      </g>
    `;
    }

    if (opening.wall === "right") {
        const hingeAtStart = opening.hinge !== "end";
        const hingeY = roomY + (hingeAtStart ? opening.offsetM : opening.offsetM + opening.widthM) * scale;
        const leafEndY = hingeAtStart ? hingeY + widthPx : hingeY - widthPx;
        const leafEndX = roomX + roomWidthM * scale - widthPx;

        return `
      <g>
        <line x1="${roundTwo(roomX + roomWidthM * scale)}" y1="${roundTwo(
            hingeY
        )}" x2="${roundTwo(leafEndX)}" y2="${roundTwo(leafEndY)}" stroke="#475569" stroke-width="2"/>
        <path d="M ${roundTwo(roomX + roomWidthM * scale)} ${roundTwo(
            hingeY
        )} A ${roundTwo(widthPx)} ${roundTwo(widthPx)} 0 0 0 ${roundTwo(
            leafEndX
        )} ${roundTwo(leafEndY)}" fill="none" stroke="#94a3b8" stroke-width="1.8" stroke-dasharray="5 5"/>
        <text x="${roundTwo(roomX + roomWidthM * scale - 14)}" y="${roundTwo(
            Math.min(roomY + roomLengthM * scale - 8, hingeAtStart ? hingeY + 18 : hingeY - 8)
        )}" text-anchor="end" font-family="Arial, sans-serif" font-size="12" fill="#475569">
          ${escapeXml(label)}
        </text>
      </g>
    `;
    }

    if (opening.wall === "top") {
        const hingeAtStart = opening.hinge !== "end";
        const hingeX = roomX + (hingeAtStart ? opening.offsetM : opening.offsetM + opening.widthM) * scale;
        const leafEndX = hingeAtStart ? hingeX + widthPx : hingeX - widthPx;
        const leafEndY = roomY + widthPx;

        return `
      <g>
        <line x1="${roundTwo(hingeX)}" y1="${roundTwo(roomY)}" x2="${roundTwo(
            leafEndX
        )}" y2="${roundTwo(leafEndY)}" stroke="#475569" stroke-width="2"/>
        <path d="M ${roundTwo(hingeX)} ${roundTwo(roomY)} A ${roundTwo(
            widthPx
        )} ${roundTwo(widthPx)} 0 0 1 ${roundTwo(leafEndX)} ${roundTwo(
            leafEndY
        )}" fill="none" stroke="#94a3b8" stroke-width="1.8" stroke-dasharray="5 5"/>
        <text x="${roundTwo(hingeAtStart ? hingeX + 16 : hingeX - 16)}" y="${roundTwo(
            roomY + 18
        )}" text-anchor="${hingeAtStart ? "start" : "end"}" font-family="Arial, sans-serif" font-size="12" fill="#475569">
          ${escapeXml(label)}
        </text>
      </g>
    `;
    }

    const hingeAtStart = opening.hinge !== "end";
    const hingeX = roomX + (hingeAtStart ? opening.offsetM : opening.offsetM + opening.widthM) * scale;
    const leafEndX = hingeAtStart ? hingeX + widthPx : hingeX - widthPx;
    const leafEndY = roomY + roomLengthM * scale - widthPx;

    return `
    <g>
      <line x1="${roundTwo(hingeX)}" y1="${roundTwo(
        roomY + roomLengthM * scale
    )}" x2="${roundTwo(leafEndX)}" y2="${roundTwo(leafEndY)}" stroke="#475569" stroke-width="2"/>
      <path d="M ${roundTwo(hingeX)} ${roundTwo(
        roomY + roomLengthM * scale
    )} A ${roundTwo(widthPx)} ${roundTwo(widthPx)} 0 0 0 ${roundTwo(
        leafEndX
    )} ${roundTwo(leafEndY)}" fill="none" stroke="#94a3b8" stroke-width="1.8" stroke-dasharray="5 5"/>
      <text x="${roundTwo(hingeAtStart ? hingeX + 16 : hingeX - 16)}" y="${roundTwo(
        roomY + roomLengthM * scale - 10
    )}" text-anchor="${hingeAtStart ? "start" : "end"}" font-family="Arial, sans-serif" font-size="12" fill="#475569">
        ${escapeXml(label)}
      </text>
    </g>
  `;
}

function renderFurnitureShape(
    item: PreparedFurniture,
    roomX: number,
    roomY: number,
    scale: number,
    fallbackColor: string
) {
    const x = roomX + item.xM * scale;
    const y = roomY + item.yM * scale;
    const w = item.widthM * scale;
    const h = item.depthM * scale;
    const fill = sanitizeColor(item.color || fallbackColor);
    const stroke = darkenHex(fill, 0.28);

    switch (item.kind) {
        case "rug":
            return renderRug(item, x, y, w, h);
        case "bed":
            return renderBed(item, x, y, w, h, fill, stroke);
        case "wardrobe":
        case "cabinet":
            return renderWardrobe(item, x, y, w, h, fill, stroke);
        case "nightstand":
            return renderNightstand(item, x, y, w, h, fill, stroke);
        case "desk":
            return renderDesk(item, x, y, w, h, fill, stroke);
        case "lamp":
            return renderLamp(item, x, y, w, h, fill, stroke);
        case "sofa":
            return renderSofa(item, x, y, w, h, fill, stroke);
        case "table":
            return renderTable(item, x, y, w, h, fill, stroke);
        case "chair":
            return renderChair(item, x, y, w, h, fill, stroke);
        case "dresser":
            return renderDresser(item, x, y, w, h, fill, stroke);
        case "shelf":
            return renderShelf(item, x, y, w, h, fill, stroke);
        case "tv":
            return renderTv(item, x, y, w, h, fill, stroke);
        default:
            return renderGeneric(item, x, y, w, h, fill, stroke);
    }
}

function renderRug(item: PreparedFurniture, x: number, y: number, w: number, h: number) {
    return `
    <g>
      <rect x="${roundTwo(x)}" y="${roundTwo(y)}" width="${roundTwo(w)}" height="${roundTwo(
        h
    )}" rx="10" fill="#e5e7eb" stroke="#94a3b8" stroke-width="1.8"/>
      <rect x="${roundTwo(x + 4)}" y="${roundTwo(y + 4)}" width="${roundTwo(
        Math.max(0, w - 8)
    )}" height="${roundTwo(Math.max(0, h - 8))}" rx="8" fill="url(#rugPattern)" opacity="0.9"/>
      <text x="${roundTwo(x + w / 2)}" y="${roundTwo(y + h / 2 + 5)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${clampNumber(
        Math.floor(Math.min(w / 11, h / 3)),
        10,
        14
    )}" font-weight="700" fill="#475569">
        ${escapeXml(shortFurnitureLabel(item.label))}
      </text>
    </g>
  `;
}

function renderBed(
    item: PreparedFurniture,
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    stroke: string
) {
    const label = shortFurnitureLabel(item.label);
    return `
    <g>
      <rect x="${roundTwo(x)}" y="${roundTwo(y)}" width="${roundTwo(w)}" height="${roundTwo(
        h
    )}" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="2.2"/>
      <rect x="${roundTwo(x)}" y="${roundTwo(y)}" width="${roundTwo(w)}" height="10" rx="8" fill="${stroke}" opacity="0.9"/>
      <rect x="${roundTwo(x + 10)}" y="${roundTwo(y + 16)}" width="${roundTwo(
        Math.max(24, w / 2 - 16)
    )}" height="${roundTwo(Math.min(20, Math.max(14, h * 0.16)))}" rx="6" fill="#ffffff" opacity="0.85"/>
      <rect x="${roundTwo(x + w / 2 + 6)}" y="${roundTwo(y + 16)}" width="${roundTwo(
        Math.max(24, w / 2 - 16)
    )}" height="${roundTwo(Math.min(20, Math.max(14, h * 0.16)))}" rx="6" fill="#ffffff" opacity="0.85"/>
      <rect x="${roundTwo(x + 10)}" y="${roundTwo(y + 44)}" width="${roundTwo(
        Math.max(0, w - 20)
    )}" height="${roundTwo(Math.max(0, h - 54))}" rx="8" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>
      ${renderCenteredLabel(label, x, y, w, h)}
    </g>
  `;
}

function renderWardrobe(
    item: PreparedFurniture,
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    stroke: string
) {
    return `
    <g>
      <rect x="${roundTwo(x)}" y="${roundTwo(y)}" width="${roundTwo(w)}" height="${roundTwo(
        h
    )}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="2.2"/>
      <line x1="${roundTwo(x + w / 2)}" y1="${roundTwo(y + 6)}" x2="${roundTwo(
        x + w / 2
    )}" y2="${roundTwo(y + h - 6)}" stroke="${stroke}" stroke-width="1.8"/>
      <circle cx="${roundTwo(x + w / 2 - 10)}" cy="${roundTwo(y + h / 2)}" r="2.3" fill="${stroke}"/>
      <circle cx="${roundTwo(x + w / 2 + 10)}" cy="${roundTwo(y + h / 2)}" r="2.3" fill="${stroke}"/>
      ${renderCenteredLabel(shortFurnitureLabel(item.label), x, y, w, h)}
    </g>
  `;
}

function renderNightstand(
    item: PreparedFurniture,
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    stroke: string
) {
    return `
    <g>
      <rect x="${roundTwo(x)}" y="${roundTwo(y)}" width="${roundTwo(w)}" height="${roundTwo(
        h
    )}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
      <line x1="${roundTwo(x + 6)}" y1="${roundTwo(y + h / 2)}" x2="${roundTwo(
        x + w - 6
    )}" y2="${roundTwo(y + h / 2)}" stroke="${stroke}" stroke-width="1.4"/>
      ${renderCenteredLabel(shortFurnitureLabel(item.label), x, y, w, h)}
    </g>
  `;
}

function renderDesk(
    item: PreparedFurniture,
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    stroke: string
) {
    const chairW = Math.min(24, w * 0.22);
    return `
    <g>
      <rect x="${roundTwo(x)}" y="${roundTwo(y)}" width="${roundTwo(w)}" height="${roundTwo(
        h
    )}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
      <rect x="${roundTwo(x + w / 2 - chairW / 2)}" y="${roundTwo(
        y + h + 8
    )}" width="${roundTwo(chairW)}" height="10" rx="5" fill="#cbd5e1" stroke="#64748b" stroke-width="1"/>
      ${renderCenteredLabel(shortFurnitureLabel(item.label), x, y, w, h)}
    </g>
  `;
}

function renderLamp(
    item: PreparedFurniture,
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    stroke: string
) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const radius = Math.min(w, h) / 2.6;

    return `
    <g>
      <circle cx="${roundTwo(cx)}" cy="${roundTwo(cy)}" r="${roundTwo(radius)}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
      <circle cx="${roundTwo(cx)}" cy="${roundTwo(cy)}" r="${roundTwo(radius / 3)}" fill="#ffffff" opacity="0.7"/>
      <line x1="${roundTwo(cx)}" y1="${roundTwo(y + 6)}" x2="${roundTwo(cx)}" y2="${roundTwo(
        y + h - 6
    )}" stroke="${stroke}" stroke-width="1.4" opacity="0.7"/>
      ${renderCenteredLabel(shortFurnitureLabel(item.label), x, y, w, h)}
    </g>
  `;
}

function renderSofa(
    item: PreparedFurniture,
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    stroke: string
) {
    return `
    <g>
      <rect x="${roundTwo(x)}" y="${roundTwo(y)}" width="${roundTwo(w)}" height="${roundTwo(
        h
    )}" rx="16" fill="${fill}" stroke="${stroke}" stroke-width="2.2"/>
      <rect x="${roundTwo(x + 8)}" y="${roundTwo(y + 8)}" width="${roundTwo(
        Math.max(0, w - 16)
    )}" height="${roundTwo(Math.max(0, h - 16))}" rx="12" fill="rgba(255,255,255,0.18)"/>
      <rect x="${roundTwo(x + 10)}" y="${roundTwo(y + 10)}" width="${roundTwo(
        Math.max(18, w / 3 - 12)
    )}" height="${roundTwo(Math.max(12, h - 20))}" rx="10" fill="rgba(255,255,255,0.18)"/>
      <rect x="${roundTwo(x + w / 2 - (w / 3) / 2)}" y="${roundTwo(y + 10)}" width="${roundTwo(
        Math.max(18, w / 3 - 12)
    )}" height="${roundTwo(Math.max(12, h - 20))}" rx="10" fill="rgba(255,255,255,0.18)"/>
      <rect x="${roundTwo(x + w - Math.max(18, w / 3 - 12) - 10)}" y="${roundTwo(
        y + 10
    )}" width="${roundTwo(Math.max(18, w / 3 - 12))}" height="${roundTwo(
        Math.max(12, h - 20)
    )}" rx="10" fill="rgba(255,255,255,0.18)"/>
      ${renderCenteredLabel(shortFurnitureLabel(item.label), x, y, w, h)}
    </g>
  `;
}

function renderTable(
    item: PreparedFurniture,
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    stroke: string
) {
    return `
    <g>
      <rect x="${roundTwo(x)}" y="${roundTwo(y)}" width="${roundTwo(w)}" height="${roundTwo(
        h
    )}" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
      <circle cx="${roundTwo(x + 10)}" cy="${roundTwo(y + 10)}" r="2" fill="${stroke}"/>
      <circle cx="${roundTwo(x + w - 10)}" cy="${roundTwo(y + 10)}" r="2" fill="${stroke}"/>
      <circle cx="${roundTwo(x + 10)}" cy="${roundTwo(y + h - 10)}" r="2" fill="${stroke}"/>
      <circle cx="${roundTwo(x + w - 10)}" cy="${roundTwo(y + h - 10)}" r="2" fill="${stroke}"/>
      ${renderCenteredLabel(shortFurnitureLabel(item.label), x, y, w, h)}
    </g>
  `;
}

function renderChair(
    item: PreparedFurniture,
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    stroke: string
) {
    return `
    <g>
      <rect x="${roundTwo(x)}" y="${roundTwo(y + 8)}" width="${roundTwo(w)}" height="${roundTwo(
        Math.max(0, h - 8)
    )}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="1.8"/>
      <rect x="${roundTwo(x + 6)}" y="${roundTwo(y)}" width="${roundTwo(
        Math.max(0, w - 12)
    )}" height="10" rx="5" fill="rgba(255,255,255,0.22)" stroke="${stroke}" stroke-width="1.2"/>
      ${renderCenteredLabel(shortFurnitureLabel(item.label), x, y, w, h)}
    </g>
  `;
}

function renderDresser(
    item: PreparedFurniture,
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    stroke: string
) {
    return `
    <g>
      <rect x="${roundTwo(x)}" y="${roundTwo(y)}" width="${roundTwo(w)}" height="${roundTwo(
        h
    )}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
      <line x1="${roundTwo(x + 6)}" y1="${roundTwo(y + h / 3)}" x2="${roundTwo(
        x + w - 6
    )}" y2="${roundTwo(y + h / 3)}" stroke="${stroke}" stroke-width="1.3"/>
      <line x1="${roundTwo(x + 6)}" y1="${roundTwo(y + (2 * h) / 3)}" x2="${roundTwo(
        x + w - 6
    )}" y2="${roundTwo(y + (2 * h) / 3)}" stroke="${stroke}" stroke-width="1.3"/>
      ${renderCenteredLabel(shortFurnitureLabel(item.label), x, y, w, h)}
    </g>
  `;
}

function renderShelf(
    item: PreparedFurniture,
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    stroke: string
) {
    return `
    <g>
      <rect x="${roundTwo(x)}" y="${roundTwo(y)}" width="${roundTwo(w)}" height="${roundTwo(
        h
    )}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
      <line x1="${roundTwo(x + 6)}" y1="${roundTwo(y + h / 3)}" x2="${roundTwo(
        x + w - 6
    )}" y2="${roundTwo(y + h / 3)}" stroke="${stroke}" stroke-width="1.2"/>
      <line x1="${roundTwo(x + 6)}" y1="${roundTwo(y + (2 * h) / 3)}" x2="${roundTwo(
        x + w - 6
    )}" y2="${roundTwo(y + (2 * h) / 3)}" stroke="${stroke}" stroke-width="1.2"/>
      ${renderCenteredLabel(shortFurnitureLabel(item.label), x, y, w, h)}
    </g>
  `;
}

function renderTv(
    item: PreparedFurniture,
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    stroke: string
) {
    return `
    <g>
      <rect x="${roundTwo(x)}" y="${roundTwo(y)}" width="${roundTwo(w)}" height="${roundTwo(
        h
    )}" rx="6" fill="#1f2937" stroke="${stroke}" stroke-width="2"/>
      <rect x="${roundTwo(x + 8)}" y="${roundTwo(y + 8)}" width="${roundTwo(
        Math.max(0, w - 16)
    )}" height="${roundTwo(Math.max(0, h - 16))}" rx="4" fill="#111827"/>
      <text x="${roundTwo(x + w / 2)}" y="${roundTwo(y + h / 2 + 4)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${clampNumber(
        Math.floor(Math.min(w / 8, h / 2.5)),
        9,
        14
    )}" font-weight="700" fill="#e5e7eb">
        ТВ
      </text>
    </g>
  `;
}

function renderGeneric(
    item: PreparedFurniture,
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    stroke: string
) {
    return `
    <g>
      <rect x="${roundTwo(x)}" y="${roundTwo(y)}" width="${roundTwo(w)}" height="${roundTwo(
        h
    )}" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
      ${renderCenteredLabel(shortFurnitureLabel(item.label), x, y, w, h)}
    </g>
  `;
}

function renderCenteredLabel(
    label: string,
    x: number,
    y: number,
    w: number,
    h: number
) {
    const lines = makeLabelLines(label, w);
    const fontSize = clampNumber(Math.floor(Math.min(w / 8.5, h / 3.1)), 9, 16);
    const lineHeight = fontSize + 3;
    const totalHeight = lines.length * lineHeight;
    const startY = y + h / 2 - totalHeight / 2 + fontSize;

    return lines
        .map(
            (line, index) => `
        <text
          x="${roundTwo(x + w / 2)}"
          y="${roundTwo(startY + index * lineHeight)}"
          text-anchor="middle"
          font-family="Arial, sans-serif"
          font-size="${fontSize}"
          font-weight="700"
          fill="#0f172a"
        >
          ${escapeXml(line)}
        </text>
      `
        )
        .join("");
}

function makeLabelLines(label: string, boxWidthPx: number): string[] {
    const clean = label.trim();
    if (!clean) return ["Мебель"];

    const maxChars = Math.max(5, Math.floor(boxWidthPx / 11));
    const words = clean.split(/\s+/);

    const lines: string[] = [];
    let current = "";

    for (const word of words) {
        const test = current ? `${current} ${word}` : word;

        if (test.length <= maxChars) {
            current = test;
        } else {
            if (current) lines.push(current);
            current = word;
        }

        if (lines.length === 2) break;
    }

    if (lines.length < 2 && current) lines.push(current);
    if (lines.length === 0) lines.push(trimText(clean, maxChars));

    return lines.slice(0, 2).map((line) => trimText(line, maxChars));
}

function resolveFurniturePlacement(
    items: PreparedFurniture[],
    roomWidthM: number,
    roomLengthM: number,
    openings: RoomOpening[]
): PreparedFurniture[] {
    const rugs = items.filter((item) => item.kind === "rug");
    const furniture = items.filter((item) => item.kind !== "rug");

    const openingObstacles = buildOpeningObstacles(
        openings,
        roomWidthM,
        roomLengthM
    );

    const placed: PreparedFurniture[] = [];

    const sorted = [...furniture].sort((a, b) => {
        const areaA = a.widthM * a.depthM;
        const areaB = b.widthM * b.depthM;
        return areaB - areaA;
    });

    for (const item of sorted) {
        const obstacles = [...openingObstacles, ...placed.map(toCollisionBox)];

        const placedItem = findNearestFreePosition(
            item,
            obstacles,
            roomWidthM,
            roomLengthM
        );

        placed.push(placedItem);
    }

    return [...rugs, ...placed];
}
type CollisionBox = {
    xM: number;
    yM: number;
    widthM: number;
    depthM: number;
    reason?: string;
};

function toCollisionBox(item: PreparedFurniture): CollisionBox {
    return {
        xM: item.xM,
        yM: item.yM,
        widthM: item.widthM,
        depthM: item.depthM,
        reason: item.label,
    };
}

function buildOpeningObstacles(
    openings: RoomOpening[],
    roomWidthM: number,
    roomLengthM: number
): CollisionBox[] {
    const obstacles: CollisionBox[] = [];

    for (const opening of openings) {
        const clearance = opening.type === "door" ? 0.95 : 0.45;

        if (opening.wall === "top") {
            obstacles.push({
                xM: opening.offsetM,
                yM: 0,
                widthM: opening.widthM,
                depthM: clearance,
                reason: opening.type,
            });
        }

        if (opening.wall === "bottom") {
            obstacles.push({
                xM: opening.offsetM,
                yM: Math.max(0, roomLengthM - clearance),
                widthM: opening.widthM,
                depthM: clearance,
                reason: opening.type,
            });
        }

        if (opening.wall === "left") {
            obstacles.push({
                xM: 0,
                yM: opening.offsetM,
                widthM: clearance,
                depthM: opening.widthM,
                reason: opening.type,
            });
        }

        if (opening.wall === "right") {
            obstacles.push({
                xM: Math.max(0, roomWidthM - clearance),
                yM: opening.offsetM,
                widthM: clearance,
                depthM: opening.widthM,
                reason: opening.type,
            });
        }
    }

    return obstacles;
}

function findNearestFreePosition(
    item: PreparedFurniture,
    obstacles: CollisionBox[],
    roomWidthM: number,
    roomLengthM: number
): PreparedFurniture {
    const original = {
        xM: item.xM,
        yM: item.yM,
    };

    const candidates: Array<{ xM: number; yM: number; score: number }> = [];

    const step = 0.15;

    const maxX = Math.max(0, roomWidthM - item.widthM);
    const maxY = Math.max(0, roomLengthM - item.depthM);

    for (let y = 0; y <= maxY + 0.001; y += step) {
        for (let x = 0; x <= maxX + 0.001; x += step) {
            const candidate: CollisionBox = {
                xM: roundTwo(x),
                yM: roundTwo(y),
                widthM: item.widthM,
                depthM: item.depthM,
            };

            const hasCollision = obstacles.some((obstacle) =>
                boxesOverlap(candidate, obstacle, 0.06)
            );

            if (!hasCollision) {
                const distance =
                    Math.abs(candidate.xM - original.xM) +
                    Math.abs(candidate.yM - original.yM);
                const placementPenalty = getPlacementPenalty(
                    item,
                    candidate,
                    roomWidthM,
                    roomLengthM
                );

                candidates.push({
                    xM: candidate.xM,
                    yM: candidate.yM,
                    score: distance + placementPenalty,
                });
            }
        }
    }

    if (candidates.length === 0) {
        return {
            ...item,
            xM: clampNumber(item.xM, 0, maxX),
            yM: clampNumber(item.yM, 0, maxY),
        };
    }

    candidates.sort((a, b) => a.score - b.score);

    const best = candidates[0];

    return {
        ...item,
        xM: best.xM,
        yM: best.yM,
    };
}

function boxesOverlap(a: CollisionBox, b: CollisionBox, padding = 0) {
    return !(
        a.xM + a.widthM + padding <= b.xM ||
        b.xM + b.widthM + padding <= a.xM ||
        a.yM + a.depthM + padding <= b.yM ||
        b.yM + b.depthM + padding <= a.yM
    );
}

function getPlacementPenalty(
    item: PreparedFurniture,
    candidate: CollisionBox,
    roomWidthM: number,
    roomLengthM: number
) {
    const leftGap = candidate.xM;
    const rightGap = roomWidthM - (candidate.xM + candidate.widthM);
    const topGap = candidate.yM;
    const bottomGap = roomLengthM - (candidate.yM + candidate.depthM);
    const nearestWallGap = Math.min(leftGap, rightGap, topGap, bottomGap);

    const centerX = candidate.xM + candidate.widthM / 2;
    const centerY = candidate.yM + candidate.depthM / 2;
    const centerDistance =
        Math.abs(centerX - roomWidthM / 2) +
        Math.abs(centerY - roomLengthM / 2);

    if (["bed", "sofa", "wardrobe", "dresser", "cabinet", "shelf", "tv"].includes(item.kind)) {
        return nearestWallGap * 0.9 + Math.max(0, 1.2 - centerDistance) * 1.8;
    }

    if (item.kind === "desk" || item.kind === "table") {
        return nearestWallGap * 0.45 + Math.max(0, 0.7 - centerDistance) * 0.8;
    }

    return nearestWallGap * 0.15;
}

function classifyFurniture(item: FurnitureItem) {
    const text = `${item.type} ${item.label}`.toLowerCase();

    if (text.includes("rug") || text.includes("ков")) return "rug";
    if (text.includes("bed") || text.includes("кров")) return "bed";
    if (text.includes("nightstand") || text.includes("тумб")) return "nightstand";
    if (text.includes("desk") || text.includes("рабоч") || text.includes("стол")) return "desk";
    if (text.includes("wardrobe") || text.includes("гардер") || text.includes("шкаф")) return "wardrobe";
    if (text.includes("lamp") || text.includes("торшер") || text.includes("светиль")) return "lamp";
    if (text.includes("sofa") || text.includes("диван")) return "sofa";
    if (text.includes("table") || text.includes("обеден")) return "table";
    if (text.includes("chair") || text.includes("стул") || text.includes("кресл")) return "chair";
    if (text.includes("dresser") || text.includes("комод")) return "dresser";
    if (text.includes("cabinet") || text.includes("тумба")) return "cabinet";
    if (text.includes("shelf") || text.includes("стеллаж") || text.includes("полк")) return "shelf";
    if (text.includes("tv") || text.includes("телев")) return "tv";

    return "other";
}

function buildDimensionLabels(
    roomX: number,
    roomY: number,
    roomPxWidth: number,
    roomPxHeight: number,
    roomWidthM: number,
    roomLengthM: number
) {
    return `
    <text x="${roundTwo(roomX + roomPxWidth / 2)}" y="${roundTwo(
        roomY - 16
    )}" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#334155">
      ${escapeXml(`${roundOne(roomWidthM)} м`)}
    </text>

    <text
      x="${roundTwo(roomX - 18)}"
      y="${roundTwo(roomY + roomPxHeight / 2)}"
      transform="rotate(-90 ${roundTwo(roomX - 18)} ${roundTwo(
        roomY + roomPxHeight / 2
    )})"
      text-anchor="middle"
      font-family="Arial, sans-serif"
      font-size="15"
      font-weight="700"
      fill="#334155"
    >
      ${escapeXml(`${roundOne(roomLengthM)} м`)}
    </text>
  `;
}

function shortFurnitureLabel(label: string) {
    const text = label.trim();
    if (text.length <= 12) return text;
    return trimText(text, 12);
}

function normalizeRoomSize(value: number) {
    return clampNumber(value, 2.2, 20);
}

function normalizePalette(palette?: string[]) {
    if (!Array.isArray(palette) || palette.length === 0) {
        return ["#dbe4f0", "#cbd5e1", "#e2e8f0", "#d6c29b"];
    }

    return palette.map((item) => sanitizeColor(item));
}

function sanitizeColor(value: string) {
    const trimmed = value.trim();
    const isHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed);
    return isHex ? trimmed : "#cbd5e1";
}

function clampNumber(value: number, min: number, max: number) {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
}

function roundOne(value: number) {
    return Math.round(value * 10) / 10;
}

function roundTwo(value: number) {
    return Math.round(value * 100) / 100;
}

function trimText(value: string, max: number) {
    if (value.length <= max) return value;
    return `${value.slice(0, Math.max(1, max - 1)).trim()}…`;
}

function escapeXml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}

function getRoomTypeLabel(roomType: RoomType) {
    switch (roomType) {
        case "kitchen":
            return "Кухня";
        case "bedroom":
            return "Спальня";
        case "kids_room":
            return "Детская";
        case "office":
            return "Кабинет";
        case "living_room":
            return "Гостиная";
        default:
            return "Комната";
    }
}

function darkenHex(hex: string, amount: number) {
    const normalized = hex.replace("#", "");

    const full =
        normalized.length === 3
            ? normalized
                .split("")
                .map((char) => char + char)
                .join("")
            : normalized;

    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);

    const factor = 1 - amount;

    const rr = Math.max(0, Math.min(255, Math.round(r * factor)));
    const gg = Math.max(0, Math.min(255, Math.round(g * factor)));
    const bb = Math.max(0, Math.min(255, Math.round(b * factor)));

    return `#${rr.toString(16).padStart(2, "0")}${gg
        .toString(16)
        .padStart(2, "0")}${bb.toString(16).padStart(2, "0")}`;
}
