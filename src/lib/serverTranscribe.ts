/**
 * Серверная расшифровка речи через Yandex SpeechKit (backend chat-api, module=transcribe).
 * В отличие от локального Whisper (whisperTranscribe.ts), не требует скачивания
 * тяжёлой модели в браузере — работает одинаково быстро и надёжно на телефонах
 * и на слабых устройствах, где локальная модель не помещается в память.
 */

import { blobToPcm16Base64 } from "@/lib/audioDecode";

const API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

export async function transcribeBlobOnServer(blob: Blob): Promise<string> {
  const audio = await blobToPcm16Base64(blob);
  const res = await fetch(`${API}?module=transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio, mime: "audio/pcm16" }),
  });
  const raw = await res.json();
  const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
  if (data.error) throw new Error(data.error);
  return (data.text || "").trim();
}
