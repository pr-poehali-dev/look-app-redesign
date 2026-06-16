import { useState, useRef, useEffect, useMemo } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { useUserMedia } from "@/context/UserMediaContext";
import { compressVideo, uploadFileDirect } from "@/lib/videoCompress";
import { renderVideoWithOverlays } from "@/lib/videoRender";
import { FILTERS, FONTS, TEMPLATES, EXPORT_FORMATS, type Filter, type Layer, type TextLayer, type StickerLayer, type Clip, type ExportFormat } from "./editorTypes";
import EditorEmptyState from "./EditorEmptyState";
import EditorPublishStep from "./EditorPublishStep";
import EditorCanvas from "./EditorCanvas";
import EditorToolbar from "./EditorToolbar";

type Tab = "templates" | "clips" | "trim" | "crop" | "filter" | "adjust" | "text" | "stickers" | "music";

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
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  const active = clips[activeIdx];

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
    const size = 1080;
    canvas.width = size;
    canvas.height = Math.round(size * 1.5);
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
      const isVideo = active.type === "video";
      const fmt = EXPORT_FORMATS.find((f) => f.id === exportFormat) || EXPORT_FORMATS[0];

      let file: File;

      if (isVideo) {
        // Рендерим финальное видео со всеми эффектами: фильтр, текст/стикеры, обрезка, скорость, музыка
        setPublishProgress({ stage: "compress", percent: 0 });
        try {
          file = await renderVideoWithOverlays({
            clipUrl: active.url,
            clipType: "video",
            outWidth: fmt.w,
            outHeight: fmt.h,
            filter,
            brightness,
            contrast,
            saturation,
            rotation,
            flipH,
            layers,
            trimStart: active.trimStart,
            trimEnd: active.trimEnd,
            speed,
            clipVolume: clipVolume / 100,
            musicFile,
            musicVolume: musicVolume / 100,
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

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3 border-b border-white/10">
        <button
          onClick={() => setStep("publish")}
          className="px-4 py-1.5 rounded-full bg-[#fe2c55] hover:bg-[#e0264c] active:scale-95 transition-all cursor-pointer text-white text-sm font-bold"
        >Далее</button>
        <p className="text-white font-bold">Конструктор</p>
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
      />
    </div>
  );
};

export default MediaEditor;