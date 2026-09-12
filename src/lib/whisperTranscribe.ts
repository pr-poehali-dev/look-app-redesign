/**
 * Локальное распознавание речи прямо в браузере через Whisper (transformers.js).
 * Работает во всех современных браузерах (Chrome, Safari, Firefox), полностью
 * офлайн — без сервера, без ключей и без оплаты. При первом вызове браузер
 * скачивает модель и кэширует её (Cache Storage), повторные расшифровки быстрые.
 *
 * Квантованные версии Whisper (q8/int8/fp16) сейчас несовместимы с браузерным
 * ONNX Runtime (падают с ошибкой TransposeDQWeightsForMatMulNBits), поэтому
 * единственный рабочий вариант — тяжёлая модель fp32. На телефонах (особенно
 * iOS Safari) память WebAssembly сильно ограничена, там используем whisper-base
 * (~290 Мб). На десктопе — более точную whisper-small (~970 Мб).
 *
 * Скачивание такой большой модели может оборваться на нестабильном интернете —
 * тогда пробуем более лёгкую модель (которая весит меньше и вероятнее скачается),
 * вместо того чтобы сразу показывать пользователю ошибку.
 *
 * Сам движок для запуска модели (ONNX Runtime WASM) по умолчанию грузится с
 * cdn.jsdelivr.net — этот CDN у части пользователей открывается нестабильно,
 * из-за чего распознавание речи не запускалось вовсе. Раздаём эти файлы прямо
 * со своего домена (public/onnx-wasm), чтобы не зависеть от внешнего CDN.
 *
 * Chrome (особенно на Android и в целом строже других браузеров) ограничивает
 * объём памяти, который вкладка может выделить под WebAssembly. Модель может
 * успешно ЗАГРУЗИТЬСЯ, но затем упасть с нехваткой памяти прямо ВО ВРЕМЯ
 * распознавания — поэтому откат на более лёгкую модель нужен не только при
 * ошибке загрузки, а на каждом шаге, включая сам вызов распознавания. Если
 * модель падает во время работы, она помечается "сломанной" и больше не
 * используется в этой вкладке — следующая попытка сразу идёт на модель полегче.
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

// От большей к меньшей — если модель не скачалась ИЛИ упала во время распознавания
// (нехватка памяти в браузере), пробуем следующую, более лёгкую
const MODEL_CHAIN = isMobileDevice()
  ? ["onnx-community/whisper-base", "onnx-community/whisper-tiny"]
  : ["onnx-community/whisper-small", "onnx-community/whisper-base", "onnx-community/whisper-tiny"];

const pipelineCache = new Map<string, Promise<Pipeline>>();
const brokenModels = new Set<string>();
let wasmConfigured = false;

function configureLocalWasm(env: { backends: { onnx: { wasm: { wasmPaths?: unknown } } } }, isSafari: boolean) {
  if (wasmConfigured) return;
  wasmConfigured = true;
  env.backends.onnx.wasm.wasmPaths = isSafari
    ? { mjs: "/onnx-wasm/ort-wasm-simd-threaded.mjs", wasm: "/onnx-wasm/ort-wasm-simd-threaded.wasm" }
    : {
        mjs: "/onnx-wasm/ort-wasm-simd-threaded.asyncify.mjs",
        wasm: "/onnx-wasm/ort-wasm-simd-threaded.asyncify.wasm",
      };
}

async function getPipelineFor(modelId: string): Promise<Pipeline> {
  let promise = pipelineCache.get(modelId);
  if (!promise) {
    promise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      configureLocalWasm(env as any, isSafari);
      const pipe = await pipeline("automatic-speech-recognition", modelId, {
        dtype: "fp32",
        device: "wasm",
      });
      return pipe as unknown as Pipeline;
    })();
    pipelineCache.set(modelId, promise);
  }
  return promise;
}

/** Прогревает (скачивает и инициализирует) самую тяжёлую модель заранее, не дожидаясь первой расшифровки. */
export function warmupWhisper() {
  const modelId = MODEL_CHAIN[0];
  getPipelineFor(modelId).catch(() => {
    pipelineCache.delete(modelId);
  });
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

// Если распознавание зависло дольше этого — считаем модель нерабочей на этом
// устройстве (например, память браузера "задыхается") и переходим на более лёгкую,
// вместо того чтобы бесконечно висеть с крутящимся индикатором
const INFERENCE_TIMEOUT_MS = 90_000;

async function runInference(pipe: Pipeline, samples: Float32Array): Promise<string> {
  const inference = pipe(samples, {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await Promise.race([
    inference,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("whisper inference timeout")), INFERENCE_TIMEOUT_MS),
    ),
  ]);
  const text = Array.isArray(result) ? result[0]?.text : result?.text;
  return collapseRepeats(text || "");
}

/**
 * true, если основная (самая точная) модель из цепочки хоть раз подвела в этой
 * вкладке и распознавание перешло на облегчённую — используется, чтобы один раз
 * предупредить пользователя, почему расшифровка может быть менее точной.
 */
export function isUsingFallbackModel(): boolean {
  return brokenModels.has(MODEL_CHAIN[0]);
}

export async function transcribeBlobLocally(blob: Blob): Promise<string> {
  const rawSamples = await decodeToFloat32Mono16k(blob);
  const samples = trimSilence(rawSamples);

  // Меньше ~0.3с осмысленного звука — говорить было явно нечего, не гадаем
  if (samples.length < SAMPLE_RATE * 0.3) return "";

  let lastError: unknown;
  for (const modelId of MODEL_CHAIN) {
    if (brokenModels.has(modelId)) continue;
    try {
      const pipe = await getPipelineFor(modelId);
      return await runInference(pipe, samples);
    } catch (e) {
      console.error(`[whisperTranscribe] ${modelId} failed, trying lighter model`, e);
      // Модель либо не смогла загрузиться, либо браузеру не хватило памяти прямо
      // во время распознавания — в обоих случаях с ней больше нет смысла возиться
      // в этой вкладке, сразу переходим на более лёгкую
      brokenModels.add(modelId);
      pipelineCache.delete(modelId);
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Не удалось распознать речь ни одной моделью");
}