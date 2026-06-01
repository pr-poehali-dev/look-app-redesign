import { useState, useRef, useEffect, useMemo } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { useUserMedia } from "@/context/UserMediaContext";
import { compressVideo, uploadFileDirect } from "@/lib/videoCompress";
import { FILTERS, FONTS, TEXT_COLORS, BG_COLORS, STICKERS, TEMPLATES, type Filter, type Layer, type TextLayer, type StickerLayer, type Clip } from "./editorTypes";

const VIDEO_CATEGORIES = [
  { id: "music", label: "Музыка" },
  { id: "dance", label: "Танцы" },
  { id: "sport", label: "Спорт" },
  { id: "humor", label: "Юмор" },
  { id: "travel", label: "Путешествия" },
  { id: "food", label: "Еда" },
  { id: "style", label: "Стиль" },
  { id: "gaming", label: "Игры" },
];

type Tab = "templates" | "clips" | "crop" | "filter" | "adjust" | "text" | "stickers" | "music";

interface Props {
  onClose: () => void;
  onPublished: () => void;
}

const MediaEditor = ({ onClose, onPublished }: Props) => {
  const { user } = useAuth();
  const { refreshMedia } = useUserMedia();
  const [clips, setClips] = useState<Clip[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [filter, setFilter] = useState<Filter>("none");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<number | null>(null);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicName, setMusicName] = useState("");
  const [tab, setTab] = useState<Tab>("templates");
  const [destination, setDestination] = useState<"home" | "feed" | "both">("both");
  const [category, setCategory] = useState("humor");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState<{ stage: "compress" | "upload" | "save"; percent: number } | null>(null);
  const [step, setStep] = useState<"edit" | "publish">("edit");
  const [showFileSheet, setShowFileSheet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  const active = clips[activeIdx];

  const cssFilter = useMemo(() => {
    const base = FILTERS.find((f) => f.id === filter)?.css || "none";
    const adj = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    return base === "none" ? adj : `${base} ${adj}`;
  }, [filter, brightness, contrast, saturation]);

  const transform = useMemo(() => {
    return `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1})`;
  }, [rotation, flipH]);

  const addClips = (files: FileList | null) => {
    if (!files) return;
    const arr: Clip[] = Array.from(files).map((f, i) => ({
      id: Date.now() + i,
      file: f,
      url: URL.createObjectURL(f),
      type: f.type.startsWith("video") ? "video" : "image",
      duration: f.type.startsWith("video") ? 0 : 3,
    }));
    setClips((prev) => [...prev, ...arr]);
    if (clips.length === 0) setActiveIdx(0);
  };

  const removeClip = (id: number) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
    setActiveIdx(0);
  };

  const moveClip = (id: number, dir: -1 | 1) => {
    setClips((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx === -1) return prev;
      const ni = idx + dir;
      if (ni < 0 || ni >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
      return arr;
    });
  };

  const addText = () => {
    const id = Date.now();
    const newLayer: TextLayer = {
      id,
      type: "text",
      text: "Текст",
      x: 50,
      y: 50,
      size: 32,
      color: "#ffffff",
      font: FONTS[0].css,
      bg: "transparent",
      rotation: 0,
    };
    setLayers((s) => [...s, newLayer]);
    setActiveLayerId(id);
  };

  const addSticker = (emoji: string) => {
    const id = Date.now();
    const newLayer: StickerLayer = {
      id,
      type: "sticker",
      emoji,
      x: 50,
      y: 50,
      size: 60,
      rotation: 0,
    };
    setLayers((s) => [...s, newLayer]);
    setActiveLayerId(id);
  };

  const updateLayer = (id: number, patch: Partial<Layer>) => {
    setLayers((s) => s.map((l) => (l.id === id ? { ...l, ...patch } as Layer : l)));
  };

  const removeLayer = (id: number) => {
    setLayers((s) => s.filter((l) => l.id !== id));
    if (activeLayerId === id) setActiveLayerId(null);
  };

  const applyTemplate = (templateId: string) => {
    const t = TEMPLATES.find((x) => x.id === templateId);
    if (!t) return;
    if (t.preset.filter !== undefined) setFilter(t.preset.filter);
    if (t.preset.layers) setLayers(t.preset.layers.map((l) => ({ ...l, id: Date.now() + Math.random() } as Layer)));
  };

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setMusicFile(f);
    setMusicName(f.name.replace(/\.[^.]+$/, ""));
    if (audioRef.current) {
      audioRef.current.src = URL.createObjectURL(f);
      audioRef.current.loop = true;
      audioRef.current.play().catch(() => {});
    }
  };

  useEffect(() => {
    return () => {
      clips.forEach((c) => URL.revokeObjectURL(c.url));
      if (audioRef.current) audioRef.current.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dragging layers
  const dragRef = useRef<{ id: number; startX: number; startY: number; layerX: number; layerY: number } | null>(null);
  const onLayerPointerDown = (e: React.PointerEvent, layer: Layer) => {
    e.stopPropagation();
    setActiveLayerId(layer.id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { id: layer.id, startX: e.clientX, startY: e.clientY, layerX: layer.x, layerY: layer.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onLayerPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragRef.current.startY) / rect.height) * 100;
    updateLayer(dragRef.current.id, {
      x: Math.max(0, Math.min(100, dragRef.current.layerX + dx)),
      y: Math.max(0, Math.min(100, dragRef.current.layerY + dy)),
    });
  };
  const onLayerPointerUp = () => {
    dragRef.current = null;
  };

  // Render captured composition to a single image (for photos & posters)
  const captureFrame = async (): Promise<Blob | null> => {
    if (!active) return null;
    const canvas = document.createElement("canvas");
    const size = 1080;
    canvas.width = size;
    canvas.height = Math.round(size * 1.5);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Draw media
    const drawMedia = async (): Promise<HTMLImageElement | HTMLVideoElement | null> => {
      if (active.type === "image") {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = active.url;
        });
        return img;
      } else {
        const v = videoRefs.current.get(active.id);
        if (!v) return null;
        // Убеждаемся что видео загружено и кадр доступен
        if (v.readyState < 2) {
          await new Promise<void>((resolve) => {
            const onReady = () => { v.removeEventListener("loadeddata", onReady); resolve(); };
            v.addEventListener("loadeddata", onReady);
            setTimeout(resolve, 3000); // таймаут 3с на случай зависания
          });
        }
        // Seek к 0.1с чтобы гарантировано получить реальный кадр
        if (v.videoWidth > 0) {
          v.currentTime = 0.1;
          await new Promise<void>((resolve) => {
            const onSeeked = () => { v.removeEventListener("seeked", onSeeked); resolve(); };
            v.addEventListener("seeked", onSeeked);
            setTimeout(resolve, 1000);
          });
        }
        return v;
      }
    };

    const media = await drawMedia();
    ctx.save();
    ctx.filter = cssFilter;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    if (flipH) ctx.scale(-1, 1);
    if (media) {
      const mw = (media as HTMLImageElement).naturalWidth || (media as HTMLVideoElement).videoWidth || canvas.width;
      const mh = (media as HTMLImageElement).naturalHeight || (media as HTMLVideoElement).videoHeight || canvas.height;
      const scale = Math.max(canvas.width / mw, canvas.height / mh);
      const w = mw * scale;
      const h = mh * scale;
      ctx.drawImage(media, -w / 2, -h / 2, w, h);
    } else {
      ctx.fillStyle = "#000";
      ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    }
    ctx.restore();
    ctx.filter = "none";

    // Draw layers
    for (const l of layers) {
      ctx.save();
      const cx = (l.x / 100) * canvas.width;
      const cy = (l.y / 100) * canvas.height;
      ctx.translate(cx, cy);
      ctx.rotate((l.rotation * Math.PI) / 180);
      if (l.type === "text") {
        const fontSize = (l.size / 100) * canvas.height * 0.08;
        ctx.font = `bold ${fontSize}px ${l.font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const metrics = ctx.measureText(l.text);
        const pad = fontSize * 0.3;
        if (l.bg && l.bg !== "transparent") {
          ctx.fillStyle = l.bg;
          ctx.fillRect(-metrics.width / 2 - pad, -fontSize / 2 - pad / 2, metrics.width + pad * 2, fontSize + pad);
        }
        ctx.fillStyle = l.color;
        ctx.fillText(l.text, 0, 0);
      } else {
        const fontSize = (l.size / 100) * canvas.height * 0.1;
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(l.emoji, 0, 0);
      }
      ctx.restore();
    }

    return new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92);
    });
  };

  const handlePublish = async () => {
    if (clips.length === 0 || !active) return;
    setPublishing(true);
    try {
      const blob = await captureFrame();
      const isVideo = active.type === "video";
      let file: File = isVideo
        ? active.file
        : (blob ? new File([blob], "edited.jpg", { type: "image/jpeg" }) : active.file);

      // Для видео — конвертируем кадр в base64 для thumbnail
      let thumbData: string | undefined;
      if (isVideo && blob) {
        try {
          thumbData = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const r = reader.result as string;
              const idx = r.indexOf(",");
              resolve(idx >= 0 ? r.slice(idx + 1) : r);
            };
            reader.readAsDataURL(blob);
          });
        } catch { /* ignore */ }
      }

      // 1) Сжатие видео > 4 МБ
      if (isVideo && file.size > 4 * 1024 * 1024) {
        setPublishProgress({ stage: "compress", percent: 0 });
        try {
          const result = await compressVideo(file, {
            maxWidth: 720,
            maxHeight: 1280,
            videoBitsPerSecond: 1_200_000,
            onProgress: (p) => setPublishProgress({ stage: "compress", percent: p }),
          });
          file = result.file;
        } catch (err) {
          console.warn("[MediaEditor] compress failed, uploading original", err);
        }
      }

      const finalCategory =
        destination === "feed" ? "feed"
        : destination === "home" ? category
        : category;

      // 2) Прямая загрузка в S3
      setPublishProgress({ stage: "upload", percent: 0 });
      const reg = await uploadFileDirect(
        file,
        {
          category: finalCategory,
          destinations: destination === "both" ? ["home", "feed"] : [destination],
          description,
          hashtags,
          author: user?.name || "Пользователь",
          handle: user?.handle || user?.name || "user",
          user_id: user?.id || "anonymous",
          thumbData,
        },
        (p) => setPublishProgress({ stage: "upload", percent: p }),
      );
      if (!reg || !reg.url) throw new Error("Сервер не вернул ссылку на файл");

      setPublishProgress({ stage: "save", percent: 100 });
      try { await refreshMedia(); } catch { /* ignore */ }
      onPublished();
    } catch (e) {
      console.error("[MediaEditor] publish error", e);
      alert("Не удалось опубликовать. Проверь интернет и попробуй ещё раз.");
    } finally {
      setPublishing(false);
      setPublishProgress(null);
    }
  };

  // EMPTY STATE
  if (clips.length === 0) {
    return (
      <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col">
        <div className="flex items-center justify-between px-4 pt-12 pb-3 border-b border-white/10">
          <button onClick={onClose} className="p-2"><Icon name="X" size={22} className="text-white" /></button>
          <p className="text-white font-bold">Конструктор</p>
          <div className="w-9" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center">
            <Icon name="Sparkles" size={36} className="text-white" />
          </div>
          <div className="text-center">
            <p className="text-white text-xl font-bold mb-1">Создай свой ролик</p>
            <p className="text-white/60 text-sm">Загрузи фото или видео и оформи их в нашем редакторе</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => addClips(e.target.files)}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => { addClips(e.target.files); e.target.value = ""; }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { addClips(e.target.files); e.target.value = ""; }}
          />
          <button
            onClick={() => setShowFileSheet(true)}
            className="px-6 py-3 rounded-2xl bg-[#fe2c55] text-white font-bold flex items-center gap-2"
          >
            <Icon name="Upload" size={18} /> Выбрать файлы
          </button>
          <div className="grid grid-cols-3 gap-3 w-full max-w-md">
            {TEMPLATES.slice(1, 4).map((t) => (
              <div key={t.id} className="aspect-[9/16] bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/40 text-xs">
                {t.name}
              </div>
            ))}
          </div>
          <p className="text-white/40 text-xs text-center">Можно выбрать несколько файлов — мы склеим их в один ролик.</p>
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
  }

  // PUBLISH STEP
  if (step === "publish") {
    return (
      <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-4 pt-12 pb-3 border-b border-white/10 sticky top-0 bg-zinc-950 z-10">
          <button onClick={() => setStep("edit")} className="p-2"><Icon name="ArrowLeft" size={22} className="text-white" /></button>
          <p className="text-white font-bold">Публикация</p>
          <div className="w-9" />
        </div>

        <div className="p-4 space-y-4">
          {/* Preview */}
          <div className="mx-auto w-40 aspect-[9/16] bg-black rounded-xl overflow-hidden flex items-center justify-center">
            {active && (active.type === "image"
              ? <img src={active.url} alt="" className="w-full h-full object-cover" style={{ filter: cssFilter, transform }} />
              : <video src={active.url} className="w-full h-full object-cover" style={{ filter: cssFilter, transform }} muted autoPlay loop />)}
          </div>

          {/* Destination */}
          <div>
            <p className="text-white/60 text-xs font-semibold uppercase mb-2">Куда публиковать</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: "both", icon: "Sparkles", label: "Везде" },
                { id: "home", icon: "Home", label: "Главная" },
                { id: "feed", icon: "LayoutList", label: "Лента" },
              ] as const).map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDestination(d.id)}
                  className={`py-3 rounded-xl flex flex-col items-center gap-1 ${destination === d.id ? "bg-[#fe2c55] text-white" : "bg-white/5 text-white/70"}`}
                >
                  <Icon name={d.icon} size={18} />
                  <span className="text-xs font-semibold">{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          {destination !== "feed" && (
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase mb-2">Категория для Главной</p>
              <div className="flex flex-wrap gap-2">
                {VIDEO_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold ${category === c.id ? "bg-white text-black" : "bg-white/10 text-white/70"}`}
                  >{c.label}</button>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <p className="text-white/60 text-xs font-semibold uppercase mb-2">Описание</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Расскажи о своём ролике..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none"
            />
          </div>

          {/* Hashtags */}
          <div>
            <p className="text-white/60 text-xs font-semibold uppercase mb-2">Хэштеги</p>
            <input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#вайб #москва"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none"
            />
          </div>

          {publishing && publishProgress ? (
            <div className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6]">
              <div className="flex items-center gap-2 text-white mb-2">
                <Icon name="Loader" size={18} className="animate-spin" />
                <span className="font-semibold text-sm">
                  {publishProgress.stage === "compress" && "Сжимаем видео..."}
                  {publishProgress.stage === "upload" && "Загружаем..."}
                  {publishProgress.stage === "save" && "Сохраняем..."}
                </span>
                <span className="ml-auto font-bold text-sm">{publishProgress.percent}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full bg-white transition-all" style={{ width: `${publishProgress.percent}%` }} />
              </div>
            </div>
          ) : (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white font-bold disabled:opacity-50"
            >
              {publishing ? "Публикуем..." : "Опубликовать"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // MAIN EDIT VIEW
  return (
    <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col">
      <audio ref={audioRef} />
      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => addClips(e.target.files)} />
      <input ref={galleryInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { addClips(e.target.files); e.target.value = ""; }} />
      <input ref={cameraInputRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => { addClips(e.target.files); e.target.value = ""; }} />
      <input ref={musicInputRef} type="file" accept="audio/*" className="hidden" onChange={handleMusicUpload} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3 border-b border-white/10">
        <button onClick={onClose} className="p-2"><Icon name="X" size={22} className="text-white" /></button>
        <p className="text-white font-bold">Конструктор</p>
        <button
          onClick={() => setStep("publish")}
          className="px-4 py-1.5 rounded-full bg-[#fe2c55] text-white text-sm font-bold"
        >Далее</button>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-2 bg-black">
        <div
          ref={canvasRef}
          className="relative bg-black overflow-hidden rounded-xl"
          style={{ aspectRatio: "9/16", height: "100%", maxHeight: "100%", maxWidth: "100%" }}
          onPointerMove={onLayerPointerMove}
          onPointerUp={onLayerPointerUp}
          onClick={() => setActiveLayerId(null)}
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
            />
          ))}

          {/* Layers */}
          {layers.map((l) => (
            <div
              key={l.id}
              onPointerDown={(e) => onLayerPointerDown(e, l)}
              className={`absolute select-none cursor-move ${activeLayerId === l.id ? "ring-2 ring-white/60" : ""}`}
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
              ) : (
                <span style={{ fontSize: l.size }}>{l.emoji}</span>
              )}
            </div>
          ))}

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
        return (
          <div className="px-3 py-2 bg-zinc-900 border-t border-white/10 flex items-center gap-2 overflow-x-auto">
            {l.type === "text" && (
              <input
                value={l.text}
                onChange={(e) => updateLayer(l.id, { text: e.target.value })}
                className="bg-white/10 text-white text-sm rounded px-2 py-1 outline-none min-w-32"
                placeholder="Текст..."
              />
            )}
            <button onClick={() => updateLayer(l.id, { size: Math.max(12, l.size - 4) })} className="p-1.5 bg-white/10 rounded text-white"><Icon name="Minus" size={14} /></button>
            <button onClick={() => updateLayer(l.id, { size: l.size + 4 })} className="p-1.5 bg-white/10 rounded text-white"><Icon name="Plus" size={14} /></button>
            <button onClick={() => updateLayer(l.id, { rotation: (l.rotation - 15) % 360 })} className="p-1.5 bg-white/10 rounded text-white"><Icon name="RotateCcw" size={14} /></button>
            <button onClick={() => updateLayer(l.id, { rotation: (l.rotation + 15) % 360 })} className="p-1.5 bg-white/10 rounded text-white"><Icon name="RotateCw" size={14} /></button>
            <button onClick={() => removeLayer(l.id)} className="p-1.5 bg-red-500/30 rounded text-red-300"><Icon name="Trash2" size={14} /></button>
          </div>
        );
      })()}

      {/* Tab content */}
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
                    <button onClick={() => removeClip(c.id)} className="absolute bottom-1 right-1 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center">
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

export default MediaEditor;