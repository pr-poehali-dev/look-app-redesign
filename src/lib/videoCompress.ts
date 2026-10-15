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

  if (file.size > 600 * 1024 * 1024) {
    return { file, compressed: false };
  }

  let video: HTMLVideoElement;
  try {
    video = await loadVideo(file);
  } catch {
    return { file, compressed: false };
  }

  if (isFinite(video.duration) && video.duration > 300) {
    URL.revokeObjectURL(video.src);
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
      const playedAll = video.ended || duration <= 0 || video.currentTime >= duration - 1;
      cleanup();
      if (chunks.length === 0 || !playedAll) {
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
 * Загрузка файлов любого размера чанками через cloud function.
 * Никаких CORS-проблем, никакого 6 МБ лимита — файл режется на куски по 3 МБ
 * и собирается на бэкенде в финальный объект S3.
 */
const CHUNKED_URL = "https://functions.poehali.dev/25a6b99d-32f3-45a4-baf7-a088013ca292";
// 1 МБ * 1.37 (base64) ≈ 1.4 МБ JSON body. С запасом до лимита 6 МБ.
const CHUNK_SIZE = 1 * 1024 * 1024;

export interface UploadProductMeta {
  title: string;
  price: number;
  old_price?: number;
  image?: string;
  promo_code?: string;
  product_url?: string;
}

export interface DirectUploadMeta {
  category: string;
  destinations?: string[];
  description?: string;
  hashtags?: string;
  author?: string;
  handle?: string;
  user_id?: string;
  thumbData?: string; // base64 jpeg кадр для превью видео
  templateId?: string | null;
  products?: UploadProductMeta[];
  isAd?: boolean;
  ageRating?: string;
  adErid?: string;
  adAdvertiser?: string;
  extraImages?: string[];
  place?: string;
}

const isSlowConn = (): boolean => {
  const c = (navigator as unknown as { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
  return !!c && (!!c.saveData || c.effectiveType === "2g" || c.effectiveType === "slow-2g");
};

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result as string;
      const idx = r.indexOf(",");
      resolve(idx >= 0 ? r.slice(idx + 1) : r);
    };
    reader.onerror = () => reject(reader.error || new Error("FileReader error"));
    reader.readAsDataURL(blob);
  });
}

async function postJSON(payload: Record<string, unknown>, attempt = 1): Promise<Record<string, unknown>> {
  const action = String(payload.action || "?");
  try {
    const res = await fetch(CHUNKED_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`[upload] ${action} HTTP ${res.status}:`, text.slice(0, 500));
      throw new Error(`upload ${action} ${res.status}`);
    }
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(text);
    } catch {
      console.error(`[upload] ${action} not JSON:`, text.slice(0, 500));
      throw new Error(`upload ${action}: invalid JSON response`);
    }
    if (typeof raw.body === "string") {
      try {
        return JSON.parse(raw.body as string);
      } catch {
        console.error(`[upload] ${action} inner body not JSON:`, (raw.body as string).slice(0, 500));
        throw new Error(`upload ${action}: invalid inner JSON`);
      }
    }
    return raw;
  } catch (e) {
    if (attempt < 6 && (action === "chunk" || action === "init" || action === "abort")) {
      console.warn(`[upload] retry chunk attempt ${attempt + 1}`, e);
      await new Promise((r) => setTimeout(r, Math.min(800 * attempt * attempt, 8000)));
      return postJSON(payload, attempt + 1);
    }
    throw e;
  }
}

async function makeImageThumb(file: File, maxSide = 640): Promise<string | undefined> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
    const b64 = dataUrl.split(",")[1];
    return b64 || undefined;
  } catch {
    return undefined;
  }
}

export async function uploadExtraImage(file: File): Promise<string> {
  const reg = await uploadFileDirect(file, { category: "feed" } as DirectUploadMeta, undefined, true);
  return reg.url;
}

export async function uploadFileDirect(
  file: File,
  meta: DirectUploadMeta,
  onProgress?: (percent: number) => void,
  skipRegister = false,
): Promise<{ id: number; url: string; thumb?: string; type: string }> {
  const ext = (file.name.split(".").pop() || (file.type.startsWith("video") ? "mp4" : "jpg")).toLowerCase();
  const contentType = file.type || (file.type.startsWith("video") ? "video/mp4" : "image/jpeg");

  if (!skipRegister && !meta.thumbData && file.type.startsWith("image/") && file.type !== "image/gif") {
    meta = { ...meta, thumbData: await makeImageThumb(file) };
  }

  console.info(`[upload] start: ${file.name}, ${(file.size / 1024 / 1024).toFixed(2)} MB, type=${contentType}`);

  // 1) Инициализация
  const init = await postJSON({ action: "init", ext, content_type: contentType });
  const uploadId = init.upload_id as string | undefined;
  const key = init.key as string | undefined;
  if (!uploadId || !key) {
    console.error("[upload] init bad response:", init);
    throw new Error("init: bad response");
  }
  console.info(`[upload] init ok: upload_id=${uploadId}, key=${key}`);

  // 2) Грузим чанки параллельно (по 3), каждый с повторами
  const totalParts = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
  console.info(`[upload] chunks=${totalParts}, chunk_size=${CHUNK_SIZE}`);
  let doneParts = 0;
  let nextPart = 0;
  let failed: unknown = null;
  const worker = async () => {
    while (!failed) {
      const i = nextPart++;
      if (i >= totalParts) return;
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      try {
        const data = await blobToBase64(file.slice(start, end));
        await postJSON({ action: "chunk", upload_id: uploadId, part_number: i + 1, data });
      } catch (e) {
        failed = e;
        return;
      }
      doneParts += 1;
      if (onProgress) onProgress(Math.round((doneParts / totalParts) * 95));
    }
  };
  const concurrency = Math.min(totalParts, isSlowConn() ? 2 : 3);
  await Promise.all(Array.from({ length: concurrency }, worker));
  if (failed) {
    console.error("[upload] chunk loop failed:", failed);
    try { await postJSON({ action: "abort", upload_id: uploadId, total_parts: totalParts }); } catch { /* ignore */ }
    throw failed;
  }

  // 3) Финал
  const finish = await postJSON({
    action: "finish",
    upload_id: uploadId,
    key,
    total_parts: totalParts,
    content_type: contentType,
    thumb_data: meta.thumbData || null,
    meta: skipRegister ? null : {
      category: meta.category,
      description: meta.description || "",
      hashtags: meta.hashtags || "",
      author: meta.author || "Я",
      handle: meta.handle || "user",
      user_id: meta.user_id || "anonymous",
      template_id: meta.templateId || null,
      products: meta.products || [],
      is_ad: !!meta.isAd,
      age_rating: meta.ageRating || "12+",
      ad_erid: meta.isAd ? (meta.adErid || "") : "",
      ad_advertiser: meta.isAd ? (meta.adAdvertiser || "") : "",
      extra_images: meta.extraImages || [],
      place: meta.place || "",
    },
  });
  const finalUrl = finish.url as string | undefined;
  const finalId = (finish.id as number | undefined) ?? (skipRegister ? 0 : undefined);
  if (!finalUrl || (finalId === undefined)) {
    console.error("[upload] finish bad response:", finish);
    throw new Error("finish: bad response");
  }
  if (onProgress) onProgress(100);
  console.info(`[upload] done: id=${finalId}, url=${finalUrl}, thumb=${finish.thumb || "none"}`);
  return {
    id: finalId,
    url: finalUrl,
    thumb: (finish.thumb as string) || undefined,
    type: (finish.type as string) || (contentType.startsWith("video") ? "video" : "image"),
  };
}