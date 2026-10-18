import { useEffect } from "react";

export const useCallRingtone = (active: boolean) => {
  useEffect(() => {
    if (!active) return;
    let ctx: AudioContext | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    try {
      ctx = new AudioContext();
      const c = ctx;
      const master = c.createGain();
      master.gain.value = 1;
      master.connect(c.destination);

      const playNote = (freq: number, start: number, duration: number, volume = 0.25) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        const filter = c.createBiquadFilter();
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(master);
        osc.type = "triangle";
        filter.type = "lowpass";
        filter.frequency.value = 2000;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(volume, start + 0.02);
        gain.gain.linearRampToValueAtTime(volume * 0.7, start + duration * 0.6);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.start(start);
        osc.stop(start + duration);
      };

      const melody = () => {
        const now = c.currentTime;
        playNote(659.25, now + 0.0, 0.18);
        playNote(880.0, now + 0.2, 0.18);
        playNote(659.25, now + 0.5, 0.18);
        playNote(880.0, now + 0.7, 0.18);
        playNote(987.77, now + 1.0, 0.35);
      };

      c.resume().catch(() => {});
      melody();
      timer = setInterval(melody, 2200);
    } catch { /* ignore */ }

    return () => {
      if (timer) clearInterval(timer);
      if (ctx) {
        try { ctx.suspend().catch(() => {}); } catch { /* ignore */ }
        try { ctx.close().catch(() => {}); } catch { /* ignore */ }
      }
    };
  }, [active]);
};
