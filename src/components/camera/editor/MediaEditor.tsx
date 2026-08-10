import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { useUserMedia } from "@/context/UserMediaContext";
import { compressVideo, uploadFileDirect } from "@/lib/videoCompress";
import { renderVideoWithOverlays, type RenderClip, type RenderSfxCue } from "@/lib/videoRender";
import { FILTERS, FONTS, TEMPLATES, EXPORT_FORMATS, EXPORT_QUALITIES, type Filter, type Layer, type TextLayer, type StickerLayer, type PipLayer, type Clip, type ExportFormat, type ExportQuality, type SubtitleCue, type WatermarkPosition, type SfxItem, type SfxCue } from "./editorTypes";
import EditorEmptyState from "./EditorEmptyState";
import EditorPublishStep from "./EditorPublishStep";
import EditorCanvas from "./EditorCanvas";
import EditorToolbar from "./EditorToolbar";

type Tab = "templates" | "clips" | "trim" | "crop" | "filter" | "adjust" | "text" | "stickers" | "music" | "pip" | "watermark" | "subtitles" | "sfx";

// --- Undo/Redo: снимок состояния, которое можно откатить ---
interface HistorySnapshot {
  clips: Clip[];
  filter: Filter;
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  flipH: boolean;
  layers: Layer[];
  subtitles: SubtitleCue[];
}

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
  const [musicVolume, setMusicVolume] = useState(100);
  const [clipVolume, setClipVolume] = useState(100);
  const [speed, setSpeed] = useState(1);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("9:16");
  const [exportQuality, setExportQuality] = useState<ExportQuality>("1080");
  const [, setWatermarkFile] = useState<File | null>(null);
  const [watermarkUrl, setWatermarkUrl] = useState("");
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>("bottom-right");
  const [watermarkOpacity, setWatermarkOpacity] = useState(80);
  const [watermarkSize, setWatermarkSize] = useState(20);
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [activeSubtitleId, setActiveSubtitleId] = useState<number | null>(null);
  const [sfxCues, setSfxCues] = useState<SfxCue[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [pendingProducts, setPendingProducts] = useState<{ title: string; price: number; oldPrice?: number; promoCode?: string; productUrl?: string; image?: string }[]>([]);
  const [tab, setTab] = useState<Tab>("templates");
  const [destination, setDestination] = useState<"home" | "feed" | "both">("both");
  const [category, setCategory] = useState("humor");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState<{ stage: "compress" | "upload" | "save"; percent: number } | null>(null);
  const [step, setStep] = useState<"edit" | "publish">("edit");
  const [showFileSheet, setShowFileSheet] = useState(false);
  const pendingTemplateRef = useRef<string | null>(null);
  const capturedThumbRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const pipInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  const active = clips[activeIdx];

  // --- Undo/Redo ---
  const historyRef = useRef<{ past: HistorySnapshot[]; future: HistorySnapshot[] }>({ past: [], future: [] });
  const [historyTick, setHistoryTick] = useState(0);
  const isRestoringRef = useRef(false);
  const snapshot = useCallback((): HistorySnapshot => ({
    clips, filter, brightness, contrast, saturation, rotation, flipH, layers, subtitles,
  }), [clips, filter, brightness, contrast, saturation, rotation, flipH, layers, subtitles]);
  const restoreSnapshot = (s: HistorySnapshot) => {
    isRestoringRef.current = true;
    setClips(s.clips);
    setFilter(s.filter);
    setBrightness(s.brightness);
    setContrast(s.contrast);
    setSaturation(s.saturation);
    setRotation(s.rotation);
    setFlipH(s.flipH);
    setLayers(s.layers);
    setSubtitles(s.subtitles);
    if (activeIdx >= s.clips.length) setActiveIdx(Math.max(0, s.clips.length - 1));
  };
  const undo = () => {
    const h = historyRef.current;
    if (h.past.length === 0) return;
    const prev = h.past.pop()!;
    h.future.push(snapshot());
    restoreSnapshot(prev);
    setHistoryTick((t) => t + 1);
  };
  const redo = () => {
    const h = historyRef.current;
    if (h.future.length === 0) return;
    const next = h.future.pop()!;
    h.past.push(snapshot());
    restoreSnapshot(next);
    setHistoryTick((t) => t + 1);
  };
  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;
  // Сохраняем снимок в историю при каждом значимом изменении (debounce через requestIdleCallback-подобный setTimeout)
  const firstSnapshotDoneRef = useRef(false);
  useEffect(() => {
    if (clips.length === 0) return;
    if (!firstSnapshotDoneRef.current) { firstSnapshotDoneRef.current = true; return; }
    if (isRestoringRef.current) { isRestoringRef.current = false; return; }
    const t = setTimeout(() => {
      historyRef.current.past.push(snapshot());
      if (historyRef.current.past.length > 30) historyRef.current.past.shift();
      historyRef.current.future = [];
      setHistoryTick((v) => v + 1);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, brightness, contrast, saturation, rotation, flipH, layers, subtitles, clips.length]);
  void historyTick;

  useEffect(() => { capturedThumbRef.current = null; }, [activeIdx]);

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

  const updateClip = (id: number, patch: Partial<Clip>) => {
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
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

  // --- Водяной знак ---
  const handleWatermarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setWatermarkFile(f);
    setWatermarkUrl(URL.createObjectURL(f));
  };
  const removeWatermark = () => {
    setWatermarkFile(null);
    setWatermarkUrl("");
  };

  // --- Субтитры ---
  const addSubtitle = () => {
    const id = Date.now();
    const lastEnd = subtitles.length > 0 ? Math.max(...subtitles.map((s) => s.end)) : 0;
    const newCue: SubtitleCue = { id, text: "Субтитр", start: lastEnd, end: lastEnd + 3, color: "#ffffff", bg: "rgba(0,0,0,0.6)" };
    setSubtitles((s) => [...s, newCue]);
    setActiveSubtitleId(id);
  };
  const updateSubtitle = (id: number, patch: Partial<SubtitleCue>) => {
    setSubtitles((s) => s.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };
  const removeSubtitle = (id: number) => {
    setSubtitles((s) => s.filter((c) => c.id !== id));
    if (activeSubtitleId === id) setActiveSubtitleId(null);
  };

  // --- Звуковые эффекты ---
  const addSfx = (item: SfxItem) => {
    const id = Date.now();
    const newCue: SfxCue = { id, sfxId: item.id, url: item.url, label: item.label, time: 0, volume: 100 };
    setSfxCues((s) => [...s, newCue]);
  };
  const updateSfx = (id: number, patch: Partial<SfxCue>) => {
    setSfxCues((s) => s.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };
  const removeSfx = (id: number) => {
    setSfxCues((s) => s.filter((c) => c.id !== id));
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

  const addPip = (file: File) => {
    const id = Date.now();
    const newLayer: PipLayer = {
      id,
      type: "pip",
      url: URL.createObjectURL(file),
      mediaType: file.type.startsWith("video") ? "video" : "image",
      x: 78,
      y: 22,
      size: 32,
      rotation: 0,
      shape: "rect",
    };
    setLayers((s) => [...s, newLayer]);
    setActiveLayerId(id);
    setTab("pip");
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
    setSelectedTemplateId(templateId);
  };

  // Выбор шаблона на стартовом экране: запоминаем и открываем выбор файла
  const selectTemplateThenPick = (templateId: string) => {
    pendingTemplateRef.current = templateId;
    setShowFileSheet(true);
  };

  // Как только добавлен первый клип — применяем отложенный шаблон
  useEffect(() => {
    if (clips.length > 0 && pendingTemplateRef.current) {
      applyTemplate(pendingTemplateRef.current);
      setTab("templates");
      pendingTemplateRef.current = null;
    }
     
  }, [clips.length]);

  // Клик «Использовать шаблон» под чужим видео/постом в ленте — читаем из sessionStorage
  // (CameraScreen монтирует MediaEditor асинхронно, поэтому CustomEvent может не долететь)
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem("pending_template_id");
      if (pending) {
        sessionStorage.removeItem("pending_template_id");
        selectTemplateThenPick(pending);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const captureFrame = async (): Promise<Blob | null> => {
    if (!active) return null;
    const canvas = document.createElement("canvas");
    const quality = EXPORT_QUALITIES.find((q) => q.id === exportQuality) || EXPORT_QUALITIES[1];
    const size = Math.round((1080 * quality.scale) / 2) * 2;
    canvas.width = size;
    canvas.height = Math.round((size * 1.5) / 2) * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

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
        if (v.readyState < 2 || v.videoWidth === 0) {
          await new Promise<void>((resolve) => {
            const onReady = () => { v.removeEventListener("loadeddata", onReady); resolve(); };
            v.addEventListener("loadeddata", onReady);
            setTimeout(resolve, 2000);
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
      } else if (l.type === "sticker") {
        const fontSize = (l.size / 100) * canvas.height * 0.1;
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(l.emoji, 0, 0);
      } else if (l.type === "pip") {
        const pipMedia = l.mediaType === "image" ? new Image() : videoRefs.current.get(l.id);
        const box = (l.size / 100) * canvas.width;
        const draw = (media: HTMLImageElement | HTMLVideoElement) => {
          const mw = (media as HTMLImageElement).naturalWidth || (media as HTMLVideoElement).videoWidth || box;
          const mh = (media as HTMLImageElement).naturalHeight || (media as HTMLVideoElement).videoHeight || box;
          const scale = Math.max(box / mw, box / mh);
          const dw = mw * scale;
          const dh = mh * scale;
          ctx.save();
          if (l.shape === "circle") {
            ctx.beginPath();
            ctx.arc(0, 0, box / 2, 0, Math.PI * 2);
            ctx.clip();
          } else {
            const r = box * 0.08;
            const half = box / 2;
            ctx.beginPath();
            ctx.moveTo(-half + r, -half);
            ctx.arcTo(half, -half, half, half, r);
            ctx.arcTo(half, half, -half, half, r);
            ctx.arcTo(-half, half, -half, -half, r);
            ctx.arcTo(-half, -half, half, -half, r);
            ctx.closePath();
            ctx.clip();
          }
          ctx.drawImage(media, -dw / 2, -dh / 2, dw, dh);
          ctx.restore();
        };
        if (l.mediaType === "image" && pipMedia instanceof HTMLImageElement) {
          // изображение может ещё не быть загружено — рисуем синхронно, если готово, иначе пропускаем кадр
          if (pipMedia.complete && pipMedia.naturalWidth > 0) draw(pipMedia);
        } else if (pipMedia) {
          draw(pipMedia);
        }
      }
      ctx.restore();
    }

    // Водяной знак
    if (watermarkUrl) {
      const wm = new Image();
      wm.crossOrigin = "anonymous";
      await new Promise<void>((res) => { wm.onload = () => res(); wm.onerror = () => res(); wm.src = watermarkUrl; });
      if (wm.naturalWidth > 0) {
        const iw = wm.naturalWidth, ih = wm.naturalHeight;
        const w = (watermarkSize / 100) * canvas.width;
        const h = w * (ih / iw);
        const margin = canvas.width * 0.03;
        let x = margin, y = margin;
        if (watermarkPosition === "top-right") { x = canvas.width - w - margin; y = margin; }
        else if (watermarkPosition === "bottom-left") { x = margin; y = canvas.height - h - margin; }
        else if (watermarkPosition === "bottom-right") { x = canvas.width - w - margin; y = canvas.height - h - margin; }
        else if (watermarkPosition === "center") { x = (canvas.width - w) / 2; y = (canvas.height - h) / 2; }
        ctx.save();
        ctx.globalAlpha = watermarkOpacity / 100;
        ctx.drawImage(wm, x, y, w, h);
        ctx.restore();
      }
    }

    // Субтитры (первый активный в момент публикации кадра)
    const activeCue = subtitles.find((c) => c.start <= 0 && c.end > 0) || subtitles[0];
    if (activeCue) {
      const fontSize = canvas.height * 0.045;
      ctx.save();
      ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const y = canvas.height * 0.88;
      const metrics = ctx.measureText(activeCue.text);
      const pad = fontSize * 0.35;
      if (activeCue.bg && activeCue.bg !== "transparent") {
        ctx.fillStyle = activeCue.bg;
        ctx.fillRect(canvas.width / 2 - metrics.width / 2 - pad, y - fontSize / 2 - pad / 2, metrics.width + pad * 2, fontSize + pad);
      }
      ctx.fillStyle = activeCue.color;
      ctx.fillText(activeCue.text, canvas.width / 2, y);
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
      // Одиночное фото без второго клипа — публикуем статичным кадром, иначе рендерим видео
      // (склеивая ВСЕ клипы по порядку — не только активный)
      const isVideo = !(clips.length === 1 && active.type === "image");
      const fmt = EXPORT_FORMATS.find((f) => f.id === exportFormat) || EXPORT_FORMATS[0];
      const quality = EXPORT_QUALITIES.find((q) => q.id === exportQuality) || EXPORT_QUALITIES[1];
      const outW = Math.round((fmt.w * quality.scale) / 2) * 2;
      const outH = Math.round((fmt.h * quality.scale) / 2) * 2;

      let file: File;

      if (isVideo) {
        // Рендерим финальное видео со всеми эффектами: фильтры, текст/стикеры/PiP, переходы,
        // водяной знак, субтитры, звуковые эффекты, обрезка, скорость, музыка
        setPublishProgress({ stage: "compress", percent: 0 });
        const renderClips: RenderClip[] = clips.map((c) => ({
          url: c.url,
          type: c.type,
          trimStart: c.trimStart,
          trimEnd: c.trimEnd,
          speed: c.speed ?? speed,
          imageDuration: c.type === "image" ? 4 : undefined,
          transitionBefore: c.transition,
        }));
        const renderSfx: RenderSfxCue[] = sfxCues.map((s) => ({ url: s.url, time: s.time, volume: s.volume }));
        try {
          file = await renderVideoWithOverlays({
            clips: renderClips,
            outWidth: outW,
            outHeight: outH,
            filter,
            brightness,
            contrast,
            saturation,
            rotation,
            flipH,
            layers,
            clipVolume: clipVolume / 100,
            musicFile,
            musicVolume: musicVolume / 100,
            watermark: watermarkUrl ? { url: watermarkUrl, position: watermarkPosition, opacity: watermarkOpacity, size: watermarkSize } : null,
            subtitles,
            sfxCues: renderSfx,
            onProgress: (p) => setPublishProgress({ stage: "compress", percent: p }),
          });
        } catch (err) {
          console.warn("[MediaEditor] render failed, fallback to original", err);
          file = active.file;
          if (file.size > 4 * 1024 * 1024) {
            try {
              const result = await compressVideo(file, {
                maxWidth: 720, maxHeight: 1280, videoBitsPerSecond: 1_200_000,
                onProgress: (p) => setPublishProgress({ stage: "compress", percent: p }),
              });
              file = result.file;
            } catch { /* keep original */ }
          }
        }
      } else {
        const blob = await captureFrame();
        file = blob ? new File([blob], "edited.jpg", { type: "image/jpeg" }) : active.file;
      }

      const finalCategory =
        destination === "feed" ? "feed"
        : destination === "home" ? category
        : category;

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
          templateId: selectedTemplateId,
          products: pendingProducts.map((p) => ({
            title: p.title, price: p.price, old_price: p.oldPrice,
            promo_code: p.promoCode, product_url: p.productUrl, image: p.image,
          })),
        },
        (p) => setPublishProgress({ stage: "upload", percent: p }),
      );
      if (!reg || !reg.url) throw new Error("Сервер не вернул ссылку на файл");

      // Для видео — генерируем превью на сервере (OpenCV снимает кадр)
      if (isVideo && reg.id) {
        fetch("https://functions.poehali.dev/be575f5c-eb60-4522-ad3e-1b6527c85abb", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ video_url: reg.url, video_id: reg.id }),
        }).catch(() => {});
      }

      // Фиксируем использование шаблона для аналитики автора шаблона
      if (selectedTemplateId && reg.id) {
        fetch("https://functions.poehali.dev/7b5c6c18-7098-4f9b-bf3c-e6ac50574c06?action=track_template_use", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-User-Id": user?.id || "anonymous" },
          body: JSON.stringify({ template_id: selectedTemplateId, video_id: reg.id }),
        }).catch(() => {});
      }

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
      <EditorEmptyState
        onClose={onClose}
        showFileSheet={showFileSheet}
        setShowFileSheet={setShowFileSheet}
        galleryInputRef={galleryInputRef}
        cameraInputRef={cameraInputRef}
        onOpenSheet={() => setShowFileSheet(true)}
        onFilesAdd={addClips}
        onSelectTemplate={selectTemplateThenPick}
      />
    );
  }

  // PUBLISH STEP
  if (step === "publish") {
    return (
      <EditorPublishStep
        active={active}
        cssFilter={cssFilter}
        transform={transform}
        destination={destination}
        setDestination={setDestination}
        category={category}
        setCategory={setCategory}
        description={description}
        setDescription={setDescription}
        hashtags={hashtags}
        setHashtags={setHashtags}
        publishing={publishing}
        publishProgress={publishProgress}
        onBack={() => setStep("edit")}
        onPublish={handlePublish}
        products={pendingProducts}
        setProducts={setPendingProducts}
        userId={user?.id}
      />
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
      <input ref={pipInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addPip(f); e.target.value = ""; }} />
      <input ref={watermarkInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { handleWatermarkUpload(e); e.target.value = ""; }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3 border-b border-white/10 gap-2">
        <div className="flex items-center gap-1">
          <button onClick={undo} disabled={!canUndo} className={`p-2 rounded-full transition-colors ${canUndo ? "text-white hover:bg-white/10 cursor-pointer" : "text-white/25 cursor-not-allowed"}`} title="Отменить">
            <Icon name="Undo2" size={20} />
          </button>
          <button onClick={redo} disabled={!canRedo} className={`p-2 rounded-full transition-colors ${canRedo ? "text-white hover:bg-white/10 cursor-pointer" : "text-white/25 cursor-not-allowed"}`} title="Повторить">
            <Icon name="Redo2" size={20} />
          </button>
        </div>
        <button
          onClick={() => setStep("publish")}
          className="px-4 py-1.5 rounded-full bg-[#fe2c55] hover:bg-[#e0264c] active:scale-95 transition-all cursor-pointer text-white text-sm font-bold flex-shrink-0"
        >Далее</button>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer" title="Закрыть"><Icon name="X" size={22} className="text-white" /></button>
      </div>

      <EditorCanvas
        active={active}
        clips={clips}
        activeIdx={activeIdx}
        cssFilter={cssFilter}
        transform={transform}
        layers={layers}
        activeLayerId={activeLayerId}
        musicName={musicName}
        canvasRef={canvasRef}
        videoRefs={videoRefs}
        capturedThumbRef={capturedThumbRef}
        onLayerPointerDown={onLayerPointerDown}
        onLayerPointerMove={onLayerPointerMove}
        onLayerPointerUp={onLayerPointerUp}
        onClickCanvas={() => setActiveLayerId(null)}
        updateLayer={updateLayer}
        removeLayer={removeLayer}
      />

      <EditorToolbar
        tab={tab}
        setTab={setTab}
        active={active}
        clips={clips}
        activeIdx={activeIdx}
        setActiveIdx={setActiveIdx}
        filter={filter}
        setFilter={setFilter}
        brightness={brightness}
        setBrightness={setBrightness}
        contrast={contrast}
        setContrast={setContrast}
        saturation={saturation}
        setSaturation={setSaturation}
        rotation={rotation}
        setRotation={setRotation}
        flipH={flipH}
        setFlipH={setFlipH}
        layers={layers}
        activeLayerId={activeLayerId}
        musicName={musicName}
        musicFile={musicFile}
        showFileSheet={showFileSheet}
        setShowFileSheet={setShowFileSheet}
        galleryInputRef={galleryInputRef}
        cameraInputRef={cameraInputRef}
        musicInputRef={musicInputRef}
        addText={addText}
        addSticker={addSticker}
        updateLayer={updateLayer}
        removeClip={removeClip}
        moveClip={moveClip}
        applyTemplate={applyTemplate}
        setMusicFile={setMusicFile}
        setMusicName={setMusicName}
        audioRef={audioRef}
        updateClip={updateClip}
        musicVolume={musicVolume}
        setMusicVolume={setMusicVolume}
        clipVolume={clipVolume}
        setClipVolume={setClipVolume}
        speed={speed}
        setSpeed={setSpeed}
        exportFormat={exportFormat}
        setExportFormat={setExportFormat}
        exportQuality={exportQuality}
        setExportQuality={setExportQuality}
        pipInputRef={pipInputRef}
        watermarkInputRef={watermarkInputRef}
        watermarkUrl={watermarkUrl}
        watermarkPosition={watermarkPosition}
        setWatermarkPosition={setWatermarkPosition}
        watermarkOpacity={watermarkOpacity}
        setWatermarkOpacity={setWatermarkOpacity}
        watermarkSize={watermarkSize}
        setWatermarkSize={setWatermarkSize}
        removeWatermark={removeWatermark}
        subtitles={subtitles}
        activeSubtitleId={activeSubtitleId}
        setActiveSubtitleId={setActiveSubtitleId}
        addSubtitle={addSubtitle}
        updateSubtitle={updateSubtitle}
        removeSubtitle={removeSubtitle}
        sfxCues={sfxCues}
        addSfx={addSfx}
        updateSfx={updateSfx}
        removeSfx={removeSfx}
      />
    </div>
  );
};

export default MediaEditor;