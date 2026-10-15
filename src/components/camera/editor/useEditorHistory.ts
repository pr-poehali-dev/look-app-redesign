import { useState, useRef, useEffect, useCallback } from "react";
import type { Filter, Layer, Clip, SubtitleCue } from "./editorTypes";
import type { EditorState } from "./useEditorState";

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

export const useEditorHistory = (s: EditorState) => {
  const {
    clips, filter, brightness, contrast, saturation, rotation, flipH, layers, subtitles, activeIdx,
    setClips, setFilter, setBrightness, setContrast, setSaturation, setRotation, setFlipH,
    setLayers, setSubtitles, setActiveIdx,
  } = s;

  // --- Undo/Redo ---
  const historyRef = useRef<{ past: HistorySnapshot[]; future: HistorySnapshot[] }>({ past: [], future: [] });
  const [historyTick, setHistoryTick] = useState(0);
  const isRestoringRef = useRef(false);
  const snapshot = useCallback((): HistorySnapshot => ({
    clips, filter, brightness, contrast, saturation, rotation, flipH, layers, subtitles,
  }), [clips, filter, brightness, contrast, saturation, rotation, flipH, layers, subtitles]);
  const restoreSnapshot = (snap: HistorySnapshot) => {
    isRestoringRef.current = true;
    setClips(snap.clips);
    setFilter(snap.filter);
    setBrightness(snap.brightness);
    setContrast(snap.contrast);
    setSaturation(snap.saturation);
    setRotation(snap.rotation);
    setFlipH(snap.flipH);
    setLayers(snap.layers);
    setSubtitles(snap.subtitles);
    if (activeIdx >= snap.clips.length) setActiveIdx(Math.max(0, snap.clips.length - 1));
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

  return { undo, redo, canUndo, canRedo };
};
