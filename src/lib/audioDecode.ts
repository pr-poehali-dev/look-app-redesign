/**
 * Общие хелперы декодирования аудио/видео Blob в 16-битный PCM моно 16кГц.
 * Используется и для серверной расшифровки (Yandex SpeechKit), и для
 * локального распознавания речи в браузере (Whisper).
 */

const TARGET_RATE = 16000;

export async function decodeToFloat32Mono16k(blob: Blob): Promise<Float32Array> {
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
  return rendered.getChannelData(0);
}

export function floatTo16BitPCM(input: Float32Array): Uint8Array {
  const out = new Uint8Array(input.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let result = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    result += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(result);
}

export async function blobToPcm16Base64(blob: Blob): Promise<string> {
  const samples = await decodeToFloat32Mono16k(blob);
  const pcm = floatTo16BitPCM(samples);
  return bytesToBase64(pcm);
}
