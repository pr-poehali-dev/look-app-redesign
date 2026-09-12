/**
 * Локальное распознавание речи прямо в браузере через Whisper (transformers.js).
 * Работает во всех современных браузерах (Chrome, Safari, Firefox), полностью
 * офлайн — без сервера, без ключей и без оплаты. При первом вызове браузер
 * скачивает модель и кэширует её (Cache Storage), повторные расшифровки быстрые.
 *
 * На телефонах (особенно iOS Safari) память WebAssembly сильно ограничена,
 * поэтому используем whisper-base (~290 Мб, fp32 — квантованные версии сейчас
 * несовместимы с браузерным ONNX Runtime). На десктопе памяти достаточно —
 * там используем более точную whisper-small (~970 Мб) для лучшего качества
 * распознавания русской речи.
 */

import { decodeToFloat32Mono16k } from "@/lib/audioDecode";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pipeline = (audio: Float32Array, options?: Record<string, unknown>) => Promise<any>;

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Mac/i.test(navigator.userAgent))
  );
}

const MODEL_ID = isMobileDevice() ? "onnx-community/whisper-base" : "onnx-community/whisper-small";

let pipelinePromise: Promise<Pipeline> | null = null;

async function getPipeline(): Promise<Pipeline> {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      const pipe = await pipeline("automatic-speech-recognition", MODEL_ID, {
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

const SAMPLE_RATE = 16000;

/**
 * Обрезает тишину в начале/конце записи и полностью отбрасывает беззвучные клипы.
 * Whisper на тишине/шуме часто "галлюцинирует" — придумывает случайные слова или
 * типовые фразы из обучающих субтитров, поэтому лишнюю тишину лучше не скармливать модели.
 */
function trimSilence(samples: Float32Array): Float32Array {
  const frameSize = Math.round(SAMPLE_RATE * 0.02); // 20 мс
  const frames = Math.floor(samples.length / frameSize);
  if (frames === 0) return samples;

  const rms: number[] = new Array(frames);
  let maxRms = 0;
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    const start = f * frameSize;
    const end = start + frameSize;
    for (let i = start; i < end; i++) sum += samples[i] * samples[i];
    const value = Math.sqrt(sum / frameSize);
    rms[f] = value;
    if (value > maxRms) maxRms = value;
  }

  // Клип практически без звука — реальной речи в нём нет, отправлять в Whisper бессмысленно
  if (maxRms < 0.004) return new Float32Array(0);

  const threshold = Math.max(maxRms * 0.08, 0.006);
  let first = -1;
  let last = -1;
  for (let f = 0; f < frames; f++) {
    if (rms[f] >= threshold) {
      if (first === -1) first = f;
      last = f;
    }
  }
  if (first === -1) return new Float32Array(0);

  const marginFrames = Math.round(0.3 / 0.02); // запас 300 мс с каждой стороны
  const startFrame = Math.max(0, first - marginFrames);
  const endFrame = Math.min(frames, last + marginFrames + 1);
  return samples.slice(startFrame * frameSize, endFrame * frameSize);
}

export async function transcribeBlobLocally(blob: Blob): Promise<string> {
  const rawSamples = await decodeToFloat32Mono16k(blob);
  const samples = trimSilence(rawSamples);

  // Меньше ~0.3с осмысленного звука — говорить было явно нечего, не гадаем
  if (samples.length < SAMPLE_RATE * 0.3) return "";

  const pipe = await getPipeline();
  const result = await pipe(samples, {
    language: "russian",
    task: "transcribe",
    // Без chunk_length_s Whisper молча обрезает всё, что длиннее 30 секунд,
    // и расшифровывает только первый кусок — из-за этого длинные голосовые
    // и видеосообщения превращались в "что попало", не совпадающее с текстом.
    chunk_length_s: 30,
    stride_length_s: 5,
    no_repeat_ngram_size: 3,
    repetition_penalty: 1.3,
  });
  const text = Array.isArray(result) ? result[0]?.text : result?.text;
  return collapseRepeats(text || "");
}