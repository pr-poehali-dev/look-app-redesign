import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

interface PhotoEditorProps {
  src: string;
  onCancel: () => void;
  onApply: (file: File, previewUrl: string) => void;
}

type Tab = "adjust" | "filters" | "crop" | "text" | "draw" | "sticker";

interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  exposure: number;
  warmth: number;
  blur: number;
  sharpen: number;
  vignette: number;
}

const DEFAULT_ADJ: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  exposure: 100,
  warmth: 0,
  blur: 0,
  sharpen: 0,
  vignette: 0,
};

const FILTERS: { id: string; label: string; css: (a: Adjustments) => string }[] = [
  { id: "none", label: "Оригинал", css: () => "" },
  { id: "clarendon", label: "Clarendon", css: () => "contrast(1.2) saturate(1.35) brightness(1.05)" },
  { id: "gingham", label: "Gingham", css: () => "sepia(0.15) contrast(0.95) brightness(1.05)" },
  { id: "moon", label: "Moon", css: () => "grayscale(1) contrast(1.1) brightness(1.1)" },
  { id: "lark", label: "Lark", css: () => "saturate(1.2) brightness(1.08) contrast(0.95)" },
  { id: "reyes", label: "Reyes", css: () => "sepia(0.22) contrast(0.85) brightness(1.1) saturate(0.75)" },
  { id: "juno", label: "Juno", css: () => "saturate(1.4) hue-rotate(-10deg) contrast(1.05)" },
  { id: "warm", label: "Тёплый", css: () => "sepia(0.4) saturate(1.4) brightness(1.05)" },
  { id: "cold", label: "Холодный", css: () => "hue-rotate(30deg) saturate(1.2) brightness(1.05)" },
  { id: "bw", label: "Ч/Б", css: () => "grayscale(1) contrast(1.1)" },
  { id: "vivid", label: "Сочный", css: () => "saturate(2) contrast(1.1)" },
  { id: "fade", label: "Выцветший", css: () => "saturate(0.7) contrast(0.85) brightness(1.1) sepia(0.1)" },
  { id: "noir", label: "Нуар", css: () => "grayscale(1) contrast(1.4) brightness(0.9)" },
  { id: "vintage", label: "Винтаж", css: () => "sepia(0.5) contrast(1.1) saturate(1.3) hue-rotate(-15deg)" },
];

const STICKERS = ["😀", "😍", "🔥", "❤️", "✨", "👍", "🎉", "💯", "😎", "🌈", "⭐", "💖", "👑", "🦄", "🍿", "🎵", "📸", "💎", "🌸", "⚡", "🎈", "🥳", "😂", "🤩"];
const FONTS = ["Inter, sans-serif", "Georgia, serif", "Impact, sans-serif", "Courier New, monospace", "Comic Sans MS, cursive"];
const TEXT_COLORS = ["#ffffff", "#000000", "#fe2c55", "#8b5cf6", "#34d399", "#f59e0b", "#0095f6", "#ec4899"];
const ASPECTS: { id: string; label: string; ratio: number | null }[] = [
  { id: "free", label: "Свободно", ratio: null },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "3:4", label: "3:4", ratio: 3 / 4 },
];

interface Overlay {
  id: number;
  kind: "text" | "sticker";
  value: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  color?: string;
  font?: string;
  bg?: boolean;
}

interface Stroke {
  color: string;
  size: number;
  points: { x: number; y: number }[];
}

const PhotoEditor = ({ src, onCancel, onApply }: PhotoEditorProps) => {
  const [tab, setTab] = useState<Tab>("adjust");
  const [adj, setAdj] = useState<Adjustments>(DEFAULT_ADJ);
  const [filter, setFilter] = useState("none");
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [aspect, setAspect] = useState("free");
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [activeOverlay, setActiveOverlay] = useState<number | null>(null);
  const [brushColor, setBrushColor] = useState("#fe2c55");
  const [brushSize, setBrushSize] = useState(8);
  const [textColor, setTextColor] = useState("#ffffff");
  const [textFont, setTextFont] = useState(FONTS[0]);
  const [textBg, setTextBg] = useState(false);
  const [editingText, setEditingText] = useState<{ id: number; value: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const dragRef = useRef<{ id: number; startX: number; startY: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgRef.current = img; setImgLoaded(true); };
    img.src = src;
  }, [src]);

  const filterCss = useCallback(() => {
    const preset = FILTERS.find(f => f.id === filter)?.css(adj) || "";
    const parts = [
      `brightness(${adj.brightness}%)`,
      `contrast(${adj.contrast}%)`,
      `saturate(${adj.saturation}%)`,
      `brightness(${adj.exposure}%)`,
      adj.warmth > 0 ? `sepia(${adj.warmth / 100})` : "",
      adj.warmth < 0 ? `hue-rotate(${adj.warmth * 0.6}deg) saturate(${100 + Math.abs(adj.warmth) * 0.5}%)` : "",
      adj.blur > 0 ? `blur(${adj.blur / 20}px)` : "",
      preset,
    ].filter(Boolean);
    return parts.join(" ");
  }, [adj, filter]);

  // ---- drawing ----
  const stageToCanvas = (clientX: number, clientY: number) => {
    const c = drawCanvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const rect = c.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * c.width,
      y: ((clientY - rect.top) / rect.height) * c.height,
    };
  };

  const redrawStrokes = useCallback(() => {
    const c = drawCanvasRef.current;
    if (!c) return;
    try {
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const s of strokes) {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.size;
        ctx.beginPath();
        s.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();
      }
    } catch { /* ignore */ }
  }, [strokes]);

  useEffect(() => { redrawStrokes(); }, [strokes, redrawStrokes, imgLoaded]);

  useEffect(() => {
    const c = drawCanvasRef.current;
    const img = imgRef.current;
    if (c && img && imgLoaded) {
      // Ограничиваем размер холста, чтобы огромные фото не вызывали падение из-за нехватки памяти
      const MAX_DIM = 1600;
      const nw = img.naturalWidth || 1;
      const nh = img.naturalHeight || 1;
      const k = Math.min(1, MAX_DIM / Math.max(nw, nh));
      c.width = Math.max(1, Math.round(nw * k));
      c.height = Math.max(1, Math.round(nh * k));
      redrawStrokes();
    }
  }, [imgLoaded, redrawStrokes]);

  const onStageDown = (e: React.PointerEvent) => {
    if (tab !== "draw") return;
    const c = drawCanvasRef.current;
    if (!c) return;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
    drawingRef.current = true;
    const p = stageToCanvas(e.clientX, e.clientY);
    const scaledSize = brushSize * (c.width / (stageRef.current?.clientWidth || c.width));
    currentStrokeRef.current = { color: brushColor, size: scaledSize, points: [p] };
  };
  const onStageMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || !currentStrokeRef.current) return;
    const c = drawCanvasRef.current;
    if (!c) return;
    const p = stageToCanvas(e.clientX, e.clientY);
    const pts = currentStrokeRef.current.points;
    const last = pts[pts.length - 1];
    // Не добавляем слишком близкие точки — защита от взрывного роста массива
    if (last) {
      const dx = p.x - last.x;
      const dy = p.y - last.y;
      if (dx * dx + dy * dy < 4) return;
    }
    // Ограничиваем максимальное число точек в штрихе
    if (pts.length > 5000) return;
    pts.push(p);
    try {
      const ctx = c.getContext("2d");
      if (ctx && pts.length >= 2) {
        ctx.strokeStyle = currentStrokeRef.current.color;
        ctx.lineWidth = currentStrokeRef.current.size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.stroke();
      }
    } catch { /* рисование никогда не должно ронять приложение */ }
  };
  const onStageUp = () => {
    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
      setStrokes(s => [...s, currentStrokeRef.current!]);
    }
    currentStrokeRef.current = null;
    drawingRef.current = false;
  };

  // ---- overlays drag ----
  const onOverlayPointerDown = (e: React.PointerEvent, o: Overlay) => {
    if (tab === "draw") return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveOverlay(o.id);
    dragRef.current = { id: o.id, startX: e.clientX, startY: e.clientY, ox: o.x, oy: o.y };
  };
  const onOverlayPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    const stage = stageRef.current;
    if (!d || !stage) return;
    const rect = stage.getBoundingClientRect();
    const dx = ((e.clientX - d.startX) / rect.width) * 100;
    const dy = ((e.clientY - d.startY) / rect.height) * 100;
    setOverlays(list => list.map(o => o.id === d.id ? { ...o, x: Math.max(0, Math.min(100, d.ox + dx)), y: Math.max(0, Math.min(100, d.oy + dy)) } : o));
  };
  const onOverlayPointerUp = () => { dragRef.current = null; };

  const addText = () => {
    const id = Date.now();
    setOverlays(list => [...list, { id, kind: "text", value: "Текст", x: 50, y: 50, scale: 1, rotation: 0, color: textColor, font: textFont, bg: textBg }]);
    setActiveOverlay(id);
    setEditingText({ id, value: "Текст" });
  };
  const addSticker = (emoji: string) => {
    const id = Date.now();
    setOverlays(list => [...list, { id, kind: "sticker", value: emoji, x: 50, y: 50, scale: 1, rotation: 0 }]);
    setActiveOverlay(id);
  };
  const updateActive = (patch: Partial<Overlay>) => {
    if (activeOverlay == null) return;
    setOverlays(list => list.map(o => o.id === activeOverlay ? { ...o, ...patch } : o));
  };
  const removeActive = () => {
    if (activeOverlay == null) return;
    setOverlays(list => list.filter(o => o.id !== activeOverlay));
    setActiveOverlay(null);
  };

  const resetAll = () => {
    setAdj(DEFAULT_ADJ); setFilter("none"); setRotation(0); setFlipH(false); setFlipV(false);
    setAspect("free"); setOverlays([]); setStrokes([]); setActiveOverlay(null);
  };

  // ---- render to file ----
  const handleApply = async () => {
    const img = imgRef.current;
    if (!img) return;
    setProcessing(true);
    await new Promise(r => setTimeout(r, 30));

    const rot = ((rotation % 360) + 360) % 360;
    const swap = rot === 90 || rot === 270;
    let cw = img.naturalWidth;
    let ch = img.naturalHeight;

    // crop by aspect
    const ratio = ASPECTS.find(a => a.id === aspect)?.ratio ?? null;
    let sx = 0, sy = 0, sWidth = img.naturalWidth, sHeight = img.naturalHeight;
    if (ratio) {
      const imgRatio = img.naturalWidth / img.naturalHeight;
      if (imgRatio > ratio) {
        sWidth = img.naturalHeight * ratio;
        sx = (img.naturalWidth - sWidth) / 2;
      } else {
        sHeight = img.naturalWidth / ratio;
        sy = (img.naturalHeight - sHeight) / 2;
      }
      cw = sWidth; ch = sHeight;
    }

    const outW = swap ? ch : cw;
    const outH = swap ? cw : ch;

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) { setProcessing(false); return; }

    ctx.save();
    ctx.filter = filterCss() || "none";
    ctx.translate(outW / 2, outH / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(img, sx, sy, sWidth, sHeight, -cw / 2, -ch / 2, cw, ch);
    ctx.restore();

    // vignette
    if (adj.vignette > 0) {
      const g = ctx.createRadialGradient(outW / 2, outH / 2, outW * 0.3, outW / 2, outH / 2, outW * 0.75);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, `rgba(0,0,0,${adj.vignette / 100})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, outW, outH);
    }

    // strokes — рисуем напрямую из данных штрихов (надёжнее, чем копировать с экранного холста)
    const dc = drawCanvasRef.current;
    if (dc && strokes.length) {
      // координаты штрихов хранятся в системе холста рисования (dc.width x dc.height),
      // переводим их в координаты оригинального изображения
      const kx = img.naturalWidth / dc.width;
      const ky = img.naturalHeight / dc.height;
      ctx.save();
      ctx.filter = "none";
      ctx.translate(outW / 2, outH / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      // переходим в систему координат исходного изображения с учётом кропа
      ctx.translate(-cw / 2, -ch / 2);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const s of strokes) {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.size * kx;
        ctx.beginPath();
        s.points.forEach((p, i) => {
          const x = p.x * kx - sx;
          const y = p.y * ky - sy;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
      ctx.restore();
    }

    // overlays (text/stickers) — positioned by % of stage, draw on final output (post-rotation visual)
    for (const o of overlays) {
      const px = (o.x / 100) * outW;
      const py = (o.y / 100) * outH;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate((o.rotation * Math.PI) / 180);
      if (o.kind === "sticker") {
        const fs = outW * 0.12 * o.scale;
        ctx.font = `${fs}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(o.value, 0, 0);
      } else {
        const fs = outW * 0.06 * o.scale;
        ctx.font = `bold ${fs}px ${o.font || "sans-serif"}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const tw = ctx.measureText(o.value).width;
        if (o.bg) {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(-tw / 2 - fs * 0.2, -fs * 0.65, tw + fs * 0.4, fs * 1.3);
        }
        ctx.fillStyle = o.color || "#fff";
        ctx.fillText(o.value, 0, 0);
      }
      ctx.restore();
    }

    canvas.toBlob((blob) => {
      if (!blob) { setProcessing(false); return; }
      const file = new File([blob], `edited-${Date.now()}.jpg`, { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      setProcessing(false);
      onApply(file, url);
    }, "image/jpeg", 0.92);
  };

  const activeObj = overlays.find(o => o.id === activeOverlay) || null;

  const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: "adjust", icon: "SlidersHorizontal", label: "Свет" },
    { id: "filters", icon: "Sparkles", label: "Фильтры" },
    { id: "crop", icon: "Crop", label: "Кроп" },
    { id: "text", icon: "Type", label: "Текст" },
    { id: "sticker", icon: "Smile", label: "Стикеры" },
    { id: "draw", icon: "Pencil", label: "Кисть" },
  ];

  const aspectRatioStyle = (() => {
    const r = ASPECTS.find(a => a.id === aspect)?.ratio;
    return r ? { aspectRatio: String(r) } : {};
  })();

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button onClick={onCancel} className="text-white/80 text-sm font-medium px-3 py-1.5">Отмена</button>
        <span className="text-white font-semibold text-sm">Редактор фото</span>
        <button onClick={handleApply} disabled={processing} className="text-white font-bold text-sm px-4 py-1.5 rounded-full bg-[#fe2c55] disabled:opacity-60">
          {processing ? "..." : "Готово"}
        </button>
      </div>

      {/* Stage */}
      <div className="flex-1 flex items-center justify-center overflow-hidden px-3 min-h-0">
        <div
          ref={stageRef}
          className="relative max-w-full max-h-full"
          style={{ ...aspectRatioStyle }}
          onPointerMove={(e) => { onStageMove(e); onOverlayPointerMove(e); }}
          onPointerUp={() => { onStageUp(); onOverlayPointerUp(); }}
          onPointerDown={onStageDown}
          onClick={() => { if (tab !== "draw") setActiveOverlay(null); }}
        >
          <div
            className="relative overflow-hidden"
            style={{
              transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
              transition: "transform 0.2s ease",
              ...aspectRatioStyle,
            }}
          >
            {imgLoaded && (
              <img
                src={src}
                alt="edit"
                className="block max-w-[90vw] max-h-[55vh] object-contain pointer-events-none"
                style={{ filter: filterCss(), objectFit: aspect === "free" ? "contain" : "cover", width: aspect === "free" ? "auto" : "100%", height: aspect === "free" ? "auto" : "100%" }}
              />
            )}
            {adj.vignette > 0 && (
              <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${adj.vignette / 100}) 100%)` }} />
            )}
            <canvas ref={drawCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ touchAction: "none" }} />
          </div>

          {/* overlays */}
          {overlays.map(o => (
            <div
              key={o.id}
              onPointerDown={(e) => onOverlayPointerDown(e, o)}
              onDoubleClick={() => o.kind === "text" && setEditingText({ id: o.id, value: o.value })}
              className={`absolute select-none cursor-move ${activeOverlay === o.id ? "ring-2 ring-[#fe2c55] ring-offset-1 ring-offset-transparent" : ""}`}
              style={{
                left: `${o.x}%`, top: `${o.y}%`,
                transform: `translate(-50%,-50%) rotate(${o.rotation}deg) scale(${o.scale})`,
                touchAction: "none",
              }}
            >
              {o.kind === "sticker" ? (
                <span style={{ fontSize: "11vw", lineHeight: 1 }}>{o.value}</span>
              ) : (
                <span style={{ color: o.color, fontFamily: o.font, fontWeight: 700, fontSize: "6vw", whiteSpace: "nowrap", padding: o.bg ? "2px 8px" : 0, background: o.bg ? "rgba(0,0,0,0.5)" : "transparent", borderRadius: 6 }}>{o.value}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Active overlay controls */}
      {activeObj && tab !== "draw" && (
        <div className="flex items-center justify-center gap-3 px-4 py-2 flex-shrink-0">
          <button onClick={() => updateActive({ scale: Math.max(0.3, activeObj.scale - 0.15) })} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"><Icon name="Minus" size={16} className="text-white" /></button>
          <button onClick={() => updateActive({ scale: activeObj.scale + 0.15 })} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"><Icon name="Plus" size={16} className="text-white" /></button>
          <button onClick={() => updateActive({ rotation: activeObj.rotation + 15 })} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"><Icon name="RotateCw" size={16} className="text-white" /></button>
          {activeObj.kind === "text" && (
            <button onClick={() => setEditingText({ id: activeObj.id, value: activeObj.value })} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"><Icon name="Pencil" size={16} className="text-white" /></button>
          )}
          <button onClick={removeActive} className="w-9 h-9 rounded-full bg-[#fe2c55]/80 flex items-center justify-center"><Icon name="Trash2" size={16} className="text-white" /></button>
        </div>
      )}

      {/* Tool panel */}
      <div className="flex-shrink-0 bg-zinc-950 border-t border-white/10 px-3 pt-3 pb-[max(10px,env(safe-area-inset-bottom))]">
        <div className="min-h-[88px] mb-2">
          {tab === "adjust" && (
            <div className="space-y-2 max-h-[26vh] overflow-y-auto pr-1">
              {([
                ["brightness", "Яркость", 0, 200],
                ["contrast", "Контраст", 0, 200],
                ["saturation", "Насыщенность", 0, 200],
                ["exposure", "Экспозиция", 50, 150],
                ["warmth", "Тепло", -100, 100],
                ["blur", "Размытие", 0, 100],
                ["vignette", "Виньетка", 0, 100],
              ] as [keyof Adjustments, string, number, number][]).map(([key, label, min, max]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-white/60 text-xs w-24 flex-shrink-0">{label}</span>
                  <input type="range" min={min} max={max} value={adj[key]} onChange={(e) => setAdj(a => ({ ...a, [key]: Number(e.target.value) }))} className="flex-1 accent-[#fe2c55]" />
                  <span className="text-white/40 text-[10px] w-8 text-right">{adj[key]}</span>
                </div>
              ))}
            </div>
          )}

          {tab === "filters" && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)} className={`flex-shrink-0 flex flex-col items-center gap-1 ${filter === f.id ? "opacity-100" : "opacity-70"}`}>
                  <div className={`w-14 h-14 rounded-lg overflow-hidden border-2 ${filter === f.id ? "border-[#fe2c55]" : "border-transparent"}`}>
                    {imgLoaded && <img src={src} alt="" className="w-full h-full object-cover" style={{ filter: f.css(DEFAULT_ADJ) }} />}
                  </div>
                  <span className="text-white/70 text-[10px]">{f.label}</span>
                </button>
              ))}
            </div>
          )}

          {tab === "crop" && (
            <div className="space-y-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {ASPECTS.map(a => (
                  <button key={a.id} onClick={() => setAspect(a.id)} className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium ${aspect === a.id ? "bg-[#fe2c55] text-white" : "bg-white/10 text-white/70"}`}>{a.label}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setRotation(r => r - 90)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-white/10 text-white text-xs"><Icon name="RotateCcw" size={15} />Влево</button>
                <button onClick={() => setRotation(r => r + 90)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-white/10 text-white text-xs"><Icon name="RotateCw" size={15} />Вправо</button>
                <button onClick={() => setFlipH(v => !v)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs ${flipH ? "bg-[#fe2c55] text-white" : "bg-white/10 text-white"}`}><Icon name="FlipHorizontal" size={15} />Гориз.</button>
                <button onClick={() => setFlipV(v => !v)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs ${flipV ? "bg-[#fe2c55] text-white" : "bg-white/10 text-white"}`}><Icon name="FlipVertical" size={15} />Верт.</button>
              </div>
            </div>
          )}

          {tab === "text" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={addText} className="px-3 py-2 rounded-lg bg-[#fe2c55] text-white text-xs font-semibold flex items-center gap-1"><Icon name="Plus" size={14} />Добавить текст</button>
                <button onClick={() => setTextBg(v => !v)} className={`px-3 py-2 rounded-lg text-xs ${textBg ? "bg-white/25 text-white" : "bg-white/10 text-white/70"}`}>Фон</button>
              </div>
              <div className="flex gap-1.5 overflow-x-auto">
                {TEXT_COLORS.map(c => (
                  <button key={c} onClick={() => { setTextColor(c); updateActive({ color: c }); }} className={`w-7 h-7 rounded-full flex-shrink-0 border-2 ${textColor === c ? "border-[#fe2c55]" : "border-white/20"}`} style={{ background: c }} />
                ))}
              </div>
              <div className="flex gap-1.5 overflow-x-auto">
                {FONTS.map(f => (
                  <button key={f} onClick={() => { setTextFont(f); updateActive({ font: f }); }} className={`px-3 py-1.5 rounded-lg text-xs flex-shrink-0 ${textFont === f ? "bg-white/25 text-white" : "bg-white/10 text-white/70"}`} style={{ fontFamily: f }}>Aa</button>
                ))}
              </div>
            </div>
          )}

          {tab === "sticker" && (
            <div className="grid grid-cols-8 gap-1.5 max-h-[24vh] overflow-y-auto">
              {STICKERS.map(s => (
                <button key={s} onClick={() => addSticker(s)} className="text-2xl aspect-square flex items-center justify-center rounded-lg bg-white/5 active:bg-white/15">{s}</button>
              ))}
            </div>
          )}

          {tab === "draw" && (
            <div className="space-y-2">
              <div className="flex gap-1.5 overflow-x-auto items-center">
                {TEXT_COLORS.map(c => (
                  <button key={c} onClick={() => setBrushColor(c)} className={`w-8 h-8 rounded-full flex-shrink-0 border-2 ${brushColor === c ? "border-[#fe2c55]" : "border-white/20"}`} style={{ background: c }} />
                ))}
                <button onClick={() => setStrokes(s => s.slice(0, -1))} className="ml-auto px-3 py-2 rounded-lg bg-white/10 text-white text-xs flex items-center gap-1 flex-shrink-0"><Icon name="Undo2" size={14} />Отмена</button>
                <button onClick={() => setStrokes([])} className="px-3 py-2 rounded-lg bg-white/10 text-white text-xs flex-shrink-0">Очистить</button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white/60 text-xs">Кисть</span>
                <input type="range" min={2} max={40} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="flex-1 accent-[#fe2c55]" />
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between gap-1">
          <button onClick={resetAll} className="flex flex-col items-center gap-0.5 px-2 py-1 text-white/50">
            <Icon name="RefreshCcw" size={18} />
            <span className="text-[9px]">Сброс</span>
          </button>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setActiveOverlay(null); }} className={`flex flex-col items-center gap-0.5 px-2 py-1 ${tab === t.id ? "text-[#fe2c55]" : "text-white/70"}`}>
              <Icon name={t.icon} size={18} />
              <span className="text-[9px]">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Text edit modal */}
      {editingText && (
        <div className="fixed inset-0 z-[310] bg-black/80 flex items-center justify-center px-6" onClick={() => { updateActive({ value: editingText.value || "Текст" }); setEditingText(null); }}>
          <div className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <input
              autoFocus
              value={editingText.value}
              onChange={(e) => setEditingText({ ...editingText, value: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") { updateActive({ value: editingText.value || "Текст" }); setEditingText(null); } }}
              className="w-full bg-transparent text-center text-white text-3xl font-bold outline-none border-b-2 border-[#fe2c55] pb-2"
              placeholder="Введите текст"
            />
            <button onClick={() => { updateActive({ value: editingText.value || "Текст" }); setEditingText(null); }} className="mt-6 w-full py-3 rounded-xl bg-[#fe2c55] text-white font-bold">Готово</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoEditor;