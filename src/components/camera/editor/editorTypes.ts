export type Filter = "none" | "vivid" | "mono" | "warm" | "cold" | "vintage" | "noir" | "dream";

export const FILTERS: { id: Filter; label: string; css: string }[] = [
  { id: "none", label: "Без", css: "none" },
  { id: "vivid", label: "Ярко", css: "saturate(1.5) contrast(1.1)" },
  { id: "mono", label: "Ч/Б", css: "grayscale(1) contrast(1.1)" },
  { id: "warm", label: "Тёпло", css: "sepia(0.3) saturate(1.3) hue-rotate(-10deg)" },
  { id: "cold", label: "Холод", css: "saturate(1.1) hue-rotate(180deg) brightness(0.95)" },
  { id: "vintage", label: "Винтаж", css: "sepia(0.6) contrast(0.9) saturate(0.8)" },
  { id: "noir", label: "Нуар", css: "grayscale(1) contrast(1.4) brightness(0.85)" },
  { id: "dream", label: "Мечта", css: "blur(0.4px) saturate(1.2) brightness(1.05)" },
];

export interface TextLayer {
  id: number;
  type: "text";
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  font: string;
  bg: string;
  rotation: number;
}

export interface StickerLayer {
  id: number;
  type: "sticker";
  emoji: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
}

export type Layer = TextLayer | StickerLayer;

export interface Clip {
  id: number;
  file: File;
  url: string;
  type: "image" | "video";
  duration: number;
}

export interface EditorState {
  clips: Clip[];
  activeClipId: number | null;
  filter: Filter;
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  flipH: boolean;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  layers: Layer[];
  musicFile: File | null;
  musicName: string;
}

export const FONTS = [
  { id: "sans", label: "Sans", css: "system-ui, -apple-system, sans-serif" },
  { id: "serif", label: "Serif", css: "Georgia, serif" },
  { id: "mono", label: "Mono", css: "ui-monospace, monospace" },
  { id: "rounded", label: "Round", css: "'Comic Sans MS', cursive" },
];

export const TEXT_COLORS = ["#ffffff", "#000000", "#fe2c55", "#61d4f0", "#f9ce34", "#34d399", "#a78bfa", "#fb923c"];

export const BG_COLORS = ["transparent", "rgba(0,0,0,0.5)", "rgba(255,255,255,0.5)", "#fe2c55", "#000000", "#ffffff"];

export const STICKERS = ["❤️", "🔥", "✨", "🎉", "😍", "🥰", "😂", "🤩", "👀", "👍", "💯", "⭐", "🌈", "🎵", "🎶", "🌸", "🍕", "🍔", "🍩", "🍓", "🌹", "🌟", "💫", "⚡", "🎁", "🏆", "💎", "🍀", "🦋", "🐶", "🐱", "🦄"];

export const TEMPLATES: { id: string; name: string; preset: Partial<EditorState> }[] = [
  {
    id: "blank",
    name: "Чистый",
    preset: {},
  },
  {
    id: "story",
    name: "История",
    preset: {
      filter: "vivid",
      layers: [
        { id: 1, type: "text", text: "ИСТОРИЯ", x: 50, y: 10, size: 36, color: "#ffffff", font: "system-ui, sans-serif", bg: "rgba(0,0,0,0.5)", rotation: 0 },
      ],
    },
  },
  {
    id: "quote",
    name: "Цитата",
    preset: {
      filter: "mono",
      layers: [
        { id: 1, type: "text", text: "« Цитата »", x: 50, y: 45, size: 32, color: "#ffffff", font: "Georgia, serif", bg: "rgba(0,0,0,0.6)", rotation: 0 },
      ],
    },
  },
  {
    id: "announce",
    name: "Анонс",
    preset: {
      filter: "warm",
      layers: [
        { id: 1, type: "text", text: "СКОРО!", x: 50, y: 20, size: 44, color: "#f9ce34", font: "system-ui, sans-serif", bg: "rgba(0,0,0,0.5)", rotation: -5 },
        { id: 2, type: "sticker", emoji: "🔥", x: 80, y: 25, size: 60, rotation: 15 },
      ],
    },
  },
  {
    id: "vibe",
    name: "Вайб",
    preset: {
      filter: "dream",
      layers: [
        { id: 1, type: "sticker", emoji: "✨", x: 20, y: 20, size: 50, rotation: 0 },
        { id: 2, type: "sticker", emoji: "🌸", x: 80, y: 70, size: 50, rotation: 20 },
        { id: 3, type: "text", text: "vibe ✨", x: 50, y: 50, size: 30, color: "#ffffff", font: "Georgia, serif", bg: "transparent", rotation: 0 },
      ],
    },
  },
  {
    id: "humor",
    name: "Мем",
    preset: {
      filter: "none",
      layers: [
        { id: 1, type: "text", text: "ТОП", x: 50, y: 10, size: 40, color: "#ffffff", font: "system-ui, sans-serif", bg: "transparent", rotation: 0 },
        { id: 2, type: "text", text: "НИЗ", x: 50, y: 85, size: 40, color: "#ffffff", font: "system-ui, sans-serif", bg: "transparent", rotation: 0 },
      ],
    },
  },
];
