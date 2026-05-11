const isMobile = () => typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const isIOS = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);

export const HQ_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
  sampleRate: 48000,
  sampleSize: 16,
  ...(isMobile()
    ? {
        latency: 0.01,
      }
    : {}),
  // Vendor-prefixed hints (Chrome/Android)
  ...({
    googEchoCancellation: true,
    googEchoCancellation2: true,
    googAutoGainControl: true,
    googAutoGainControl2: true,
    googNoiseSuppression: true,
    googNoiseSuppression2: true,
    googHighpassFilter: true,
    googTypingNoiseDetection: true,
    googAudioMirroring: false,
  } as MediaTrackConstraints),
};

export const applyAudioTrackTuning = (stream: MediaStream | null | undefined) => {
  if (!stream) return;
  stream.getAudioTracks().forEach(track => {
    try {
      track.applyConstraints(HQ_AUDIO_CONSTRAINTS).catch(() => {});
    } catch {
      /* noop */
    }
  });
};

let audioCtxUnlocked = false;
export const unlockMobileAudio = async () => {
  if (audioCtxUnlocked) return;
  try {
    const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!Ctx) return;
    const ctx = new Ctx();
    if (ctx.state === 'suspended') await ctx.resume();
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    audioCtxUnlocked = true;
  } catch {
    /* noop */
  }
};

export const tuneRemoteAudioElement = (el: HTMLAudioElement | HTMLVideoElement | null | undefined) => {
  if (!el) return;
  try {
    el.volume = 1;
    el.muted = false;
    (el as HTMLAudioElement).autoplay = true;
    el.setAttribute('playsinline', 'true');
    el.setAttribute('webkit-playsinline', 'true');
    if (isIOS() && 'sinkId' in el) {
      // Force speaker output on iOS PWA when supported
      const anyEl = el as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
      anyEl.setSinkId?.('').catch(() => {});
    }
  } catch {
    /* noop */
  }
};

export const tuneAudioSenders = async (pc: RTCPeerConnection | null | undefined) => {
  if (!pc) return;
  try {
    const senders = pc.getSenders().filter(s => s.track && s.track.kind === 'audio');
    for (const sender of senders) {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings.forEach(enc => {
        // Низкий битрейт для устойчивости на плохом интернете
        enc.maxBitrate = isMobile() ? 16000 : 24000;
        enc.priority = 'high';
        enc.networkPriority = 'high';
        enc.adaptivePtime = true;
      });
      await sender.setParameters(params).catch(() => {});
    }
  } catch {
    /* noop */
  }
};

export const boostOpusInSdp = (sdp: string): string => {
  if (!sdp) return sdp;
  try {
    const mobile = isMobile();
    // Для слабого интернета — узкополосный, но устойчивый Opus с FEC и DTX
    const bitrate = mobile ? '16000' : '24000';
    return sdp.replace(/a=fmtp:(\d+) ([^\r\n]*opus[^\r\n]*)/gi, (_match, pt, rest) => {
      let updated = rest;
      const set = (key: string, value: string) => {
        if (new RegExp(`${key}=`).test(updated)) {
          updated = updated.replace(new RegExp(`${key}=[^;]*`), `${key}=${value}`);
        } else {
          updated += `;${key}=${value}`;
        }
      };
      set('stereo', '0');
      set('sprop-stereo', '0');
      set('maxaveragebitrate', bitrate);
      set('maxplaybackrate', '16000');
      set('useinbandfec', '1');
      set('usedtx', '1');
      set('cbr', '0');
      set('minptime', '60');
      set('ptime', '60');
      return `a=fmtp:${pt} ${updated}`;
    });
  } catch {
    return sdp;
  }
};