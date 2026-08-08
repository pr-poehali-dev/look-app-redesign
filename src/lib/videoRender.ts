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

// Длительность анимации появления текста/стикеров/PiP (сек)
const ANIM_DUR = 0.5;

/** Вычисляет opacity/scale/offsetY для анимации входа + непрерывных эффектов (bounce/pulse). */
function computeAnim(animation: string | undefined, elapsed: number): { opacity: number; scale: number; offsetY: number } {
  const t = Math.max(0, Math.min(1, elapsed / ANIM_DUR));
  // ease-out
  const eo = 1 - Math.pow(1 - t, 3);
  switch (animation) {
    case "fadein":
      return { opacity: eo, scale: 1, offsetY: 0 };
    case "slideup":
      return { opacity: eo, scale: 1, offsetY: (1 - eo) * 40 };
    case "pop":
      return { opacity: eo, scale: 0.4 + eo * 0.6, offsetY: 0 };
    case "bounce": {
      const settle = eo;
      const loop = elapsed > ANIM_DUR ? Math.abs(Math.sin((elapsed - ANIM_DUR) * 2)) * 6 : 0;
      return { opacity: settle, scale: 1, offsetY: -loop };
    }
    case "pulse": {
      const pulse = elapsed > ANIM_DUR ? 1 + Math.sin((elapsed - ANIM_DUR) * 3) * 0.05 : 0.4 + eo * 0.6;
      return { opacity: eo, scale: pulse, offsetY: 0 };
    }
    default:
      return { opacity: 1, scale: 1, offsetY: 0 };
  }
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

function drawLayers(
  ctx: CanvasRenderingContext2D,
  layers: Layer[],
  W: number,
  H: number,
  elapsed: number,
  pipElements?: Map<number, HTMLVideoElement | HTMLImageElement>,
) {
  for (const l of layers) {
    const anim = computeAnim((l as { animation?: string }).animation, elapsed);
    if (anim.opacity <= 0.01) continue;
    ctx.save();
    ctx.globalAlpha = anim.opacity;
    const cx = (l.x / 100) * W;
    const cy = (l.y / 100) * H + anim.offsetY;
    ctx.translate(cx, cy);
    ctx.rotate((l.rotation * Math.PI) / 180);
    ctx.scale(anim.scale, anim.scale);
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
    } else if (l.type === "sticker") {
      const fontSize = (l.size / 100) * H * 0.1;
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(l.emoji, 0, 0);
    } else if (l.type === "pip") {
      const media = pipElements?.get(l.id);
      const box = (l.size / 100) * W;
      if (media) {
        const mw = (media as HTMLVideoElement).videoWidth || (media as HTMLImageElement).naturalWidth || box;
        const mh = (media as HTMLVideoElement).videoHeight || (media as HTMLImageElement).naturalHeight || box;
        const scale = Math.max(box / mw, box / mh);
        const dw = mw * scale;
        const dh = mh * scale;
        ctx.save();
        if (l.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, box / 2, 0, Math.PI * 2);
          ctx.clip();
        } else {
          ctx.beginPath();
          const r = box * 0.08;
          const half = box / 2;
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
        // рамка поверх
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = Math.max(2, box * 0.015);
        if (l.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, box / 2, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.strokeRect(-box / 2, -box / 2, box, box);
        }
        ctx.restore();
      }
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

  // --- PiP layers: подготавливаем видео/изображения для наложения ---
  const pipLayers = o.layers.filter((l) => l.type === "pip") as Extract<Layer, { type: "pip" }>[];
  const pipElements = new Map<number, HTMLVideoElement | HTMLImageElement>();
  await Promise.all(
    pipLayers.map(async (l) => {
      if (l.mediaType === "image") {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); img.src = l.url; });
        pipElements.set(l.id, img);
      } else {
        const v = document.createElement("video");
        v.src = l.url;
        v.crossOrigin = "anonymous";
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        await new Promise<void>((res) => {
          const onMeta = () => { v.removeEventListener("loadedmetadata", onMeta); res(); };
          v.addEventListener("loadedmetadata", onMeta);
          setTimeout(res, 3000);
        });
        pipElements.set(l.id, v);
      }
    }),
  );
  const startPipPlayback = () => {
    pipElements.forEach((el) => {
      if (el instanceof HTMLVideoElement) el.play().catch(() => {});
    });
  };
  const stopPipPlayback = () => {
    pipElements.forEach((el) => {
      if (el instanceof HTMLVideoElement) { try { el.pause(); } catch { /* noop */ } }
    });
  };

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
      startPipPlayback();
      const loop = () => {
        const elapsed = performance.now() - startedAt;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);
        drawMediaCover(ctx, img, W, H, o.rotation, o.flipH, filterStr);
        drawLayers(ctx, o.layers, W, H, elapsed / 1000, pipElements);
        o.onProgress?.(Math.min(99, (elapsed / durationMs) * 100));
        if (elapsed >= durationMs) { recorder.stop(); return; }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });

    stopPipPlayback();
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

  const videoStartedAt = performance.now();
  await new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
    recorder.start();
    if (musicEl) { musicEl.play().catch(() => {}); }
    audioCtx.resume().catch(() => {});
    video.play().catch(() => {});
    startPipPlayback();

    const loop = () => {
      if (video.currentTime >= trimEnd || video.ended) {
        recorder.stop();
        video.pause();
        return;
      }
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      drawMediaCover(ctx, video, W, H, o.rotation, o.flipH, filterStr);
      drawLayers(ctx, o.layers, W, H, (performance.now() - videoStartedAt) / 1000, pipElements);
      const prog = ((video.currentTime - trimStart) / segDur) * 100;
      o.onProgress?.(Math.max(0, Math.min(99, prog)));
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });

  stopPipPlayback();
  cleanup();
  const blob = new Blob(chunks, { type: mime.includes("mp4") ? "video/mp4" : "video/webm" });
  const ext = mime.includes("mp4") ? "mp4" : "webm";
  return new File([blob], `render-${Date.now()}.${ext}`, { type: blob.type });
}