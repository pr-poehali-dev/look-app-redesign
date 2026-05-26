import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import Icon from "@/components/ui/icon";

interface Props {
  onBack: () => void;
  onCode: (code: string) => void;
}

const QrScannerScreen = ({ onBack, onCode }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [scanning, setScanning] = useState(true);

  const handleDetected = (rawValue: string) => {
    if (!scanning) return;
    setScanning(false);
    let code: string | null = null;
    try {
      const u = new URL(rawValue);
      code = u.searchParams.get("qr_login");
    } catch {
      // не URL — может это просто код
      if (/^[A-Za-z0-9_-]{10,}$/.test(rawValue)) code = rawValue;
    }
    if (code) {
      stop();
      onCode(code);
    } else {
      setError("Этот QR не от входа в Лоок");
      setTimeout(() => { setError(null); setScanning(true); }, 1800);
    }
  };

  const tick = () => {
    if (!videoRef.current || !canvasRef.current) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const video = videoRef.current;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
        if (result?.data) {
          handleDetected(result.data);
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError("Не удалось включить камеру. Разреши доступ или загрузи фото с QR.");
    }
  };

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      const capabilities = (track.getCapabilities?.() || {}) as MediaTrackCapabilities & { torch?: boolean };
      if (!capabilities.torch) return;
      await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch(!torch);
    } catch { /* ignore */ }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    await new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => resolve(); img.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(data.data, data.width, data.height);
    URL.revokeObjectURL(url);
    if (result?.data) handleDetected(result.data);
    else { setError("На фото не найден QR-код"); setTimeout(() => setError(null), 2000); }
  };

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />

      {/* dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* viewfinder */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-64 h-64 max-w-[70vw] max-h-[70vw]">
          <div className="absolute inset-0 border-2 border-white/30 rounded-2xl" />
          <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-2xl" />
          <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-2xl" />
          <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-2xl" />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-2xl" />
        </div>
      </div>

      {/* top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-12 pb-3">
        <button onClick={() => { stop(); onBack(); }} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
          <Icon name="X" size={22} className="text-white" />
        </button>
        <p className="text-white font-bold">Сканировать QR</p>
        <button onClick={toggleTorch} className={`w-10 h-10 rounded-full backdrop-blur flex items-center justify-center ${torch ? "bg-yellow-400" : "bg-black/50"}`}>
          <Icon name="Zap" size={18} className={torch ? "text-black" : "text-white"} />
        </button>
      </div>

      {/* spacer */}
      <div className="flex-1" />

      {/* bottom panel */}
      <div className="relative z-10 px-6 pb-12 pt-4 flex flex-col items-center gap-3">
        {error ? (
          <div className="bg-red-500/90 text-white text-sm px-4 py-2 rounded-full backdrop-blur">{error}</div>
        ) : (
          <p className="text-white text-sm text-center bg-black/40 px-4 py-2 rounded-full backdrop-blur">Наведи камеру на QR-код на экране ПК</p>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 backdrop-blur text-white text-sm font-semibold"
        >
          <Icon name="Image" size={16} />
          Загрузить фото с QR
        </button>
      </div>
    </div>
  );
};

export default QrScannerScreen;
