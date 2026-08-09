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

export type LayerAnimation = "none" | "fadein" | "slideup" | "pop" | "bounce" | "pulse";

export const LAYER_ANIMATIONS: { id: LayerAnimation; label: string }[] = [
  { id: "none", label: "Без" },
  { id: "fadein", label: "Плавно" },
  { id: "slideup", label: "Снизу" },
  { id: "pop", label: "Появление" },
  { id: "bounce", label: "Прыжок" },
  { id: "pulse", label: "Пульс" },
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
  animation?: LayerAnimation;
}

export interface StickerLayer {
  id: number;
  type: "sticker";
  emoji: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  animation?: LayerAnimation;
}

export type PipShape = "rect" | "circle";

export interface PipLayer {
  id: number;
  type: "pip";
  url: string;
  mediaType: "video" | "image";
  x: number;
  y: number;
  size: number; // % от ширины холста, квадратный бокс
  rotation: number;
  shape: PipShape;
}

export type Layer = TextLayer | StickerLayer | PipLayer;

export type TransitionType = "none" | "fade" | "slide" | "zoom" | "wipe";

export const TRANSITIONS: { id: TransitionType; label: string; icon: string }[] = [
  { id: "none", label: "Без перехода", icon: "Ban" },
  { id: "fade", label: "Растворение", icon: "Blend" },
  { id: "slide", label: "Слайд", icon: "ArrowLeftRight" },
  { id: "zoom", label: "Наплыв", icon: "ZoomIn" },
  { id: "wipe", label: "Шторка", icon: "PanelLeftClose" },
];

export interface Clip {
  id: number;
  file: File;
  url: string;
  type: "image" | "video";
  duration: number;
  trimStart?: number;
  trimEnd?: number;
  volume?: number;
  speed?: number;
  /** Переход, воспроизводимый ПЕРЕД этим клипом (игнорируется для самого первого клипа) */
  transition?: TransitionType;
}

export type ExportFormat = "9:16" | "1:1" | "16:9";

// Базовые (короткая сторона = 1080, соответствует Full HD-качеству по умолчанию)
export const EXPORT_FORMATS: { id: ExportFormat; label: string; hint: string; w: number; h: number }[] = [
  { id: "9:16", label: "TikTok / Shorts", hint: "Вертикальное", w: 1080, h: 1920 },
  { id: "1:1", label: "Квадрат", hint: "Лента / Stories", w: 1080, h: 1080 },
  { id: "16:9", label: "YouTube", hint: "Горизонтальное", w: 1920, h: 1080 },
];

export type ExportQuality = "720" | "1080" | "4k";

// Множитель к базовому размеру формата (короткая сторона: 720 / 1080 / 2160)
export const EXPORT_QUALITIES: { id: ExportQuality; label: string; hint: string; scale: number }[] = [
  { id: "720", label: "720p", hint: "Меньше вес", scale: 720 / 1080 },
  { id: "1080", label: "1080p", hint: "Full HD", scale: 1 },
  { id: "4k", label: "4K", hint: "Макс. качество", scale: 2160 / 1080 },
];

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

/** Субтитр с таймингом — показывается на видео в заданный промежуток времени */
export interface SubtitleCue {
  id: number;
  text: string;
  start: number; // сек от начала клипа
  end: number; // сек от начала клипа
  color: string;
  bg: string;
}

export const SUBTITLE_PRESET_DURATION = 3; // сек по умолчанию для нового субтитра

/** Позиция водяного знака на кадре */
export type WatermarkPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";

export const WATERMARK_POSITIONS: { id: WatermarkPosition; label: string }[] = [
  { id: "top-left", label: "Слева сверху" },
  { id: "top-right", label: "Справа сверху" },
  { id: "bottom-left", label: "Слева снизу" },
  { id: "bottom-right", label: "Справа снизу" },
  { id: "center", label: "По центру" },
];

export interface WatermarkState {
  file: File | null;
  url: string;
  position: WatermarkPosition;
  opacity: number; // 0-100
  size: number; // % от ширины кадра
}

/** Готовая библиотека коротких звуковых эффектов (лежат в /public/sfx) */
export interface SfxItem {
  id: string;
  label: string;
  emoji: string;
  url: string;
}

export const SFX_LIBRARY: SfxItem[] = [
  { id: "pop", label: "Поп", emoji: "🎈", url: "/sfx/pop.mp3" },
  { id: "ding", label: "Дзынь", emoji: "🔔", url: "/sfx/ding.mp3" },
  { id: "whoosh", label: "Вжух", emoji: "💨", url: "/sfx/whoosh.mp3" },
  { id: "click", label: "Клик", emoji: "👆", url: "/sfx/click.mp3" },
  { id: "drum", label: "Бум", emoji: "🥁", url: "/sfx/drum.mp3" },
  { id: "tada", label: "Та-да", emoji: "🎉", url: "/sfx/tada.mp3" },
];

/** Звуковой эффект, размещённый на временной шкале клипа */
export interface SfxCue {
  id: number;
  sfxId: string;
  url: string;
  label: string;
  time: number; // сек от начала клипа, когда проигрывать
  volume: number; // 0-200 (%)
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