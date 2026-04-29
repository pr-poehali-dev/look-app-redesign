const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:global.stun.twilio.com:3478" },
  { urls: "stun:stun.nextcloud.com:443" },
];

const OPEN_RELAY_TURN: RTCIceServer[] = [
  {
    urls: [
      "turn:relay1.expressturn.com:3478",
      "turn:relay1.expressturn.com:3478?transport=tcp",
    ],
    username: "ef9DCQR8YYBI3CQR4G",
    credential: "wRkVJxC1mMR8ZjHN",
  },
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turn:openrelay.metered.ca:443?transport=tcp",
      "turns:openrelay.metered.ca:443",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
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
  ...(envTurn.length > 0 ? envTurn : OPEN_RELAY_TURN),
];

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};