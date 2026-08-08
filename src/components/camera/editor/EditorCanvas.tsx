import { RefObject, MutableRefObject } from "react";
import Icon from "@/components/ui/icon";
import { Clip, Layer, LayerAnimation } from "./editorTypes";

const ANIM_CLASS: Record<string, string> = {
  fadein: "layer-anim-fadein",
  slideup: "layer-anim-slideup",
  pop: "layer-anim-pop",
  bounce: "layer-anim-bounce",
  pulse: "layer-anim-pulse",
};

interface Props {
  active: Clip | undefined;
  clips: Clip[];
  activeIdx: number;
  cssFilter: string;
  transform: string;
  layers: Layer[];
  activeLayerId: number | null;
  musicName: string;
  canvasRef: RefObject<HTMLDivElement>;
  videoRefs: MutableRefObject<Map<number, HTMLVideoElement>>;
  capturedThumbRef: MutableRefObject<string | null>;
  onLayerPointerDown: (e: React.PointerEvent, layer: Layer) => void;
  onLayerPointerMove: (e: React.PointerEvent) => void;
  onLayerPointerUp: () => void;
  onClickCanvas: () => void;
  updateLayer: (id: number, patch: Partial<Layer>) => void;
  removeLayer: (id: number) => void;
}

const EditorCanvas = ({
  active,
  clips,
  activeIdx,
  cssFilter,
  transform,
  layers,
  activeLayerId,
  musicName,
  canvasRef,
  videoRefs,
  capturedThumbRef,
  onLayerPointerDown,
  onLayerPointerMove,
  onLayerPointerUp,
  onClickCanvas,
  updateLayer,
  removeLayer,
}: Props) => {
  return (
    <>
      {/* Canvas */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-2 bg-black">
        <div
          ref={canvasRef}
          className="relative bg-black overflow-hidden rounded-xl"
          style={{ aspectRatio: "9/16", height: "100%", maxHeight: "100%", maxWidth: "100%" }}
          onPointerMove={onLayerPointerMove}
          onPointerUp={onLayerPointerUp}
          onClick={onClickCanvas}
        >
          {active && (active.type === "image" ? (
            <img
              src={active.url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: cssFilter, transform }}
              draggable={false}
            />
          ) : (
            <video
              ref={(el) => { if (el) videoRefs.current.set(active.id, el); }}
              src={active.url}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: cssFilter, transform }}
              autoPlay
              muted
              loop
              playsInline
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (capturedThumbRef.current || v.currentTime < 0.2 || v.videoWidth === 0) return;
                try {
                  const canvas = document.createElement("canvas");
                  canvas.width = Math.min(v.videoWidth, 720);
                  canvas.height = Math.round(canvas.width * v.videoHeight / v.videoWidth);
                  const ctx = canvas.getContext("2d");
                  if (!ctx) return;
                  ctx.filter = cssFilter;
                  ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                  canvas.toBlob((blob) => {
                    if (!blob || blob.size < 3000) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const r = reader.result as string;
                      capturedThumbRef.current = r.slice(r.indexOf(",") + 1);
                    };
                    reader.readAsDataURL(blob);
                  }, "image/jpeg", 0.85);
                } catch { /* noop */ }
              }}
            />
          ))}

          {/* Layers */}
          {layers.map((l) => {
            const animClass = (l.type === "text" || l.type === "sticker") && l.animation && l.animation !== "none"
              ? ANIM_CLASS[l.animation as Exclude<LayerAnimation, "none">]
              : "";
            return (
            <div
              key={l.id}
              onPointerDown={(e) => onLayerPointerDown(e, l)}
              className={`absolute select-none cursor-move ${activeLayerId === l.id ? "ring-2 ring-white/60" : ""} ${animClass}`}
              style={{
                left: `${l.x}%`,
                top: `${l.y}%`,
                transform: `translate(-50%, -50%) rotate(${l.rotation}deg)`,
                touchAction: "none",
              }}
            >
              {l.type === "text" ? (
                <span
                  style={{
                    color: l.color,
                    fontSize: l.size,
                    fontFamily: l.font,
                    background: l.bg,
                    padding: l.bg !== "transparent" ? "4px 10px" : 0,
                    borderRadius: 6,
                    fontWeight: 700,
                    display: "inline-block",
                    whiteSpace: "nowrap",
                  }}
                >{l.text}</span>
              ) : l.type === "sticker" ? (
                <span style={{ fontSize: l.size }}>{l.emoji}</span>
              ) : (
                <div
                  className="overflow-hidden border-2 border-white/85 bg-black"
                  style={{
                    width: `${l.size}%`,
                    aspectRatio: "1/1",
                    borderRadius: l.shape === "circle" ? "9999px" : 12,
                  }}
                >
                  {l.mediaType === "image" ? (
                    <img src={l.url} className="w-full h-full object-cover" alt="" draggable={false} />
                  ) : (
                    <video src={l.url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                  )}
                </div>
              )}
            </div>
          );})}

          {/* Clip indicator */}
          {clips.length > 1 && (
            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
              {activeIdx + 1} / {clips.length}
            </div>
          )}
          {musicName && (
            <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
              <Icon name="Music" size={12} />
              <span className="truncate">{musicName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Active layer toolbar */}
      {activeLayerId !== null && (() => {
        const l = layers.find((x) => x.id === activeLayerId);
        if (!l) return null;
        const sizeStep = l.type === "pip" ? 5 : 4;
        const minSize = l.type === "pip" ? 15 : 12;
        return (
          <div className="px-3 py-2 bg-zinc-900 border-t border-white/10 flex flex-col gap-2">
            <div className="flex items-center gap-2 overflow-x-auto">
              {l.type === "text" && (
                <input
                  value={l.text}
                  onChange={(e) => updateLayer(l.id, { text: e.target.value })}
                  className="bg-white/10 text-white text-sm rounded px-2 py-1 outline-none min-w-32"
                  placeholder="Текст..."
                />
              )}
              {l.type === "pip" && (
                <button
                  onClick={() => updateLayer(l.id, { shape: l.shape === "circle" ? "rect" : "circle" })}
                  className="px-2.5 py-1.5 rounded bg-white/10 text-white text-xs flex items-center gap-1 flex-shrink-0"
                >
                  <Icon name={l.shape === "circle" ? "Circle" : "Square"} size={14} />
                  {l.shape === "circle" ? "Круг" : "Прямоуг."}
                </button>
              )}
              <button onClick={() => updateLayer(l.id, { size: Math.max(minSize, l.size - sizeStep) })} className="p-1.5 bg-white/10 rounded text-white flex-shrink-0"><Icon name="Minus" size={14} /></button>
              <button onClick={() => updateLayer(l.id, { size: l.size + sizeStep })} className="p-1.5 bg-white/10 rounded text-white flex-shrink-0"><Icon name="Plus" size={14} /></button>
              <button onClick={() => updateLayer(l.id, { rotation: (l.rotation - 15) % 360 })} className="p-1.5 bg-white/10 rounded text-white flex-shrink-0"><Icon name="RotateCcw" size={14} /></button>
              <button onClick={() => updateLayer(l.id, { rotation: (l.rotation + 15) % 360 })} className="p-1.5 bg-white/10 rounded text-white flex-shrink-0"><Icon name="RotateCw" size={14} /></button>
              <button onClick={() => removeLayer(l.id)} className="p-1.5 bg-red-500/30 rounded text-red-300 flex-shrink-0"><Icon name="Trash2" size={14} /></button>
            </div>
            {(l.type === "text" || l.type === "sticker") && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-white/40 text-[10px] flex-shrink-0 mr-0.5">Анимация:</span>
                {(["none", "fadein", "slideup", "pop", "bounce", "pulse"] as LayerAnimation[]).map((a) => (
                  <button
                    key={a}
                    onClick={() => updateLayer(l.id, { animation: a })}
                    className={`px-2.5 py-1 rounded-full text-[11px] flex-shrink-0 ${(l.animation || "none") === a ? "bg-[#fe2c55] text-white" : "bg-white/10 text-white/70"}`}
                  >
                    {{ none: "Без", fadein: "Плавно", slideup: "Снизу", pop: "Появл.", bounce: "Прыжок", pulse: "Пульс" }[a]}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </>
  );
};

export default EditorCanvas;