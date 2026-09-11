/**
 * Обёртка над браузерным Web Speech API (SpeechRecognition) для расшифровки
 * речи "вживую" во время записи голосового/видео-сообщения.
 * Работает бесплатно и без ключей, но только в Chrome / Яндекс.Браузере.
 */

interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternative;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
export interface LiveSpeechRecognizer {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => LiveSpeechRecognizer;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isLiveSpeechSupported(): boolean {
  return !!getCtor();
}

/**
 * Создаёт и запускает распознаватель речи. Возвращает объект с методом stop(),
 * который останавливает распознавание и возвращает накопленный текст (с небольшой
 * задержкой, чтобы дождаться последнего финального результата).
 */
export function startLiveSpeechRecognition(): { stop: () => Promise<string> } | null {
  const Ctor = getCtor();
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = "ru-RU";
  rec.continuous = true;
  rec.interimResults = false;

  let text = "";
  rec.onresult = (e) => {
    let acc = "";
    for (let i = 0; i < e.results.length; i++) {
      acc += e.results[i][0].transcript;
    }
    text = acc.trim();
  };
  rec.onerror = () => {};

  try {
    rec.start();
  } catch {
    return null;
  }

  return {
    stop: () =>
      new Promise<string>((resolve) => {
        rec.onend = () => resolve(text);
        try {
          rec.stop();
        } catch {
          resolve(text);
        }
        // на случай если onend не сработает
        setTimeout(() => resolve(text), 800);
      }),
  };
}
