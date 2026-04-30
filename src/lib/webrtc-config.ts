const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

const PUBLIC_TURN: RTCIceServer[] = [
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turns:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:global.relay.metered.ca:80",
    username: "e8c1e8a1f8b6e4c0e0a0a0a0",
    credential: "g+Tn0z0e8a1f8b6e4c0e0",
  },
  {
    urls: "turn:relay1.expressturn.com:3478",
    username: "ef9DCQR8YYBI3CQR4G",
    credential: "wRkVJxC1mMR8ZjHN",
  },
];

const buildTurnFromEnv = (): RTCIceServer[] => {
  const urls = import.meta.env.VITE_TURN_URL as string | undefined;
  const username = import.meta.env.VITE_TURN_USERNAME as string | undefined;
  const credential = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined;
  if (!urls) return [];
  const list = urls.split(",").map((u) => u.trim()).filter(Boolean);
  return [{ urls: list, username, credential }];
};

const envTurn = buildTurnFromEnv();

export const ICE_SERVERS: RTCIceServer[] = [
  ...STUN_SERVERS,
  ...(envTurn.length > 0 ? envTurn : PUBLIC_TURN),
];

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};
