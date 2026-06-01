import { RefObject } from "react";
import Icon from "@/components/ui/icon";
import { FILTERS, FONTS, TEXT_COLORS, BG_COLORS, STICKERS, TEMPLATES, Filter, Layer, Clip } from "./editorTypes";

type Tab = "templates" | "clips" | "crop" | "filter" | "adjust" | "text" | "stickers" | "music";

interface Props {
  tab: Tab;
  setTab: (t: Tab) => void;
  active: Clip | undefined;
  clips: Clip[];
  activeIdx: number;
  setActiveIdx: (i: number) => void;
  filter: Filter;
  setFilter: (f: Filter) => void;
  brightness: number;
  setBrightness: (v: number) => void;
  contrast: number;
  setContrast: (v: number) => void;
  saturation: number;
  setSaturation: (v: number) => void;
  rotation: number;
  setRotation: (v: number | ((r: number) => number)) => void;
  flipH: boolean;
  setFlipH: (v: boolean | ((prev: boolean) => boolean)) => void;
  layers: Layer[];
  activeLayerId: number | null;
  musicName: string;
  musicFile: File | null;
  showFileSheet: boolean;
  setShowFileSheet: (v: boolean) => void;
  galleryInputRef: RefObject<HTMLInputElement>;
  cameraInputRef: RefObject<HTMLInputElement>;
  musicInputRef: RefObject<HTMLInputElement>;
  addText: () => void;
  addSticker: (emoji: string) => void;
  updateLayer: (id: number, patch: Partial<Layer>) => void;
  removeClip: (id: number) => void;
  moveClip: (id: number, dir: -1 | 1) => void;
  applyTemplate: (id: string) => void;
  setMusicFile: (f: File | null) => void;
  setMusicName: (n: string) => void;
  audioRef: RefObject<HTMLAudioElement>;
}

const EditorToolbar = ({
  tab,
  setTab,
  active,
  clips,
  activeIdx,
  setActiveIdx,
  filter,
  setFilter,
  brightness,
  setBrightness,
  contrast,
  setContrast,
  saturation,
  setSaturation,
  rotation,
  setRotation,
  flipH,
  setFlipH,
  layers,
  activeLayerId,
  musicName,
  musicFile,
  showFileSheet,
  setShowFileSheet,
  galleryInputRef,
  cameraInputRef,
  musicInputRef,
  addText,
  addSticker,
  updateLayer,
  removeClip,
  moveClip,
  applyTemplate,
  setMusicFile,
  setMusicName,
  audioRef,
}: Props) => {
  return (
    <div className="bg-zinc-900 border-t border-white/10">
      <div className="px-3 py-3 min-h-[120px] max-h-[180px] overflow-y-auto">
        {tab === "templates" && (
          <div className="flex gap-2 overflow-x-auto">
            {TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => applyTemplate(t.id)} className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="w-14 h-20 rounded-lg bg-gradient-to-br from-[#fe2c55]/40 to-[#8b5cf6]/40 border border-white/10 flex items-center justify-center text-white text-xs">{t.name}</div>
              </button>
            ))}
          </div>
        )}
        {tab === "clips" && (
          <div>
            <button onClick={() => setShowFileSheet(true)} className="mb-2 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs flex items-center gap-1">
              <Icon name="Plus" size={12} /> Добавить
            </button>
            <div className="flex gap-2 overflow-x-auto">
              {clips.map((c, i) => (
                <div key={c.id} className={`relative flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden border-2 ${i === activeIdx ? "border-[#fe2c55]" : "border-white/10"}`}>
                  <button onClick={() => setActiveIdx(i)} className="w-full h-full">
                    {c.type === "image"
                      ? <img src={c.url} className="w-full h-full object-cover" alt="" />
                      : <video src={c.url} className="w-full h-full object-cover" muted />}
                  </button>
                  <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-1">
                    <button onClick={() => moveClip(c.id, -1)} className="text-white text-xs bg-black/60 rounded px-1">‹</button>
                    <button onClick={() => moveClip(c.id, 1)} className="text-white text-xs bg-black/60 rounded px-1">›</button>
                  </div>
                  <button onClick={() => removeClip(c.id)} className="absolute bottom-0 right-0 bg-red-500/80 rounded-tl p-0.5">
                    <Icon name="X" size={10} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "crop" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button onClick={() => setRotation((r) => r - 90)} className="flex-1 py-2 rounded-lg bg-white/10 text-white text-sm flex items-center justify-center gap-1"><Icon name="RotateCcw" size={14} /> −90°</button>
              <button onClick={() => setRotation((r) => r + 90)} className="flex-1 py-2 rounded-lg bg-white/10 text-white text-sm flex items-center justify-center gap-1"><Icon name="RotateCw" size={14} /> +90°</button>
              <button onClick={() => setFlipH((v) => !v)} className={`flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-1 ${flipH ? "bg-[#fe2c55] text-white" : "bg-white/10 text-white"}`}><Icon name="FlipHorizontal" size={14} /> Зеркало</button>
            </div>
            <div>
              <label className="text-white/60 text-xs">Поворот: {rotation}°</label>
              <input type="range" min={-180} max={180} value={rotation} onChange={(e) => setRotation(Number(e.target.value))} className="w-full" />
            </div>
          </div>
        )}
        {tab === "filter" && (
          <div className="flex gap-2 overflow-x-auto">
            {FILTERS.map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)} className={`flex-shrink-0 flex flex-col items-center gap-1 ${filter === f.id ? "opacity-100" : "opacity-70"}`}>
                <div className="w-14 h-20 rounded-lg overflow-hidden bg-black border-2" style={{ borderColor: filter === f.id ? "#fe2c55" : "transparent" }}>
                  {active && (active.type === "image"
                    ? <img src={active.url} className="w-full h-full object-cover" style={{ filter: f.css }} alt="" />
                    : <video src={active.url} className="w-full h-full object-cover" style={{ filter: f.css }} muted />)}
                </div>
                <span className="text-white text-[10px]">{f.label}</span>
              </button>
            ))}
          </div>
        )}
        {tab === "adjust" && (
          <div className="space-y-2">
            <div>
              <label className="text-white/60 text-xs flex justify-between"><span>Яркость</span><span>{brightness}%</span></label>
              <input type="range" min={50} max={200} value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="text-white/60 text-xs flex justify-between"><span>Контраст</span><span>{contrast}%</span></label>
              <input type="range" min={50} max={200} value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="text-white/60 text-xs flex justify-between"><span>Насыщенность</span><span>{saturation}%</span></label>
              <input type="range" min={0} max={200} value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} className="w-full" />
            </div>
            <button onClick={() => { setBrightness(100); setContrast(100); setSaturation(100); }} className="text-white/60 text-xs underline">Сбросить</button>
          </div>
        )}
        {tab === "text" && (
          <div className="space-y-2">
            <button onClick={addText} className="px-3 py-1.5 rounded-lg bg-[#fe2c55] text-white text-sm flex items-center gap-1"><Icon name="Plus" size={12} /> Новый текст</button>
            {activeLayerId !== null && (() => {
              const l = layers.find((x) => x.id === activeLayerId);
              if (!l || l.type !== "text") return null;
              return (
                <div className="space-y-2">
                  <div className="flex gap-1 overflow-x-auto">
                    {FONTS.map((f) => (
                      <button key={f.id} onClick={() => updateLayer(l.id, { font: f.css })} className={`px-2 py-1 rounded text-xs flex-shrink-0 ${l.font === f.css ? "bg-white text-black" : "bg-white/10 text-white"}`} style={{ fontFamily: f.css }}>{f.label}</button>
                    ))}
                  </div>
                  <div className="flex gap-1 overflow-x-auto">
                    {TEXT_COLORS.map((c) => (
                      <button key={c} onClick={() => updateLayer(l.id, { color: c })} className="w-6 h-6 rounded-full border-2 flex-shrink-0" style={{ background: c, borderColor: l.color === c ? "#fe2c55" : "rgba(255,255,255,0.3)" }} />
                    ))}
                  </div>
                  <div className="flex gap-1 overflow-x-auto">
                    <span className="text-white/60 text-xs self-center">Фон:</span>
                    {BG_COLORS.map((c) => (
                      <button key={c} onClick={() => updateLayer(l.id, { bg: c })} className="w-6 h-6 rounded border-2 flex-shrink-0 flex items-center justify-center" style={{ background: c === "transparent" ? "transparent" : c, borderColor: l.bg === c ? "#fe2c55" : "rgba(255,255,255,0.3)" }}>
                        {c === "transparent" && <Icon name="Slash" size={12} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        {tab === "stickers" && (
          <div className="grid grid-cols-8 gap-2">
            {STICKERS.map((s) => (
              <button key={s} onClick={() => addSticker(s)} className="text-3xl hover:bg-white/10 rounded p-1">{s}</button>
            ))}
          </div>
        )}
        {tab === "music" && (
          <div className="space-y-2">
            <button onClick={() => musicInputRef.current?.click()} className="px-3 py-1.5 rounded-lg bg-[#fe2c55] text-white text-sm flex items-center gap-1">
              <Icon name="Upload" size={12} /> Загрузить трек
            </button>
            {musicName && (
              <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                <Icon name="Music" size={14} className="text-[#fe2c55]" />
                <span className="text-white text-sm flex-1 truncate">{musicName}</span>
                <button onClick={() => { setMusicFile(null); setMusicName(""); if (audioRef.current) audioRef.current.pause(); }} className="text-red-400">
                  <Icon name="X" size={14} />
                </button>
              </div>
            )}
            {!musicFile && <p className="text-white/40 text-xs">Поддерживаются mp3, m4a, wav. Музыка проигрывается в редакторе для предпросмотра.</p>}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-t border-white/10 overflow-x-auto">
        {([
          { id: "templates", icon: "LayoutTemplate", label: "Шабл." },
          { id: "clips", icon: "Film", label: "Клипы" },
          { id: "crop", icon: "Crop", label: "Кадр" },
          { id: "filter", icon: "Sparkles", label: "Фильтр" },
          { id: "adjust", icon: "SlidersHorizontal", label: "Цвет" },
          { id: "text", icon: "Type", label: "Текст" },
          { id: "stickers", icon: "Smile", label: "Стикеры" },
          { id: "music", icon: "Music", label: "Музыка" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 py-2.5 ${tab === t.id ? "text-[#fe2c55]" : "text-white/60"}`}
          >
            <Icon name={t.icon} size={18} />
            <span className="text-[10px] font-semibold">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Bottom sheet выбора файлов */}
      {showFileSheet && (
        <div className="fixed inset-0 z-[300] flex items-end" onClick={() => setShowFileSheet(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full rounded-t-3xl overflow-hidden pb-8"
            style={{ background: "#1a1a1a" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <p className="text-white/40 text-xs text-center mb-3">Выбрать медиафайл</p>
            <div className="flex flex-col gap-1 px-4">
              <button
                onClick={() => {
                  setShowFileSheet(false);
                  setTimeout(() => { if (galleryInputRef.current) { galleryInputRef.current.value = ""; galleryInputRef.current.click(); } }, 80);
                }}
                className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl active:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="Image" size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-medium text-sm">Файлы из галереи</p>
                  <p className="text-white/40 text-xs">Выбрать из сохранённых</p>
                </div>
              </button>
              <button
                onClick={() => {
                  setShowFileSheet(false);
                  setTimeout(() => { if (cameraInputRef.current) { cameraInputRef.current.value = ""; cameraInputRef.current.click(); } }, 80);
                }}
                className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl active:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="Camera" size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-medium text-sm">Камера</p>
                  <p className="text-white/40 text-xs">Снять фото или видео</p>
                </div>
              </button>
            </div>
            <div className="px-4 mt-2">
              <button
                onClick={() => setShowFileSheet(false)}
                className="w-full py-3.5 rounded-2xl bg-white/8 text-white/60 text-sm font-medium active:bg-white/12 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorToolbar;
