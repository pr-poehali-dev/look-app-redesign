import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import PostCard from "./PostCard";
import { Post } from "./PostFeedTypes";

const NoteViewer = ({ post, onClose }: { post: Post; onClose: () => void }) => {
  return createPortal(
    <div className="fixed inset-0 z-[9998] bg-black flex flex-col md:items-center md:justify-center md:bg-black/80">
      <div className="relative w-full h-full md:w-auto md:h-[92vh] md:aspect-[9/16] md:max-w-[460px]">
        <button
          onClick={onClose}
          className="absolute top-16 left-4 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center md:-left-14 md:top-0"
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