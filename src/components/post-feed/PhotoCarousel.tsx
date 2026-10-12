import { useRef, useState } from "react";

interface Props {
  images: string[];
  alt?: string;
}

const PhotoCarousel = ({ images, alt = "" }: Props) => {
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = ref.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="relative w-full h-full">
      <div
        ref={ref}
        onScroll={onScroll}
        className="w-full h-full flex overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {images.map((u, i) => (
          <div key={u + i} className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center">
            <img
              src={u}
              alt={alt}
              loading={i === 0 ? "eager" : "lazy"}
              className="max-w-full max-h-full w-auto h-auto object-contain"
            />
          </div>
        ))}
      </div>
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs font-semibold">
        {index + 1}/{images.length}
      </div>
      <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5 pointer-events-none">
        {images.map((_, i) => (
          <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === index ? "bg-white" : "bg-white/40"}`} />
        ))}
      </div>
    </div>
  );
};

export default PhotoCarousel;
