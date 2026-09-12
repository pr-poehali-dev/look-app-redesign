/**
 * Расшифровка голосовых и видео-сообщений на сервере через Yandex SpeechKit.
 * В отличие от локального распознавания в браузере (Whisper), не зависит от
 * памяти и мощности устройства пользователя и не требует скачивать модель
 * с huggingface.co (который у части провайдеров открывается нестабильно) —
 * работает одинаково быстро и стабильно на любом телефоне и в любом браузере.
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
  if (!res.ok) throw new Error(`transcribe ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return (data.text || "").trim();
}
