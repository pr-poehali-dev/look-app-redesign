import { useEffect, useRef, useState } from "react";

interface VideoThumbProps {
  src: string;
  className?: string;
  posterTime?: number;
}

const VideoThumb = ({ src, className = "", posterTime = 0.1 }: VideoThumbProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [poster, setPoster] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    let cancelled = false;

    const capture = () => {
      if (cancelled) return;
      try {
        const canvas = canvasRef.current ?? document.createElement("canvas");
        canvas.width = v.videoWidth || 320;
        canvas.height = v.videoHeight || 320;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL("image/jpeg", 0.7);
        if (!cancelled) {
          setPoster(data);
          setReady(true);
        }
      } catch {
        if (!cancelled) setReady(true);
      }
    };

    const onLoaded = () => {
      try {
        if (v.duration && v.duration > 0) {
          v.currentTime = Math.min(posterTime, v.duration / 2);
        } else {
          capture();
        }
      } catch {
        capture();
      }
    };
    const onSeeked = () => capture();

    v.addEventListener("loadeddata", onLoaded);
    v.addEventListener("seeked", onSeeked);

    const playPromise = v.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          setTimeout(() => {
            try {
              v.pause();
            } catch {
              /* noop */
            }
            capture();
          }, 100);
        })
        .catch(() => {
          /* autoplay blocked — рассчитываем на loadeddata/seeked */
        });
    }

    return () => {
      cancelled = true;
      v.removeEventListener("loadeddata", onLoaded);
      v.removeEventListener("seeked", onSeeked);
    };
  }, [src, posterTime]);

  if (poster) {
    return <img src={poster} alt="" className={className} />;
  }

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        className={className}
        muted
        playsInline
        preload="metadata"
        style={ready ? undefined : { opacity: 0.999 }}
      />
      <canvas ref={canvasRef} className="hidden" />
    </>
  );
};

export default VideoThumb;
