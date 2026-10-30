import { useState } from "react";

interface Props {
  src: string;
  videoUrl?: string;
  eager?: boolean;
}

const HoverPreviewThumb = ({ src, videoUrl, eager }: Props) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="w-full h-full relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <img loading={eager ? "eager" : "lazy"} decoding="async" src={src} alt="" className="w-full h-full object-cover rounded-md" />
      {hover && videoUrl && (
        <video
          src={videoUrl}
          className="absolute inset-0 w-full h-full object-cover rounded-md pointer-events-none"
          autoPlay
          muted
          loop
          playsInline
        />
      )}
    </div>
  );
};

export default HoverPreviewThumb;
