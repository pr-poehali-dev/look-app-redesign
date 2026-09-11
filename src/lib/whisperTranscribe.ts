/**
 * Локальное распознавание речи прямо в браузере через Whisper (transformers.js).
 * Работает во всех современных браузерах (Chrome, Safari, Firefox), без сервера
 * и без оплаты. При первом вызове браузер скачивает модель (~40-80 Мб) и кэширует
 * её (Cache Storage), повторные расшифровки быстрые и офлайн.
 */

import { decodeToFloat32Mono16k } from "@/lib/audioDecode";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pipeline = (audio: Float32Array, options?: Record<string, unknown>) => Promise<any>;

let pipelinePromise: Promise<Pipeline> | null = null;

async function getPipeline(): Promise<Pipeline> {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      const pipe = await pipeline("automatic-speech-recognition", "onnx-community/whisper-tiny", {
        dtype: "q8",
      });
      return pipe as unknown as Pipeline;
    })();
  }
  return pipelinePromise;
}

/** Прогревает (скачивает и инициализирует) модель заранее, не дожидаясь первой расшифровки. */
export function warmupWhisper() {
  getPipeline().catch(() => {});
}

export async function transcribeBlobLocally(blob: Blob): Promise<string> {
  const samples = await decodeToFloat32Mono16k(blob);
  const pipe = await getPipeline();
  const result = await pipe(samples, { language: "russian", task: "transcribe" });
  const text = Array.isArray(result) ? result[0]?.text : result?.text;
  return (text || "").trim();
}
