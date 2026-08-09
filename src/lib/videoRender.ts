import type { Filter, Layer, SubtitleCue, TransitionType, WatermarkPosition } from "@/components/camera/editor/editorTypes";
import { FILTERS } from "@/components/camera/editor/editorTypes";

export interface RenderClip {
  url: string;
  type: "image" | "video";
  trimStart?: number;
  trimEnd?: number;
  speed?: number;
  imageDuration?: number;
  /** Переход, который проигрывается ПЕРЕД этим клипом (игнорируется для первого клипа) */
  transitionBefore?: TransitionType;
}

export interface RenderWatermark {
  url: string;
  position: WatermarkPosition;
  opacity: number; // 0-100
  size: number; // % ширины кадра
}

export interface RenderSfxCue {
  url: string;
  time: number; // сек от начала всего ролика
  volume: number; // 0-200 (%)
}

export interface RenderOptions {
  clips: RenderClip[];
  outWidth: number;
  outHeight: number;
  filter: Filter;
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  flipH: boolean;
  layers: Layer[];
  clipVolume?: number;
  musicFile?: File | null;
  musicVolume?: number;
  watermark?: RenderWatermark | null;
  subtitles?: SubtitleCue[];
  sfxCues?: RenderSfxCue[];
  onProgress?: (percent: number) => void;
}

// Длительность анимации появления текста/стикеров/PiP (сек)
const ANIM_DUR = 0.5;
// Длительность перехода между клипами (сек)
const TRANSITION_DUR = 0.5;

/** Вычисляет opacity/scale/offsetY для анимации входа + непрерывных эффектов (bounce/pulse). */
function computeAnim(animation: string | undefined, elapsed: number): { opacity: number; scale: number; offsetY: number } {
  const t = Math.max(0, Math.min(1, elapsed / ANIM_DUR));
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

function drawWatermark(ctx: CanvasRenderingContext2D, img: HTMLImageElement, W: number, H: number, position: WatermarkPosition, opacity: number, sizePct: number) {
  const iw = img.naturalWidth || 1;
  const ih = img.naturalHeight || 1;
  const w = (sizePct / 100) * W;
  const h = w * (ih / iw);
  const margin = W * 0.03;
  let x = margin;
  let y = margin;
  if (position === "top-right") { x = W - w - margin; y = margin; }
  else if (position === "bottom-left") { x = margin; y = H - h - margin; }
  else if (position === "bottom-right") { x = W - w - margin; y = H - h - margin; }
  else if (position === "center") { x = (W - w) / 2; y = (H - h) / 2; }
  ctx.save();
  ctx.globalAlpha = opacity / 100;
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

function drawSubtitle(ctx: CanvasRenderingContext2D, cue: SubtitleCue, W: number, H: number) {
  const fontSize = H * 0.045;
  ctx.save();
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const y = H * 0.88;
  const metrics = ctx.measureText(cue.text);
  const pad = fontSize * 0.35;
  if (cue.bg && cue.bg !== "transparent") {
    ctx.fillStyle = cue.bg;
    ctx.fillRect(W / 2 - metrics.width / 2 - pad, y - fontSize / 2 - pad / 2, metrics.width + pad * 2, fontSize + pad);
  }
  ctx.fillStyle = cue.color;
  ctx.fillText(cue.text, W / 2, y);
  ctx.restore();
}

function compositeTransition(
  ctx: CanvasRenderingContext2D,
  type: TransitionType,
  t: number,
  fromCanvas: HTMLCanvasElement,
  toCanvas: HTMLCanvasElement,
  W: number,
  H: number,
) {
  ctx.clearRect(0, 0, W, H);
  switch (type) {
    case "slide":
      ctx.drawImage(fromCanvas, -t * W, 0);
      ctx.drawImage(toCanvas, (1 - t) * W, 0);
      break;
    case "zoom": {
      ctx.globalAlpha = 1 - t;
      ctx.drawImage(fromCanvas, 0, 0);
      ctx.globalAlpha = t;
      ctx.save();
      const s = 0.85 + 0.15 * t;
      ctx.translate(W / 2, H / 2);
      ctx.scale(s, s);
      ctx.translate(-W / 2, -H / 2);
      ctx.drawImage(toCanvas, 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
      break;
    }
    case "wipe":
      ctx.drawImage(fromCanvas, 0, 0);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, t * W, H);
      ctx.clip();
      ctx.drawImage(toCanvas, 0, 0);
      ctx.restore();
      break;
    case "fade":
    default:
      ctx.globalAlpha = 1;
      ctx.drawImage(fromCanvas, 0, 0);
      ctx.globalAlpha = t;
      ctx.drawImage(toCanvas, 0, 0);
      ctx.globalAlpha = 1;
      break;
  }
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); img.src = url; });
  return img;
}

async function loadVideoMeta(v: HTMLVideoElement): Promise<void> {
  await new Promise<void>((res) => {
    const onMeta = () => { v.removeEventListener("loadedmetadata", onMeta); res(); };
    v.addEventListener("loadedmetadata", onMeta);
    setTimeout(res, 4000);
  });
}

/**
 * Рендерит финальное видео из одного или нескольких клипов со всеми эффектами:
 * фильтры, текст/стикеры/PiP-слои, переходы между клипами, водяной знак, субтитры,
 * звуковые эффекты, обрезка, скорость, микс собственной музыки. Возвращает готовый File.
 */
export async function renderVideoWithOverlays(o: RenderOptions): Promise<File> {
  const W = o.outWidth;
  const H = o.outHeight;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas ctx");

  const offA = document.createElement("canvas"); offA.width = W; offA.height = H;
  const offB = document.createElement("canvas"); offB.width = W; offB.height = H;
  const offCtxA = offA.getContext("2d")!;
  const offCtxB = offB.getContext("2d")!;

  const filterStr = buildFilterString(o);
  const fps = 30;

  // --- PiP layers: подготавливаем видео/изображения для наложения (общие для всех клипов) ---
  const pipLayers = o.layers.filter((l) => l.type === "pip") as Extract<Layer, { type: "pip" }>[];
  const pipElements = new Map<number, HTMLVideoElement | HTMLImageElement>();
  await Promise.all(
    pipLayers.map(async (l) => {
      if (l.mediaType === "image") {
        pipElements.set(l.id, await loadImage(l.url));
      } else {
        const v = document.createElement("video");
        v.src = l.url;
        v.crossOrigin = "anonymous";
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        await loadVideoMeta(v);
        pipElements.set(l.id, v);
      }
    }),
  );
  const startPipPlayback = () => { pipElements.forEach((el) => { if (el instanceof HTMLVideoElement) el.play().catch(() => {}); }); };
  const stopPipPlayback = () => { pipElements.forEach((el) => { if (el instanceof HTMLVideoElement) { try { el.pause(); } catch { /* noop */ } } }); };

  // --- Watermark ---
  let watermarkImg: HTMLImageElement | null = null;
  if (o.watermark?.url) watermarkImg = await loadImage(o.watermark.url);

  // --- AUDIO graph ---
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx();
  const dest = audioCtx.createMediaStreamDestination();
  let musicEl: HTMLAudioElement | null = null;

  if (o.musicFile) {
    musicEl = document.createElement("audio");
    musicEl.src = URL.createObjectURL(o.musicFile);
    musicEl.loop = true;
    musicEl.crossOrigin = "anonymous";
    const gain = audioCtx.createGain();
    gain.gain.value = o.musicVolume ?? 1;
    const musicSrcNode = audioCtx.createMediaElementSource(musicEl);
    musicSrcNode.connect(gain).connect(dest);
  }

  const sfxTimers: number[] = [];
  const sfxElements: HTMLAudioElement[] = [];
  const scheduleSfx = () => {
    (o.sfxCues || []).forEach((cue) => {
      const timerId = window.setTimeout(() => {
        try {
          const el = document.createElement("audio");
          el.src = cue.url;
          el.crossOrigin = "anonymous";
          sfxElements.push(el);
          const gain = audioCtx.createGain();
          gain.gain.value = (cue.volume ?? 100) / 100;
          const node = audioCtx.createMediaElementSource(el);
          node.connect(gain).connect(dest);
          el.play().catch(() => {});
        } catch { /* noop */ }
      }, Math.max(0, cue.time * 1000));
      sfxTimers.push(timerId);
    });
  };

  const cleanup = () => {
    try { musicEl?.pause(); } catch { /* noop */ }
    sfxTimers.forEach((id) => clearTimeout(id));
    sfxElements.forEach((el) => { try { el.pause(); } catch { /* noop */ } });
    try { audioCtx.close(); } catch { /* noop */ }
  };

  const stream = canvas.captureStream(fps);
  dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  const mime = pickMimeType();
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

  // Приблизительная общая длительность (для прогресс-бара)
  const estTotal = o.clips.reduce((sum, c) => {
    const trimStart = Math.max(0, c.trimStart ?? 0);
    const trimEnd = c.trimEnd && c.trimEnd > trimStart ? c.trimEnd : trimStart + (c.imageDuration ?? 4);
    const speed = c.speed && c.speed > 0 ? c.speed : 1;
    return sum + (trimEnd - trimStart) / speed + TRANSITION_DUR;
  }, 0) || 1;

  let subtitleGlobalTime = 0;

  const recordingDone = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
  recorder.start();
  if (musicEl) { audioCtx.resume().catch(() => {}); musicEl.play().catch(() => {}); }
  scheduleSfx();
  startPipPlayback();

  for (let i = 0; i < o.clips.length; i++) {
    const clip = o.clips[i];
    const speed = clip.speed && clip.speed > 0 ? clip.speed : 1;

    if (clip.type === "image") {
      const img = await loadImage(clip.url);
      const durationSec = clip.imageDuration ?? 4;
      const startedAt = performance.now();
      await new Promise<void>((resolve) => {
        const loop = () => {
          const elapsedSec = (performance.now() - startedAt) / 1000;
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, W, H);
          drawMediaCover(ctx, img, W, H, o.rotation, o.flipH, filterStr);
          drawLayers(ctx, o.layers, W, H, elapsedSec, pipElements);
          if (watermarkImg && o.watermark) drawWatermark(ctx, watermarkImg, W, H, o.watermark.position, o.watermark.opacity, o.watermark.size);
          const globalT = subtitleGlobalTime + elapsedSec;
          (o.subtitles || []).forEach((cue) => { if (globalT >= cue.start && globalT < cue.end) drawSubtitle(ctx, cue, W, H); });
          o.onProgress?.(Math.min(99, ((subtitleGlobalTime + elapsedSec) / estTotal) * 100));
          if (elapsedSec >= durationSec) { resolve(); return; }
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      });
      subtitleGlobalTime += durationSec;
      // snapshot last frame
      offCtxA.drawImage(canvas, 0, 0);
    } else {
      const video = document.createElement("video");
      video.src = clip.url;
      video.crossOrigin = "anonymous";
      video.muted = false;
      video.playsInline = true;
      (video as HTMLVideoElement & { playbackRate: number }).playbackRate = speed;
      await loadVideoMeta(video);

      const fullDur = isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      const trimStart = Math.max(0, clip.trimStart ?? 0);
      const trimEnd = clip.trimEnd && clip.trimEnd > trimStart ? Math.min(clip.trimEnd, fullDur || clip.trimEnd) : (fullDur || 0);
      const segDur = (trimEnd - trimStart) || fullDur || 5;

      try {
        const clipSource = audioCtx.createMediaElementSource(video);
        const clipGain = audioCtx.createGain();
        clipGain.gain.value = o.clipVolume ?? 1;
        clipSource.connect(clipGain).connect(dest);
      } catch { /* some browsers block; ignore */ }

      video.currentTime = trimStart;
      await new Promise<void>((r) => { const f = () => { video.removeEventListener("seeked", f); r(); }; video.addEventListener("seeked", f); setTimeout(r, 1500); });

      // --- Переход ПЕРЕД этим клипом (кроме самого первого) ---
      if (i > 0 && clip.transitionBefore && clip.transitionBefore !== "none") {
        video.play().catch(() => {});
        const transStartedAt = performance.now();
        await new Promise<void>((resolve) => {
          const loop = () => {
            const t = Math.min(1, (performance.now() - transStartedAt) / (TRANSITION_DUR * 1000));
            offCtxB.fillStyle = "#000";
            offCtxB.fillRect(0, 0, W, H);
            drawMediaCover(offCtxB, video, W, H, o.rotation, o.flipH, filterStr);
            compositeTransition(ctx, clip.transitionBefore!, t, offA, offB, W, H);
            if (watermarkImg && o.watermark) drawWatermark(ctx, watermarkImg, W, H, o.watermark.position, o.watermark.opacity, o.watermark.size);
            o.onProgress?.(Math.min(99, ((subtitleGlobalTime + t * TRANSITION_DUR) / estTotal) * 100));
            if (t >= 1) { resolve(); return; }
            requestAnimationFrame(loop);
          };
          requestAnimationFrame(loop);
        });
        subtitleGlobalTime += TRANSITION_DUR;
      } else {
        video.play().catch(() => {});
      }

      const clipRenderStartedAt = performance.now() - (video.currentTime - trimStart) / speed * 1000;
      await new Promise<void>((resolve) => {
        const loop = () => {
          if (video.currentTime >= trimEnd || video.ended) { resolve(); return; }
          const elapsedSec = (performance.now() - clipRenderStartedAt) / 1000;
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, W, H);
          drawMediaCover(ctx, video, W, H, o.rotation, o.flipH, filterStr);
          drawLayers(ctx, o.layers, W, H, elapsedSec, pipElements);
          if (watermarkImg && o.watermark) drawWatermark(ctx, watermarkImg, W, H, o.watermark.position, o.watermark.opacity, o.watermark.size);
          const globalT = subtitleGlobalTime + (video.currentTime - trimStart) / speed;
          (o.subtitles || []).forEach((cue) => { if (globalT >= cue.start && globalT < cue.end) drawSubtitle(ctx, cue, W, H); });
          const prog = (subtitleGlobalTime + (video.currentTime - trimStart) / speed) / estTotal;
          o.onProgress?.(Math.max(0, Math.min(99, prog * 100)));
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      });
      video.pause();
      subtitleGlobalTime += segDur;
      offCtxA.drawImage(canvas, 0, 0);
    }
  }

  stopPipPlayback();
  recorder.stop();
  await recordingDone;
  cleanup();
  const blob = new Blob(chunks, { type: mime.includes("mp4") ? "video/mp4" : "video/webm" });
  const ext = mime.includes("mp4") ? "mp4" : "webm";
  return new File([blob], `render-${Date.now()}.${ext}`, { type: blob.type });
}