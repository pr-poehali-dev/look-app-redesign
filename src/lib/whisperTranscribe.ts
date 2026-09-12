/**
 * Локальное распознавание речи прямо в браузере через Whisper (transformers.js).
 * Работает во всех современных браузерах (Chrome, Safari, Firefox), без сервера
 * и без оплаты. При первом вызове браузер скачивает модель (~290 Мб, whisper-base
 * fp32 — квантованные версии сейчас несовместимы с браузерным ONNX Runtime) и
 * кэширует её (Cache Storage), повторные расшифровки быстрые и офлайн.
 */

import { decodeToFloat32Mono16k } from "@/lib/audioDecode";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pipeline = (audio: Float32Array, options?: Record<string, unknown>) => Promise<any>;

let pipelinePromise: Promise<Pipeline> | null = null;

async function getPipeline(): Promise<Pipeline> {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      const pipe = await pipeline("automatic-speech-recognition", "onnx-community/whisper-base", {
        dtype: "fp32",
        device: "wasm",
      });
      return pipe as unknown as Pipeline;
    })().catch((e) => {
      pipelinePromise = null;
      throw e;
    });
  }
  return pipelinePromise;
}

/** Прогревает (скачивает и инициализирует) модель заранее, не дожидаясь первой расшифровки. */
export function warmupWhisper() {
  getPipeline().catch(() => {});
}

/**
 * Убирает "заезженную пластинку" — типичную галлюцинацию Whisper на тихом/шумном
 * аудио, когда модель бесконечно повторяет одно и то же слово или фразу.
 */
function normalizeWord(w: string): string {
  return w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function collapseRepeats(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length < 6) return text.trim();
  const norm = words.map(normalizeWord);

  for (let n = 1; n <= 4; n++) {
    let repeatCount = 1;
    for (let i = words.length - n; i >= n; i -= n) {
      const a = norm.slice(i, i + n).join(" ");
      const b = norm.slice(i - n, i).join(" ");
      if (a && a === b) repeatCount++;
      else break;
    }
    if (repeatCount >= 4) {
      const tailStart = words.length - n * repeatCount;
      const kept = words.slice(0, tailStart + n);
      return kept.join(" ").trim();
    }
  }
  return text.trim();
}

export async function transcribeBlobLocally(blob: Blob): Promise<string> {
  const samples = await decodeToFloat32Mono16k(blob);
  const pipe = await getPipeline();
  const result = await pipe(samples, {
    language: "russian",
    task: "transcribe",
    no_repeat_ngram_size: 3,
    repetition_penalty: 1.3,
  });
  const text = Array.isArray(result) ? result[0]?.text : result?.text;
  return collapseRepeats(text || "");
}