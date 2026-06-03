import type { Filter, Layer } from "@/components/camera/editor/editorTypes";
import { FILTERS } from "@/components/camera/editor/editorTypes";

export interface RenderOptions {
  clipUrl: string;
  clipType: "image" | "video";
  outWidth: number;
  outHeight: number;
  filter: Filter;
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  flipH: boolean;
  layers: Layer[];
  trimStart?: number;
  trimEnd?: number;
  speed?: number;
  clipVolume?: number;
  musicFile?: File | null;
  musicVolume?: number;
  imageDuration?: number;
  onProgress?: (percent: number) => void;
}

function buildFilterString(o: RenderOptions): string {
  const base = FILTERS.find((f) => f.id === o.filter)?.css || "none";
  const adj = `brightness(${o.brightness}%) contrast(${o.contrast}%) saturate(${o.saturation}%)`;
  return base === "none" ? adj : `${base} ${adj}`;
}

function pickMimeType(): string {
  const types = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const t of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "video/webm";
}

function drawLayers(ctx: CanvasRenderingContext2D, layers: Layer[], W: number, H: number) {
  for (const l of layers) {
    ctx.save();
    const cx = (l.x / 100) * W;
    const cy = (l.y / 100) * H;
    ctx.translate(cx, cy);
    ctx.rotate((l.rotation * Math.PI) / 180);
    if (l.type === "text") {
      const fontSize = (l.size / 100) * H * 0.08;
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
      const fontSize = (l.size / 100) * H * 0.1;
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(l.emoji, 0, 0);
    }
    ctx.restore();
  }
}

function drawMediaCover(
  ctx: CanvasRenderingContext2D,
  media: HTMLVideoElement | HTMLImageElement,
  W: number,
  H: number,
  rotation: number,
  flipH: boolean,
  filterStr: string,
) {
  const mw = (media as HTMLVideoElement).videoWidth || (media as HTMLImageElement).naturalWidth || W;
  const mh = (media as HTMLVideoElement).videoHeight || (media as HTMLImageElement).naturalHeight || H;
  ctx.save();
  ctx.filter = filterStr;
  ctx.translate(W / 2, H / 2);
  if (rotation) ctx.rotate((rotation * Math.PI) / 180);
  if (flipH) ctx.scale(-1, 1);
  const scale = Math.max(W / mw, H / mh);
  const w = mw * scale;
  const h = mh * scale;
  ctx.drawImage(media, -w / 2, -h / 2, w, h);
  ctx.restore();
  ctx.filter = "none";
}

/**
 * Рендерит финальное видео со всеми эффектами: фильтры, текст/стикеры, обрезка,
 * скорость, микс собственной музыки. Возвращает готовый File.
 */
export async function renderVideoWithOverlays(o: RenderOptions): Promise<File> {
  const W = o.outWidth;
  const H = o.outHeight;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas ctx");

  const filterStr = buildFilterString(o);
  const fps = 30;
  const speed = o.speed && o.speed > 0 ? o.speed : 1;

  // --- AUDIO graph ---
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx();
  const dest = audioCtx.createMediaStreamDestination();
  let musicEl: HTMLAudioElement | null = null;
  let musicSrcNode: MediaElementAudioSourceNode | null = null;

  if (o.musicFile) {
    musicEl = document.createElement("audio");
    musicEl.src = URL.createObjectURL(o.musicFile);
    musicEl.loop = true;
    musicEl.crossOrigin = "anonymous";
    const gain = audioCtx.createGain();
    gain.gain.value = o.musicVolume ?? 1;
    musicSrcNode = audioCtx.createMediaElementSource(musicEl);
    musicSrcNode.connect(gain).connect(dest);
  }

  const cleanup = () => {
    try { musicEl?.pause(); } catch { /* noop */ }
    try { audioCtx.close(); } catch { /* noop */ }
  };

  // --- IMAGE branch: render a static frame for N seconds ---
  if (o.clipType === "image") {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); img.src = o.clipUrl; });

    const stream = canvas.captureStream(fps);
    if (musicEl) dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    const mime = pickMimeType();
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

    const durationMs = (o.imageDuration ?? 4) * 1000;
    const startedAt = performance.now();

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.start();
      if (musicEl) { audioCtx.resume(); musicEl.play().catch(() => {}); }
      const loop = () => {
        const elapsed = performance.now() - startedAt;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);
        drawMediaCover(ctx, img, W, H, o.rotation, o.flipH, filterStr);
        drawLayers(ctx, o.layers, W, H);
        o.onProgress?.(Math.min(99, (elapsed / durationMs) * 100));
        if (elapsed >= durationMs) { recorder.stop(); return; }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });

    cleanup();
    const blob = new Blob(chunks, { type: mime.includes("mp4") ? "video/mp4" : "video/webm" });
    const ext = mime.includes("mp4") ? "mp4" : "webm";
    return new File([blob], `render-${Date.now()}.${ext}`, { type: blob.type });
  }

  // --- VIDEO branch ---
  const video = document.createElement("video");
  video.src = o.clipUrl;
  video.crossOrigin = "anonymous";
  video.muted = false;
  video.playsInline = true;
  (video as HTMLVideoElement & { playbackRate: number }).playbackRate = speed;

  await new Promise<void>((res) => {
    const onMeta = () => { video.removeEventListener("loadedmetadata", onMeta); res(); };
    video.addEventListener("loadedmetadata", onMeta);
    setTimeout(res, 4000);
  });

  const fullDur = isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
  const trimStart = Math.max(0, o.trimStart ?? 0);
  const trimEnd = o.trimEnd && o.trimEnd > trimStart ? Math.min(o.trimEnd, fullDur || o.trimEnd) : (fullDur || 0);
  const segDur = (trimEnd - trimStart) || fullDur || 5;

  // original clip audio mixed in (volume)
  try {
    const clipSource = audioCtx.createMediaElementSource(video);
    const clipGain = audioCtx.createGain();
    clipGain.gain.value = o.clipVolume ?? 1;
    clipSource.connect(clipGain).connect(dest);
  } catch { /* some browsers block; ignore */ }

  const stream = canvas.captureStream(fps);
  dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  const mime = pickMimeType();
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

  video.currentTime = trimStart;
  await new Promise<void>((r) => { const f = () => { video.removeEventListener("seeked", f); r(); }; video.addEventListener("seeked", f); setTimeout(r, 1500); });

  await new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
    recorder.start();
    if (musicEl) { musicEl.play().catch(() => {}); }
    audioCtx.resume().catch(() => {});
    video.play().catch(() => {});

    const loop = () => {
      if (video.currentTime >= trimEnd || video.ended) {
        recorder.stop();
        video.pause();
        return;
      }
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      drawMediaCover(ctx, video, W, H, o.rotation, o.flipH, filterStr);
      drawLayers(ctx, o.layers, W, H);
      const prog = ((video.currentTime - trimStart) / segDur) * 100;
      o.onProgress?.(Math.max(0, Math.min(99, prog)));
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });

  cleanup();
  const blob = new Blob(chunks, { type: mime.includes("mp4") ? "video/mp4" : "video/webm" });
  const ext = mime.includes("mp4") ? "mp4" : "webm";
  return new File([blob], `render-${Date.now()}.${ext}`, { type: blob.type });
}
