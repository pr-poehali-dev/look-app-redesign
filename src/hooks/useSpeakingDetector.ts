import { useEffect, useState } from "react";

export const useSpeakingDetector = (stream: MediaStream | null | undefined, threshold = 18): boolean => {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!stream) {
      setSpeaking(false);
      return;
    }
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    let rafId = 0;
    let ctx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let cancelled = false;
    let lastChangeAt = 0;
    let lastSpeaking = false;

    try {
      const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      if (!Ctx) return;
      ctx = new Ctx();
      source = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (cancelled || !analyser) return;
        analyser.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i];
        const avg = sum / buf.length;
        const isSpeaking = avg > threshold;
        const now = performance.now();
        if (isSpeaking !== lastSpeaking) {
          if (isSpeaking || now - lastChangeAt > 500) {
            lastSpeaking = isSpeaking;
            lastChangeAt = now;
            setSpeaking(isSpeaking);
          }
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    } catch {
      /* noop */
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      try { source?.disconnect(); } catch { /* noop */ }
      try { analyser?.disconnect(); } catch { /* noop */ }
      try { ctx?.close(); } catch { /* noop */ }
    };
  }, [stream, threshold]);

  return speaking;
};
