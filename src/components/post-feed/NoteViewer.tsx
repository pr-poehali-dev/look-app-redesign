import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import PostCard from "./PostCard";
import NoteViewerDesktop from "./NoteViewerDesktop";
import { Post } from "./PostFeedTypes";

const DESKTOP_QUERY = "(min-width: 768px)";

const useIsDesktop = () => {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return desktop;
};

const NoteViewer = ({ post, onClose }: { post: Post; onClose: () => void }) => {
  const desktop = useIsDesktop();

  if (desktop) {
    return createPortal(<NoteViewerDesktop post={post} onClose={onClose} />, document.body);
  }

  return createPortal(
    <div className="fixed inset-0 z-[9998] bg-black flex flex-col">
      <div className="relative w-full h-full">
        <button
          onClick={onClose}
          className="absolute top-16 left-4 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
        >
          <Icon name="ArrowLeft" size={20} className="text-white" />
        </button>
        <PostCard post={post} />
      </div>
    </div>,
    document.body
  );
};

export default NoteViewer;
