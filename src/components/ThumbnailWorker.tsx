import { useEffect, useRef } from "react";

const GET_VIDEOS_URL = "https://functions.poehali.dev/f58115ec-de09-405d-a2db-08fe1cd958e1";
const GEN_THUMBNAIL_URL = "https://functions.poehali.dev/be575f5c-eb60-4522-ad3e-1b6527c85abb";

interface VideoItem {
  id: number;
  url: string;
  thumbnail: string | null;
}

// Генерация thumbnail на сервере (OpenCV снимает кадр, нет CORS-проблем)
async function processOne(video: VideoItem): Promise<boolean> {
  try {
    const res = await fetch(GEN_THUMBNAIL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_url: video.url, video_id: video.id }),
    });
    if (!res.ok) return false;
    const raw = await res.json();
    const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
    return !!data.ok;
  } catch {
    return false;
  }
}

// Фоновый воркер — запускается один раз при монтировании приложения
const ThumbnailWorker = () => {
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;

    const run = async () => {
      // Получаем все видео без thumbnail
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

      // Обрабатываем по одному с паузой 1с между ними
      let processed = 0;
      for (const video of videos) {
        const ok = await processOne(video);
        if (ok) processed++;
        await new Promise((r) => setTimeout(r, 1000));
      }

      // После обработки — сигнализируем сеткам перезагрузиться
      if (processed > 0) {
        window.dispatchEvent(new CustomEvent("thumbnails-updated"));
      }
    };

    // Запускаем через 3с после загрузки чтобы не мешать основному контенту
    const t = setTimeout(run, 3000);
    return () => clearTimeout(t);
  }, []);

  return null;
};

export default ThumbnailWorker;
