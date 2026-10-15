import Icon from "@/components/ui/icon";

interface Props {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onNext: () => void;
  onClose: () => void;
}

const EditorHeader = ({ undo, redo, canUndo, canRedo, onNext, onClose }: Props) => (
  <div className="flex items-center justify-between px-4 pt-12 pb-3 border-b border-white/10 gap-2">
    <div className="flex items-center gap-1">
      <button onClick={undo} disabled={!canUndo} className={`p-2 rounded-full transition-colors ${canUndo ? "text-white hover:bg-white/10 cursor-pointer" : "text-white/25 cursor-not-allowed"}`} title="Отменить">
        <Icon name="Undo2" size={20} />
      </button>
      <button onClick={redo} disabled={!canRedo} className={`p-2 rounded-full transition-colors ${canRedo ? "text-white hover:bg-white/10 cursor-pointer" : "text-white/25 cursor-not-allowed"}`} title="Повторить">
        <Icon name="Redo2" size={20} />
      </button>
    </div>
    <button
      onClick={onNext}
      className="px-4 py-1.5 rounded-full bg-[#fe2c55] hover:bg-[#e0264c] active:scale-95 transition-all cursor-pointer text-white text-sm font-bold flex-shrink-0"
    >Далее</button>
    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer" title="Закрыть"><Icon name="X" size={22} className="text-white" /></button>
  </div>
);

export default EditorHeader;
