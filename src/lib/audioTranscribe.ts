/**
 * Конвертация записанного аудио/видео в 16-битный PCM моно 16кГц
 * и отправка на распознавание речи (SaluteSpeech) через backend.
 */

const TARGET_RATE = 16000;

function floatTo16BitPCM(input: Float32Array): Uint8Array {
  const out = new Uint8Array(input.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let result = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    result += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(result);
}

async function blobToPcm16Base64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    ctx.close().catch(() => {});
  }

  const duration = decoded.duration;
  const offlineCtx = new OfflineAudioContext(1, Math.ceil(duration * TARGET_RATE), TARGET_RATE);
  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(offlineCtx.destination);
  source.start();
  const rendered = await offlineCtx.startRendering();
  const samples = rendered.getChannelData(0);
  const pcm = floatTo16BitPCM(samples);
  return bytesToBase64(pcm);
}

const TRANSCRIBE_API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

export async function transcribeAudioBlob(blob: Blob, userId: string): Promise<string> {
  const base64 = await blobToPcm16Base64(blob);
  const res = await fetch(`${TRANSCRIBE_API}?module=transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": userId },
    body: JSON.stringify({ audio: base64, mime: "audio/pcm16" }),
  });
  const raw = await res.json();
  const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
  if (data.text) return data.text as string;
  throw new Error(data.error || "Не удалось распознать речь");
}
