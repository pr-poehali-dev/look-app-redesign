type ImportMetaEnv = { VITE_SIGNALING_URL?: string; VITE_SFU_URL?: string };
const env = (import.meta as unknown as { env?: ImportMetaEnv }).env || {};

export const SIGNALING_URL = env.VITE_SIGNALING_URL || 'https://signal.look.com.ru';
export const SFU_URL = env.VITE_SFU_URL || 'https://sfu.look.com.ru';