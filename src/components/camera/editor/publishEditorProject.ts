import { toast } from "sonner";
import type { PublishCompliance } from "@/components/camera/ComplianceFields";
import { compressVideo, uploadFileDirect } from "@/lib/videoCompress";
import { renderVideoWithOverlays, type RenderClip, type RenderSfxCue } from "@/lib/videoRender";
import { EXPORT_FORMATS, EXPORT_QUALITIES, type Filter, type Layer, type Clip, type ExportFormat, type ExportQuality, type SubtitleCue, type WatermarkPosition, type SfxCue } from "./editorTypes";

export interface PendingProduct {
  title: string;
  price: number;
  oldPrice?: number;
  promoCode?: string;
  productUrl?: string;
  image?: string;
}

export interface PublishParams {
  user: { id?: string; name?: string; handle?: string } | null | undefined;
  clips: Clip[];
  active: Clip | undefined;
  isAd: boolean;
  compliance: PublishCompliance;
  exportFormat: ExportFormat;
  exportQuality: ExportQuality;
  speed: number;
  sfxCues: SfxCue[];
  filter: Filter;
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  flipH: boolean;
  layers: Layer[];
  clipVolume: number;
  musicFile: File | null;
  musicVolume: number;
  watermarkUrl: string;
  watermarkPosition: WatermarkPosition;
  watermarkOpacity: number;
  watermarkSize: number;
  subtitles: SubtitleCue[];
  destination: "home" | "feed" | "both";
  categoryTouched: boolean;
  category: string;
  description: string;
  hashtags: string;
  selectedTemplateId: string | null;
  pendingProducts: PendingProduct[];
  captureFrame: () => Promise<Blob | null>;
  refreshMedia: () => Promise<unknown> | unknown;
  onPublished: () => void;
  setPublishing: (v: boolean) => void;
  setPublishProgress: (v: { stage: "compress" | "upload" | "save"; percent: number } | null) => void;
}

export const publishEditorProject = async ({
  user, clips, active, isAd, compliance, exportFormat, exportQuality, speed, sfxCues,
  filter, brightness, contrast, saturation, rotation, flipH, layers, clipVolume,
  musicFile, musicVolume, watermarkUrl, watermarkPosition, watermarkOpacity, watermarkSize,
  subtitles, destination, categoryTouched, category, description, hashtags,
  selectedTemplateId, pendingProducts, captureFrame, refreshMedia, onPublished,
  setPublishing, setPublishProgress,
}: PublishParams): Promise<void> => {
  if (clips.length === 0 || !active) return;
  if (isAd && compliance.adErid.trim().length < 5) {
    toast.error("Для рекламы укажи токен ERID — без него публикация запрещена законом");
    return;
  }
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
      destination === "feed" ? (categoryTouched ? category : "feed")
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
        isAd,
        ageRating: compliance.ageRating,
        adErid: compliance.adErid,
        adAdvertiser: compliance.adAdvertiser,
        extraImages: compliance.extraImages,
        place: compliance.place,
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

export default publishEditorProject;
