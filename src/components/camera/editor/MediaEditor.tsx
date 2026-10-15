import { PublishCompliance, DEFAULT_COMPLIANCE } from "@/components/camera/ComplianceFields";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserMedia } from "@/context/UserMediaContext";
import { FILTERS, FONTS, TEMPLATES, type Filter, type Layer, type TextLayer, type StickerLayer, type PipLayer, type Clip, type ExportFormat, type ExportQuality, type SubtitleCue, type WatermarkPosition, type SfxItem, type SfxCue } from "./editorTypes";
import EditorEmptyState from "./EditorEmptyState";
import EditorPublishStep from "./EditorPublishStep";
import EditorCanvas from "./EditorCanvas";
import EditorToolbar from "./EditorToolbar";
import EditorHeader from "./EditorHeader";
import EditorHiddenInputs from "./EditorHiddenInputs";
import captureEditorFrame from "./captureEditorFrame";
import publishEditorProject from "./publishEditorProject";

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
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [isAd, setIsAd] = useState(false);
  const [compliance, setCompliance] = useState<PublishCompliance>(DEFAULT_COMPLIANCE);
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

  const captureFrame = (): Promise<Blob | null> => captureEditorFrame({
    active, exportQuality, cssFilter, rotation, flipH, layers, videoRefs,
    watermarkUrl, watermarkSize, watermarkPosition, watermarkOpacity, subtitles,
  });

  const handlePublish = () => publishEditorProject({
    user, clips, active, isAd, compliance, exportFormat, exportQuality, speed, sfxCues,
    filter, brightness, contrast, saturation, rotation, flipH, layers, clipVolume,
    musicFile, musicVolume, watermarkUrl, watermarkPosition, watermarkOpacity, watermarkSize,
    subtitles, destination, categoryTouched, category, description, hashtags,
    selectedTemplateId, pendingProducts, captureFrame, refreshMedia, onPublished,
    setPublishing, setPublishProgress,
  });


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
        category={destination === "feed" && !categoryTouched ? "" : category}
        setCategory={(v) => { setCategory(v); setCategoryTouched(true); }}
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
        isAd={isAd}
        setIsAd={setIsAd}
        clipsCount={clips.length}
        compliance={compliance}
        onComplianceChange={setCompliance}
      />
    );
  }

  // MAIN EDIT VIEW
  return (
    <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col">
      <EditorHiddenInputs
        audioRef={audioRef}
        fileInputRef={fileInputRef}
        galleryInputRef={galleryInputRef}
        cameraInputRef={cameraInputRef}
        musicInputRef={musicInputRef}
        pipInputRef={pipInputRef}
        watermarkInputRef={watermarkInputRef}
        addClips={addClips}
        handleMusicUpload={handleMusicUpload}
        addPip={addPip}
        handleWatermarkUpload={handleWatermarkUpload}
      />

      <EditorHeader
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onNext={() => setStep("publish")}
        onClose={onClose}
      />

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