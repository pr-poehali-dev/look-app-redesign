/**
 * Загрузка голосовых и видео-сообщений чата в S3 чанками через cloud function.
 * Не хранит большие base64-данные в самом сообщении — в чат уходит только ссылка на файл.
 */
const CHUNKED_URL = "https://functions.poehali.dev/25a6b99d-32f3-45a4-baf7-a088013ca292";
const CHUNK_SIZE = 1 * 1024 * 1024;

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
  try {
    const res = await fetch(CHUNKED_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`upload ${payload.action} ${res.status}`);
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new Error(`upload ${payload.action}: invalid JSON`);
    }
    if (typeof raw.body === "string") {
      try {
        return JSON.parse(raw.body as string);
      } catch {
        throw new Error(`upload ${payload.action}: invalid inner JSON`);
      }
    }
    return raw;
  } catch (e) {
    if (attempt < 3 && payload.action === "chunk") {
      await new Promise((r) => setTimeout(r, 600 * attempt));
      return postJSON(payload, attempt + 1);
    }
    throw e;
  }
}

export async function uploadChatMedia(blob: Blob, ext: string, contentType: string): Promise<string> {
  const init = await postJSON({ action: "init", ext, content_type: contentType });
  const uploadId = init.upload_id as string | undefined;
  const key = init.key as string | undefined;
  if (!uploadId || !key) throw new Error("init: bad response");

  const totalParts = Math.max(1, Math.ceil(blob.size / CHUNK_SIZE));
  for (let i = 0; i < totalParts; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, blob.size);
    const data = await blobToBase64(blob.slice(start, end));
    await postJSON({ action: "chunk", upload_id: uploadId, part_number: i + 1, data });
  }

  const finish = await postJSON({
    action: "finish",
    upload_id: uploadId,
    key,
    total_parts: totalParts,
    content_type: contentType,
  });
  const url = finish.url as string | undefined;
  if (!url) throw new Error("finish: bad response");
  return url;
}
