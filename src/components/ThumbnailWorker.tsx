import { useEffect, useRef } from "react";

const GET_VIDEOS_URL = "https://functions.poehali.dev/f58115ec-de09-405d-a2db-08fe1cd958e1";
const ADMIN_API_URL = "https://functions.poehali.dev/c578b52c-b9b6-47b3-9bcf-b6ab8405c4d7";

interface VideoItem {
  id: number;
  url: string;
  thumbnail: string | null;
}

// Снимает кадр из видео по blob URL
function captureFrameFromBlob(blobUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const vid = document.createElement("video");
    vid.muted = true;
    vid.playsInline = true;
    vid.preload = "auto";

    const finish = (b64: string | null) => {
      vid.src = "";
      vid.load();
      resolve(b64);
    };

    vid.addEventListener("error", () => finish(null), { once: true });

    vid.addEventListener("loadedmetadata", () => {
      vid.currentTime = Math.min(1.0, (vid.duration || 2) * 0.1);
    }, { once: true });

    vid.addEventListener("seeked", () => {
      if (vid.videoWidth === 0 || vid.videoHeight === 0) { finish(null); return; }
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(vid.videoWidth, 720);
        canvas.height = Math.round(canvas.width * vid.videoHeight / vid.videoWidth);
        const ctx = canvas.getContext("2d");
        if (!ctx) { finish(null); return; }
        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob || blob.size < 3000) { finish(null); return; }
          const reader = new FileReader();
          reader.onload = () => {
            const r = reader.result as string;
            finish(r.slice(r.indexOf(",") + 1));
          };
          reader.onerror = () => finish(null);
          reader.readAsDataURL(blob);
        }, "image/jpeg", 0.82);
      } catch { finish(null); }
    }, { once: true });

    vid.src = blobUrl;
    vid.load();
  });
}

// Обрабатывает одно видео: скачать → снять кадр → сохранить
async function processOne(video: VideoItem): Promise<boolean> {
  let blobUrl: string | null = null;
  try {
    const resp = await fetch(video.url);
    if (!resp.ok) return false;
    const blob = await resp.blob();
    blobUrl = URL.createObjectURL(blob);

    const b64 = await captureFrameFromBlob(blobUrl);
    if (!b64) return false;

    const res = await fetch(ADMIN_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "video_save_thumbnail", video_id: video.id, thumb_data: b64 }),
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }
}

// Фоновый воркер — запускается один раз при монтировании приложения
const ThumbnailWorker = () => {
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;

    const run = async () => {
      // Получаем все видео
      let videos: VideoItem[] = [];
      try {
        const r = await fetch(`${GET_VIDEOS_URL}?type=video`);
        const raw = await r.json();
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        videos = (data.videos || [])
          .filter((v: VideoItem) => !v.thumbnail)
          .map((v: VideoItem) => ({ id: v.id, url: v.url, thumbnail: v.thumbnail }));
      } catch { return; }

      if (videos.length === 0) return;

      // Обрабатываем по одному с паузой 2с между ними
      let processed = 0;
      for (const video of videos) {
        const ok = await processOne(video);
        if (ok) processed++;
        await new Promise((r) => setTimeout(r, 2000));
      }

      // После обработки — сигнализируем VideoGrid перезагрузиться
      if (processed > 0) {
        window.dispatchEvent(new CustomEvent("thumbnails-updated"));
      }
    };

    // Запускаем через 5с после загрузки чтобы не мешать основному контенту
    const t = setTimeout(run, 5000);
    return () => clearTimeout(t);
  }, []);

  return null;
};

export default ThumbnailWorker;