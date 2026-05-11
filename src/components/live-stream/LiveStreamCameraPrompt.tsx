import Icon from "@/components/ui/icon";

interface Props {
  camState: "idle" | "denied";
  camErrorMsg: string;
  onClose: () => void;
  onStart: () => void;
}

const LiveStreamCameraPrompt = ({ camState, camErrorMsg, onClose, onStart }: Props) => {
  if (camState === "idle") {
    return (
      <div className="relative w-full h-full bg-black flex flex-col items-center justify-center px-8">
        <button onClick={onClose} className="absolute top-12 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <Icon name="X" size={18} className="text-white" />
        </button>
        <div className="text-6xl mb-6">📸</div>
        <h2 className="text-white font-bold text-2xl mb-3 text-center">Прямой эфир</h2>
        <p className="text-white/50 text-sm text-center mb-8 leading-relaxed">
          Нажми кнопку — браузер спросит разрешение на камеру. Выбери <span className="text-white font-semibold">«Разрешить»</span>.
        </p>
        <button
          onClick={onStart}
          className="w-full py-4 rounded-2xl bg-[#fe2c55] text-white font-bold text-lg active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <Icon name="Camera" size={22} />
          Включить камеру
        </button>
        <button onClick={onClose} className="mt-4 text-white/30 text-sm">Отмена</button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black flex flex-col overflow-y-auto px-6 pt-16 pb-8">
      <button onClick={onClose} className="absolute top-12 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
        <Icon name="X" size={18} className="text-white" />
      </button>
      <div className="text-5xl mb-3 text-center">🔒</div>
      <h2 className="text-white font-bold text-xl mb-1 text-center">Нет доступа к камере</h2>
      {camErrorMsg && (
        <p className="text-red-400 text-xs font-mono text-center mb-3 break-all">{camErrorMsg}</p>
      )}
      <p className="text-white/50 text-sm text-center mb-6 leading-relaxed">
        Браузер заблокировал камеру. Попробуй открыть сайт в Google Chrome — там всё работает.
      </p>
      <div className="bg-white/5 rounded-2xl p-4 mb-3 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0 text-2xl">🌐</div>
        <div>
          <p className="text-white font-semibold text-sm mb-0.5">Открой в Google Chrome</p>
          <p className="text-white/50 text-xs">Скопируй ссылку и вставь в Chrome.</p>
        </div>
      </div>
      <button
        onClick={() => { navigator.clipboard.writeText(window.location.href).catch(() => {}); }}
        className="w-full py-3 rounded-2xl bg-white/10 text-white text-sm font-medium active:scale-95 transition-all mb-4 flex items-center justify-center gap-2"
      >
        <Icon name="Copy" size={16} className="text-white/60" />
        Скопировать ссылку
      </button>
      <div className="w-full h-px bg-white/10 mb-4" />
      <button
        onClick={onStart}
        className="w-full py-4 rounded-2xl bg-[#fe2c55] text-white font-bold text-base active:scale-95 transition-all mb-3"
      >
        Попробовать снова
      </button>
      <button onClick={onClose} className="text-white/30 text-sm text-center">Закрыть</button>
    </div>
  );
};

export default LiveStreamCameraPrompt;
