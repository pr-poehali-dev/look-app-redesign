import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

const COLORS = [
  "bg-pink-500",
  "bg-rose-500",
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-yellow-500",
  "bg-lime-500",
  "bg-green-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-fuchsia-500",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function getInitial(name?: string): string {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const first = trimmed[0];
  return first ? first.toUpperCase() : "?";
}

export interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  className?: string;
  imgClassName?: string;
  alt?: string;
}

const UserAvatar = ({ src, name, className, imgClassName, alt }: UserAvatarProps) => {
  const [failed, setFailed] = useState(false);
  const display = name || alt || "";

  const colorClass = useMemo(() => {
    const key = (display || "?").toLowerCase();
    return COLORS[hashString(key) % COLORS.length];
  }, [display]);

  const initial = getInitial(display);
  const showImage = src && !failed;

  return (
    <div
      className={cn(
        "relative w-full h-full flex items-center justify-center overflow-hidden rounded-full",
        !showImage && colorClass,
        className,
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt || display}
          onError={() => setFailed(true)}
          className={cn("w-full h-full object-cover", imgClassName)}
        />
      ) : (
        <span className="text-white font-bold select-none" style={{ fontSize: "45%" }}>
          {initial}
        </span>
      )}
    </div>
  );
};

export default UserAvatar;
