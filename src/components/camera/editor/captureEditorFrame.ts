import type { MutableRefObject } from "react";
import { EXPORT_QUALITIES, type ExportQuality, type Layer, type Clip, type SubtitleCue, type WatermarkPosition } from "./editorTypes";

export interface CaptureFrameParams {
  active: Clip | undefined;
  exportQuality: ExportQuality;
  cssFilter: string;
  rotation: number;
  flipH: boolean;
  layers: Layer[];
  videoRefs: MutableRefObject<Map<number, HTMLVideoElement>>;
  watermarkUrl: string;
  watermarkSize: number;
  watermarkPosition: WatermarkPosition;
  watermarkOpacity: number;
  subtitles: SubtitleCue[];
}

export const captureEditorFrame = async ({
  active, exportQuality, cssFilter, rotation, flipH, layers, videoRefs,
  watermarkUrl, watermarkSize, watermarkPosition, watermarkOpacity, subtitles,
}: CaptureFrameParams): Promise<Blob | null> => {
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

export default captureEditorFrame;
