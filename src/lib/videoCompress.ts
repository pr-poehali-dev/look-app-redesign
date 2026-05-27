/**
 * Сжатие видео в браузере через canvas + MediaRecorder.
 * Работает в Chrome / Edge / Firefox / Safari 14.1+ / Android.
 * Возвращает исходный файл, если сжатие не удалось или браузер не поддерживает.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
  onProgress?: (percent: number) => void;
}

const DEFAULTS: Required<Omit<CompressOptions, "onProgress">> = {
  maxWidth: 720,
  maxHeight: 1280,
  videoBitsPerSecond: 1_200_000,
  audioBitsPerSecond: 96_000,
};

function pickMimeType(): string | null {
  const candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  if (typeof MediaRecorder === "undefined") return null;
  for (const t of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch { /* ignore */ }
  }
  return null;
}

function loadVideo(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "auto";
    v.muted = true;
    v.playsInline = true;
    v.src = url;
    void url;
    v.onloadedmetadata = () => {
      // Ждём первого кадра
      v.currentTime = 0.0;
    };
    v.onseeked = () => resolve(v);
    v.onerror = () => reject(new Error("Не удалось прочитать видео"));
    // Fallback: иногда onseeked не срабатывает
    setTimeout(() => {
      if (v.videoWidth && v.videoHeight) resolve(v);
    }, 1500);
  });
}

export async function compressVideo(
  file: File,
  opts: CompressOptions = {},
): Promise<{ file: File; compressed: boolean }> {
  const cfg = { ...DEFAULTS, ...opts };
  const mime = pickMimeType();

  // Браузер не поддерживает MediaRecorder для нужных форматов — возвращаем исходник
  if (!mime || typeof MediaRecorder === "undefined") {
    return { file, compressed: false };
  }

  let video: HTMLVideoElement;
  try {
    video = await loadVideo(file);
  } catch {
    return { file, compressed: false };
  }

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) {
    URL.revokeObjectURL(video.src);
    return { file, compressed: false };
  }

  // Целевые размеры с сохранением пропорций
  const scale = Math.min(cfg.maxWidth / vw, cfg.maxHeight / vh, 1);
  const tw = Math.round((vw * scale) / 2) * 2;
  const th = Math.round((vh * scale) / 2) * 2;

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(video.src);
    return { file, compressed: false };
  }

  // Поток с canvas
  const fps = 30;
  const videoStream = (canvas as HTMLCanvasElement).captureStream(fps);

  // Аудиодорожка из элемента <video> (если доступна)
  try {
    const v = video as unknown as { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };
    const src: MediaStream | undefined = v.captureStream
      ? v.captureStream()
      : v.mozCaptureStream
        ? v.mozCaptureStream()
        : undefined;
    if (src) {
      src.getAudioTracks().forEach((t) => videoStream.addTrack(t));
    }
  } catch { /* без аудио */ }

  const recorder = new MediaRecorder(videoStream, {
    mimeType: mime,
    videoBitsPerSecond: cfg.videoBitsPerSecond,
    audioBitsPerSecond: cfg.audioBitsPerSecond,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  return await new Promise((resolve) => {
    const duration = isFinite(video.duration) ? video.duration : 0;
    let rafId = 0;
    let finished = false;

    const cleanup = () => {
      cancelAnimationFrame(rafId);
      try { video.pause(); } catch { /* ignore */ }
      URL.revokeObjectURL(video.src);
    };

    const finish = async () => {
      if (finished) return;
      finished = true;
      try {
        if (recorder.state !== "inactive") recorder.stop();
        await stopped;
      } catch { /* ignore */ }
      cleanup();
      if (chunks.length === 0) {
        resolve({ file, compressed: false });
        return;
      }
      const ext = mime.includes("mp4") ? "mp4" : "webm";
      const out = new Blob(chunks, { type: mime.split(";")[0] });
      const outFile = new File([out], file.name.replace(/\.[^.]+$/, "") + `.${ext}`, {
        type: out.type,
        lastModified: Date.now(),
      });
      // Если сжатие сделало хуже — отдаём исходник
      if (outFile.size >= file.size * 0.95) {
        resolve({ file, compressed: false });
      } else {
        resolve({ file: outFile, compressed: true });
      }
    };

    const tick = () => {
      if (finished) return;
      ctx.drawImage(video, 0, 0, tw, th);
      if (duration > 0 && cfg.onProgress) {
        cfg.onProgress(Math.min(100, Math.round((video.currentTime / duration) * 100)));
      }
      if (video.ended || video.paused) {
        finish();
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    video.onended = () => finish();
    video.onerror = () => finish();

    try {
      recorder.start(250);
      video.play()
        .then(() => { rafId = requestAnimationFrame(tick); })
        .catch(() => finish());
    } catch {
      cleanup();
      resolve({ file, compressed: false });
    }

    // Жёсткий таймаут на случай зависших потоков
    setTimeout(() => finish(), Math.max(60_000, duration * 1000 + 15_000));
  });
}

/**
 * Загрузка большого файла напрямую в S3 через presigned URL.
 * Минует cloud function — нет лимита 6 МБ.
 */
const PRESIGN_URL = "https://functions.poehali.dev/1d249960-01f5-4332-8355-9c5541159d49";

export interface DirectUploadMeta {
  category: string;
  destinations?: string[];
  description?: string;
  hashtags?: string;
  author?: string;
  handle?: string;
  user_id?: string;
}

export async function uploadFileDirect(
  file: File,
  meta: DirectUploadMeta,
  onProgress?: (percent: number) => void,
): Promise<{ id: number; url: string; type: string }> {
  const ext = (file.name.split(".").pop() || (file.type.startsWith("video") ? "mp4" : "jpg")).toLowerCase();
  const contentType = file.type || (file.type.startsWith("video") ? "video/mp4" : "image/jpeg");

  // 1) Получаем presigned URL
  const presignRes = await fetch(PRESIGN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "presign", ext, content_type: contentType }),
  });
  if (!presignRes.ok) throw new Error(`presign failed: ${presignRes.status}`);
  const presignRaw = await presignRes.json();
  const presign = typeof presignRaw.body === "string" ? JSON.parse(presignRaw.body) : presignRaw;
  if (!presign.upload_url || !presign.cdn_url) throw new Error("presign: bad response");

  // 2) Загружаем напрямую в S3 (XHR — есть прогресс)
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presign.upload_url, true);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`S3 upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("S3 upload network error"));
    xhr.send(file);
  });

  // 3) Регистрируем запись в БД
  const regRes = await fetch(PRESIGN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "register",
      cdn_url: presign.cdn_url,
      type: contentType,
      media_type: contentType.startsWith("video") ? "video" : "image",
      category: meta.category,
      description: meta.description || "",
      hashtags: meta.hashtags || "",
      author: meta.author || "Я",
      handle: meta.handle || "user",
      user_id: meta.user_id || "anonymous",
    }),
  });
  if (!regRes.ok) throw new Error(`register failed: ${regRes.status}`);
  const regRaw = await regRes.json();
  const reg = typeof regRaw.body === "string" ? JSON.parse(regRaw.body) : regRaw;
  if (!reg.id || !reg.url) throw new Error("register: bad response");
  return reg;
}