import { RefObject, useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { FILTERS, FONTS, TEXT_COLORS, BG_COLORS, STICKERS, TEMPLATES, EXPORT_FORMATS, EXPORT_QUALITIES, TRANSITIONS, WATERMARK_POSITIONS, SFX_LIBRARY, Filter, Layer, Clip, ExportFormat, ExportQuality, TransitionType, WatermarkPosition, SubtitleCue, SfxItem, SfxCue } from "./editorTypes";

type Tab = "templates" | "clips" | "trim" | "crop" | "filter" | "adjust" | "text" | "stickers" | "music" | "pip" | "watermark" | "subtitles" | "sfx";

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
  updateClip: (id: number, patch: Partial<Clip>) => void;
  musicVolume: number;
  setMusicVolume: (v: number) => void;
  clipVolume: number;
  setClipVolume: (v: number) => void;
  speed: number;
  setSpeed: (v: number) => void;
  exportFormat: ExportFormat;
  setExportFormat: (f: ExportFormat) => void;
  exportQuality: ExportQuality;
  setExportQuality: (q: ExportQuality) => void;
  pipInputRef: RefObject<HTMLInputElement>;
  watermarkInputRef: RefObject<HTMLInputElement>;
  watermarkUrl: string;
  watermarkPosition: WatermarkPosition;
  setWatermarkPosition: (p: WatermarkPosition) => void;
  watermarkOpacity: number;
  setWatermarkOpacity: (v: number) => void;
  watermarkSize: number;
  setWatermarkSize: (v: number) => void;
  removeWatermark: () => void;
  subtitles: SubtitleCue[];
  activeSubtitleId: number | null;
  setActiveSubtitleId: (id: number | null) => void;
  addSubtitle: () => void;
  updateSubtitle: (id: number, patch: Partial<SubtitleCue>) => void;
  removeSubtitle: (id: number) => void;
  sfxCues: SfxCue[];
  addSfx: (item: SfxItem) => void;
  updateSfx: (id: number, patch: Partial<SfxCue>) => void;
  removeSfx: (id: number) => void;
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
  updateClip,
  musicVolume,
  setMusicVolume,
  clipVolume,
  setClipVolume,
  speed,
  setSpeed,
  exportFormat,
  setExportFormat,
  exportQuality,
  setExportQuality,
  pipInputRef,
  watermarkInputRef,
  watermarkUrl,
  watermarkPosition,
  setWatermarkPosition,
  watermarkOpacity,
  setWatermarkOpacity,
  watermarkSize,
  setWatermarkSize,
  removeWatermark,
  subtitles,
  activeSubtitleId,
  setActiveSubtitleId,
  addSubtitle,
  updateSubtitle,
  removeSubtitle,
  sfxCues,
  addSfx,
  updateSfx,
  removeSfx,
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
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {clips.map((c, i) => (
                <div key={c.id} className="flex items-center gap-1 flex-shrink-0">
                  {i > 0 && <TransitionPicker clip={c} updateClip={updateClip} />}
                  <div className={`relative w-16 h-24 rounded-lg overflow-hidden border-2 ${i === activeIdx ? "border-[#fe2c55]" : "border-white/10"}`}>
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
                </div>
              ))}
            </div>
            {clips.length > 1 && <p className="text-white/40 text-[10px] mt-2">Нажми на значок между клипами, чтобы выбрать переход.</p>}
          </div>
        )}
        {tab === "trim" && (
          <div className="space-y-3">
            {active?.type === "video" ? (
              <TrimControls key={active.id} active={active} updateClip={updateClip} />
            ) : (
              <p className="text-white/40 text-xs">Обрезка доступна для видео-клипов.</p>
            )}
            <div>
              <label className="text-white/60 text-xs flex justify-between"><span>Скорость</span><span>{speed}x</span></label>
              <div className="flex gap-1.5 mt-1">
                {[0.5, 1, 1.5, 2].map((s) => (
                  <button key={s} onClick={() => setSpeed(s)} className={`flex-1 py-1.5 rounded-lg text-xs ${speed === s ? "bg-[#fe2c55] text-white" : "bg-white/10 text-white/70"}`}>{s}x</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-white/60 text-xs block mb-1">Формат экспорта</label>
              <div className="flex gap-1.5">
                {EXPORT_FORMATS.map((f) => (
                  <button key={f.id} onClick={() => setExportFormat(f.id)} className={`flex-1 py-1.5 rounded-lg text-[11px] flex flex-col items-center ${exportFormat === f.id ? "bg-[#fe2c55] text-white" : "bg-white/10 text-white/70"}`}>
                    <span className="font-semibold">{f.id}</span>
                    <span className="opacity-80 text-[9px]">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-white/60 text-xs block mb-1">Качество экспорта</label>
              <div className="flex gap-1.5">
                {EXPORT_QUALITIES.map((q) => (
                  <button key={q.id} onClick={() => setExportQuality(q.id)} className={`flex-1 py-1.5 rounded-lg text-[11px] flex flex-col items-center ${exportQuality === q.id ? "bg-[#fe2c55] text-white" : "bg-white/10 text-white/70"}`}>
                    <span className="font-semibold">{q.label}</span>
                    <span className="opacity-80 text-[9px]">{q.hint}</span>
                  </button>
                ))}
              </div>
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
            {!musicFile && <p className="text-white/40 text-xs">Поддерживаются mp3, m4a, wav. Музыка наложится на финальное видео.</p>}
            {musicFile && (
              <div>
                <label className="text-white/60 text-xs flex justify-between"><span>Громкость музыки</span><span>{musicVolume}%</span></label>
                <input type="range" min={0} max={200} value={musicVolume} onChange={(e) => setMusicVolume(Number(e.target.value))} className="w-full" />
              </div>
            )}
            <div>
              <label className="text-white/60 text-xs flex justify-between"><span>Громкость видео</span><span>{clipVolume}%</span></label>
              <input type="range" min={0} max={200} value={clipVolume} onChange={(e) => setClipVolume(Number(e.target.value))} className="w-full" />
            </div>
          </div>
        )}
        {tab === "pip" && (
          <div className="space-y-2">
            <button onClick={() => pipInputRef.current?.click()} className="px-3 py-1.5 rounded-lg bg-[#fe2c55] text-white text-sm flex items-center gap-1">
              <Icon name="PictureInPicture2" size={14} /> Добавить видео/фото
            </button>
            <p className="text-white/40 text-xs">Наложи второй ролик или фото поверх основного — как окошко «картинка-в-картинке». Перемести и измени размер прямо на холсте.</p>
          </div>
        )}
        {tab === "watermark" && (
          <div className="space-y-2">
            {!watermarkUrl ? (
              <>
                <button onClick={() => watermarkInputRef.current?.click()} className="px-3 py-1.5 rounded-lg bg-[#fe2c55] text-white text-sm flex items-center gap-1">
                  <Icon name="Stamp" size={14} /> Загрузить логотип
                </button>
                <p className="text-white/40 text-xs">Добавь картинку своего лого — она будет наложена на весь ролик.</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                  <img src={watermarkUrl} className="w-8 h-8 object-contain rounded bg-white/10" alt="" />
                  <span className="text-white text-sm flex-1">Логотип добавлен</span>
                  <button onClick={removeWatermark} className="text-red-400"><Icon name="X" size={14} /></button>
                </div>
                <div>
                  <label className="text-white/60 text-xs block mb-1">Позиция</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {WATERMARK_POSITIONS.map((p) => (
                      <button key={p.id} onClick={() => setWatermarkPosition(p.id)} className={`px-2 py-1 rounded text-[11px] ${watermarkPosition === p.id ? "bg-[#fe2c55] text-white" : "bg-white/10 text-white/70"}`}>{p.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-white/60 text-xs flex justify-between"><span>Прозрачность</span><span>{watermarkOpacity}%</span></label>
                  <input type="range" min={10} max={100} value={watermarkOpacity} onChange={(e) => setWatermarkOpacity(Number(e.target.value))} className="w-full" />
                </div>
                <div>
                  <label className="text-white/60 text-xs flex justify-between"><span>Размер</span><span>{watermarkSize}%</span></label>
                  <input type="range" min={8} max={50} value={watermarkSize} onChange={(e) => setWatermarkSize(Number(e.target.value))} className="w-full" />
                </div>
              </>
            )}
          </div>
        )}
        {tab === "subtitles" && (
          <div className="space-y-2">
            <button onClick={addSubtitle} className="px-3 py-1.5 rounded-lg bg-[#fe2c55] text-white text-sm flex items-center gap-1">
              <Icon name="Captions" size={14} /> Добавить субтитр
            </button>
            {subtitles.length === 0 && <p className="text-white/40 text-xs">Субтитры показываются внизу экрана в заданный промежуток времени.</p>}
            <div className="space-y-2">
              {subtitles.map((c) => (
                <div key={c.id} className={`rounded-lg p-2 ${activeSubtitleId === c.id ? "bg-white/10" : "bg-white/5"}`} onClick={() => setActiveSubtitleId(c.id)}>
                  <div className="flex items-center gap-2">
                    <input
                      value={c.text}
                      onChange={(e) => updateSubtitle(c.id, { text: e.target.value })}
                      className="bg-white/10 text-white text-sm rounded px-2 py-1 outline-none flex-1 min-w-0"
                      placeholder="Текст субтитра..."
                    />
                    <button onClick={(e) => { e.stopPropagation(); removeSubtitle(c.id); }} className="text-red-400 flex-shrink-0"><Icon name="Trash2" size={14} /></button>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <label className="text-white/40 text-[10px] flex-shrink-0">С {fmtTime(c.start)}</label>
                    <input type="range" min={0} max={60} step={0.5} value={c.start} onChange={(e) => updateSubtitle(c.id, { start: Math.min(Number(e.target.value), c.end - 0.5) })} className="flex-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-white/40 text-[10px] flex-shrink-0">До {fmtTime(c.end)}</label>
                    <input type="range" min={0} max={60} step={0.5} value={c.end} onChange={(e) => updateSubtitle(c.id, { end: Math.max(Number(e.target.value), c.start + 0.5) })} className="flex-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "sfx" && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {SFX_LIBRARY.map((item) => (
                <button key={item.id} onClick={() => addSfx(item)} className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/5 hover:bg-white/10">
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-white/70 text-[10px]">{item.label}</span>
                </button>
              ))}
            </div>
            {sfxCues.length > 0 && (
              <div className="space-y-2 mt-2">
                <p className="text-white/40 text-[10px]">Добавленные звуки:</p>
                {sfxCues.map((cue) => (
                  <div key={cue.id} className="bg-white/5 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm flex-1">{cue.label}</span>
                      <button onClick={() => removeSfx(cue.id)} className="text-red-400"><Icon name="Trash2" size={14} /></button>
                    </div>
                    <label className="text-white/40 text-[10px] flex justify-between"><span>Время: {fmtTime(cue.time)}</span></label>
                    <input type="range" min={0} max={60} step={0.5} value={cue.time} onChange={(e) => updateSfx(cue.id, { time: Number(e.target.value) })} className="w-full" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-t border-white/10 overflow-x-auto">
        {([
          { id: "templates", icon: "LayoutTemplate", label: "Шабл." },
          { id: "clips", icon: "Film", label: "Клипы" },
          { id: "trim", icon: "Scissors", label: "Обрезка" },
          { id: "crop", icon: "Crop", label: "Кадр" },
          { id: "filter", icon: "Sparkles", label: "Фильтр" },
          { id: "adjust", icon: "SlidersHorizontal", label: "Цвет" },
          { id: "text", icon: "Type", label: "Текст" },
          { id: "stickers", icon: "Smile", label: "Стикеры" },
          { id: "pip", icon: "PictureInPicture2", label: "PiP" },
          { id: "music", icon: "Music", label: "Музыка" },
          { id: "sfx", icon: "Volume2", label: "Звуки" },
          { id: "subtitles", icon: "Captions", label: "Субтитры" },
          { id: "watermark", icon: "Stamp", label: "Лого" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-[64px] flex flex-col items-center gap-0.5 py-2.5 ${tab === t.id ? "text-[#fe2c55]" : "text-white/60"}`}
          >
            <Icon name={t.icon} size={18} />
            <span className="text-[10px] font-semibold whitespace-nowrap">{t.label}</span>
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

const fmtTime = (s: number) => {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

/** Значок между двумя клипами: клик открывает выбор перехода (фейд/слайд/наплыв/шторка) перед этим клипом. */
const TransitionPicker = ({ clip, updateClip }: { clip: Clip; updateClip: (id: number, patch: Partial<Clip>) => void }) => {
  const [open, setOpen] = useState(false);
  const current = TRANSITIONS.find((t) => t.id === (clip.transition || "none")) || TRANSITIONS[0];
  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${current.id !== "none" ? "bg-[#fe2c55] text-white" : "bg-white/10 text-white/60"}`}
        title={current.label}
      >
        <Icon name={current.icon} size={13} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[250]" onClick={() => setOpen(false)} />
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[260] bg-zinc-800 rounded-xl p-1.5 shadow-xl flex flex-col gap-1 w-32">
            {TRANSITIONS.map((t) => (
              <button
                key={t.id}
                onClick={() => { updateClip(clip.id, { transition: t.id as TransitionType }); setOpen(false); }}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] text-left ${current.id === t.id ? "bg-[#fe2c55] text-white" : "text-white/70 hover:bg-white/10"}`}
              >
                <Icon name={t.icon} size={12} />
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const TrimControls = ({ active, updateClip }: { active: Clip; updateClip: (id: number, patch: Partial<Clip>) => void }) => {
  const [dur, setDur] = useState(0);

  useEffect(() => {
    const v = document.createElement("video");
    v.src = active.url;
    v.preload = "metadata";
    const onMeta = () => {
      const d = isFinite(v.duration) ? v.duration : 0;
      setDur(d);
      if (active.trimEnd == null && d > 0) updateClip(active.id, { trimStart: 0, trimEnd: d });
    };
    v.addEventListener("loadedmetadata", onMeta);
    return () => v.removeEventListener("loadedmetadata", onMeta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.id]);

  const start = active.trimStart ?? 0;
  const end = active.trimEnd ?? dur;

  if (dur <= 0) return <p className="text-white/40 text-xs">Загрузка длительности…</p>;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-white/60 text-xs">
        <span>Начало: {fmtTime(start)}</span>
        <span>Конец: {fmtTime(end)}</span>
      </div>
      <div>
        <label className="text-white/40 text-[10px]">Старт</label>
        <input type="range" min={0} max={dur} step={0.1} value={start}
          onChange={(e) => { const v = Math.min(Number(e.target.value), end - 0.5); updateClip(active.id, { trimStart: Math.max(0, v) }); }}
          className="w-full accent-[#fe2c55]" />
      </div>
      <div>
        <label className="text-white/40 text-[10px]">Финал</label>
        <input type="range" min={0} max={dur} step={0.1} value={end}
          onChange={(e) => { const v = Math.max(Number(e.target.value), start + 0.5); updateClip(active.id, { trimEnd: Math.min(dur, v) }); }}
          className="w-full accent-[#fe2c55]" />
      </div>
      <p className="text-white/40 text-[11px]">Длительность: {fmtTime(end - start)} из {fmtTime(dur)}</p>
    </div>
  );
};

export default EditorToolbar;