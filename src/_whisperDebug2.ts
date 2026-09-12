import { pipeline } from "@huggingface/transformers";

export async function runDebug(log: (s: string) => void) {
  for (const dtype of ["q8", "fp32"]) {
    try {
      log(`--- Trying Xenova/whisper-tiny dtype=${dtype} ---`);
      const t0 = Date.now();
      const pipe = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny", {
        dtype,
        device: "wasm",
      } as Record<string, unknown>);
      log(`[${dtype}] LOADED in ${Date.now() - t0}ms`);

      const sampleRate = 16000;
      const numSamples = sampleRate * 2;
      const samples = new Float32Array(numSamples);
      for (let i = 0; i < numSamples; i++) samples[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.5;

      const t1 = Date.now();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (pipe as any)(samples, { language: "russian", task: "transcribe" });
      log(`[${dtype}] INFERENCE in ${Date.now() - t1}ms: ${JSON.stringify(result)}`);
    } catch (e) {
      log(`[${dtype}] FAILED: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
