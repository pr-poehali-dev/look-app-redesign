import { useRef, useEffect, useMemo } from "react";
import { FILTERS, FONTS, TEMPLATES, type Layer, type TextLayer, type StickerLayer, type PipLayer, type Clip, type SubtitleCue, type SfxItem, type SfxCue } from "./editorTypes";
import type { EditorState } from "./useEditorState";

export const useEditorActions = (s: EditorState) => {
  const {
    clips, setClips, activeIdx, setActiveIdx,
    filter, setFilter, brightness, contrast, saturation, rotation, flipH,
    setLayers, activeLayerId, setActiveLayerId,
    setMusicFile, setMusicName,
    setWatermarkFile, setWatermarkUrl,
    subtitles, setSubtitles, activeSubtitleId, setActiveSubtitleId,
    setSfxCues, setSelectedTemplateId, setTab, setShowFileSheet,
    pendingTemplateRef, capturedThumbRef, audioRef, canvasRef,
  } = s;

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
    const lastEnd = subtitles.length > 0 ? Math.max(...subtitles.map((c) => c.end)) : 0;
    const newCue: SubtitleCue = { id, text: "Субтитр", start: lastEnd, end: lastEnd + 3, color: "#ffffff", bg: "rgba(0,0,0,0.6)" };
    setSubtitles((prev) => [...prev, newCue]);
    setActiveSubtitleId(id);
  };
  const updateSubtitle = (id: number, patch: Partial<SubtitleCue>) => {
    setSubtitles((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };
  const removeSubtitle = (id: number) => {
    setSubtitles((prev) => prev.filter((c) => c.id !== id));
    if (activeSubtitleId === id) setActiveSubtitleId(null);
  };

  // --- Звуковые эффекты ---
  const addSfx = (item: SfxItem) => {
    const id = Date.now();
    const newCue: SfxCue = { id, sfxId: item.id, url: item.url, label: item.label, time: 0, volume: 100 };
    setSfxCues((prev) => [...prev, newCue]);
  };
  const updateSfx = (id: number, patch: Partial<SfxCue>) => {
    setSfxCues((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };
  const removeSfx = (id: number) => {
    setSfxCues((prev) => prev.filter((c) => c.id !== id));
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
    setLayers((prev) => [...prev, newLayer]);
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
    setLayers((prev) => [...prev, newLayer]);
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
    setLayers((prev) => [...prev, newLayer]);
    setActiveLayerId(id);
    setTab("pip");
  };

  const updateLayer = (id: number, patch: Partial<Layer>) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } as Layer : l)));
  };

  const removeLayer = (id: number) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
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

  return {
    cssFilter, transform,
    addClips, removeClip, updateClip, moveClip,
    handleWatermarkUpload, removeWatermark,
    addSubtitle, updateSubtitle, removeSubtitle,
    addSfx, updateSfx, removeSfx,
    addText, addSticker, addPip, updateLayer, removeLayer,
    applyTemplate, selectTemplateThenPick,
    handleMusicUpload,
    onLayerPointerDown, onLayerPointerMove, onLayerPointerUp,
  };
};

export type EditorActions = ReturnType<typeof useEditorActions>;
