export const HQ_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
  sampleRate: 48000,
  sampleSize: 16,
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
        enc.maxBitrate = 64000;
        enc.priority = 'high';
        enc.networkPriority = 'high';
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
    return sdp.replace(/a=fmtp:(\d+) ([^\r\n]*opus[^\r\n]*)/gi, (_match, pt, rest) => {
      let updated = rest;
      const set = (key: string, value: string) => {
        if (new RegExp(`${key}=`).test(updated)) {
          updated = updated.replace(new RegExp(`${key}=[^;]*`), `${key}=${value}`);
        } else {
          updated += `;${key}=${value}`;
        }
      };
      set('stereo', '1');
      set('sprop-stereo', '1');
      set('maxaveragebitrate', '64000');
      set('maxplaybackrate', '48000');
      set('useinbandfec', '1');
      set('usedtx', '0');
      return `a=fmtp:${pt} ${updated}`;
    });
  } catch {
    return sdp;
  }
};
