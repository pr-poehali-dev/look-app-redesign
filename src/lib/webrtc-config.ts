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

const buildTurnFromEnv = (): RTCIceServer[] => {
  const urls = import.meta.env.VITE_TURN_URL as string | undefined;
  const username = import.meta.env.VITE_TURN_USERNAME as string | undefined;
  const credential = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined;
  if (!urls) return [];
  const list = urls.split(",").map((u) => u.trim()).filter(Boolean);
  return [{ urls: list, username, credential }];
};

export const ICE_SERVERS: RTCIceServer[] = [
  ...STUN_SERVERS,
  ...buildTurnFromEnv(),
];

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 4,
};
