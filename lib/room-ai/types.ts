
export type RoomType =
  | "kitchen"
  | "bedroom"
  | "kids_room"
  | "office"
  | "living_room";

export type ColorPalette =
  | "light"
  | "warm"
  | "dark"
  | "pastel"
  | "scandinavian"
  | "custom";

export type RoomDimensions = {
  widthM?: number;
  lengthM?: number;
  heightM?: number;
};

export type RoomStyle = {
  palette?: ColorPalette;
  customColors?: string[];
};



export type RoomAnalysis = {
  estimatedDimensions: {
    widthM: number | null;
    lengthM: number | null;
    heightM: number | null;
    confidence: "low" | "medium" | "high";
  };
  detectedObjects: string[];
  removableObjects: string[];
  fixedElements: string[];
  constraints: string[];
  notes: string[];
  openings?: RoomOpening[];
};

export type WallSide = "top" | "right" | "bottom" | "left";
export type OpeningType = "door" | "window";

export type RoomOpening = {
  id: string;
  type: OpeningType;
  wall: WallSide;
  offsetM: number;
  widthM: number;
  label?: string;
  hinge?: "start" | "end";
  swing?: "in" | "out";
};

export type FurnitureType =
  | "bed"
  | "nightstand"
  | "desk"
  | "wardrobe"
  | "lamp"
  | "rug"
  | "sofa"
  | "table"
  | "chair"
  | "dresser"
  | "cabinet"
  | "shelf"
  | "tv"
  | "other";

export type FurnitureItem = {
  id: string;
  type: FurnitureType | string;
  label: string;
  xM: number;
  yM: number;
  widthM: number;
  depthM: number;
  rotationDeg: number;
  color?: string;
};



export type RoomVariant = {
  id: string;
  title: string;
  description: string;
  furniture: FurnitureItem[];
  photoImageUrl: string;
  planImageUrl?: string;
  palette: string[];
  pros?: string[];
  cons?: string[];
  openings?: RoomOpening[];
  layoutSource?: "ai" | "photo_refined" | "mock";
};
export type GenerateRoomDesignResult = {
  jobId: string;
  roomAnalysis: RoomAnalysis;
  variants: RoomVariant[];
};
