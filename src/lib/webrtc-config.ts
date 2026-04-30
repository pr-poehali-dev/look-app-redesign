const ICE_API = "https://functions.poehali.dev/53c7b2af-c5ea-4c37-bc28-154737d35d87";

const FALLBACK_STUN: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

let cachedServers: RTCIceServer[] | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30 * 60 * 1000;

export const fetchIceServers = async (): Promise<RTCIceServer[]> => {
  const now = Date.now();
  if (cachedServers && now - cachedAt < CACHE_TTL_MS) return cachedServers;
  try {
    const res = await fetch(ICE_API);
    const raw = await res.json();
    const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
    if (Array.isArray(data?.iceServers) && data.iceServers.length > 0) {
      cachedServers = data.iceServers;
      cachedAt = now;
      return data.iceServers;
    }
  } catch (e) { void e; }
  return FALLBACK_STUN;
};

export const getRtcConfig = async (): Promise<RTCConfiguration> => {
  const iceServers = await fetchIceServers();
  return {
    iceServers,
    iceCandidatePoolSize: 10,
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
  };
};

export const ICE_SERVERS: RTCIceServer[] = FALLBACK_STUN;

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: FALLBACK_STUN,
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};
