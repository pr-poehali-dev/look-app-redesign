import { RefObject } from "react";
import Icon from "@/components/ui/icon";
import { TEMPLATES } from "./editorTypes";

interface Props {
  onClose: () => void;
  showFileSheet: boolean;
  setShowFileSheet: (v: boolean) => void;
  galleryInputRef: RefObject<HTMLInputElement>;
  cameraInputRef: RefObject<HTMLInputElement>;
  onOpenSheet: () => void;
  onFilesAdd: (files: FileList | null) => void;
  onSelectTemplate: (templateId: string) => void;
}

const EditorEmptyState = ({
  onClose,
  showFileSheet,
  setShowFileSheet,
  galleryInputRef,
  cameraInputRef,
  onOpenSheet,
  onFilesAdd,
  onSelectTemplate,
}: Props) => {
  return (
    <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col">
      <div className="flex items-center justify-between px-4 pt-12 pb-3 border-b border-white/10">
        <button onClick={onClose} className="p-2"><Icon name="X" size={22} className="text-white" /></button>
        <p className="text-white font-bold">Конструктор</p>
        <div className="w-9" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center">
          <Icon name="Sparkles" size={36} className="text-white" />
        </div>
        <div className="text-center">
          <p className="text-white text-xl font-bold mb-1">Создай свой ролик</p>
          <p className="text-white/60 text-sm">Загрузи фото или видео и оформи их в нашем редакторе</p>
        </div>
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => { onFilesAdd(e.target.files); e.target.value = ""; }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { onFilesAdd(e.target.files); e.target.value = ""; }}
        />
        <button
          onClick={onOpenSheet}
          className="px-6 py-3 rounded-2xl bg-[#fe2c55] text-white font-bold flex items-center gap-2"
        >
          <Icon name="Upload" size={18} /> Выбрать файлы
        </button>
        <div className="w-full max-w-md">
          <p className="text-white/50 text-xs mb-2 text-center">Или начни с готового шаблона</p>
          <div className="grid grid-cols-3 gap-3">
            {TEMPLATES.slice(1, 4).map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectTemplate(t.id)}
                className="aspect-[9/16] rounded-xl flex flex-col items-center justify-center gap-2 text-white text-sm font-semibold bg-gradient-to-br from-[#fe2c55]/30 to-[#8b5cf6]/30 border border-white/15 active:scale-95 transition-transform"
              >
                <Icon name="Sparkles" size={18} className="text-white/80" />
                {t.name}
              </button>
            ))}
          </div>
        </div>
        <p className="text-white/40 text-xs text-center">Можно выбрать несколько файлов — мы склеим их в один ролик.</p>
      </div>

      {showFileSheet && (
        <div className="fixed inset-0 z-[300] flex items-end" onClick={() => setShowFileSheet(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full rounded-t-3xl overflow-hidden pb-8"
            style={{ background: "#1a1a1a" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <p className="text-white/40 text-xs text-center mb-3">Выбрать медиафайл</p>
            <div className="flex flex-col gap-1 px-4">
              <button
                onClick={() => {
                  setShowFileSheet(false);
                  setTimeout(() => { if (galleryInputRef.current) { galleryInputRef.current.value = ""; galleryInputRef.current.click(); } }, 80);
                }}
                className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl active:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="Image" size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-medium text-sm">Файлы из галереи</p>
                  <p className="text-white/40 text-xs">Выбрать из сохранённых</p>
                </div>
              </button>
              <button
                onClick={() => {
                  setShowFileSheet(false);
                  setTimeout(() => { if (cameraInputRef.current) { cameraInputRef.current.value = ""; cameraInputRef.current.click(); } }, 80);
                }}
                className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl active:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="Camera" size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-medium text-sm">Камера</p>
                  <p className="text-white/40 text-xs">Снять фото или видео</p>
                </div>
              </button>
            </div>
            <div className="px-4 mt-2">
              <button
                onClick={() => setShowFileSheet(false)}
                className="w-full py-3.5 rounded-2xl bg-white/8 text-white/60 text-sm font-medium active:bg-white/12 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorEmptyState;