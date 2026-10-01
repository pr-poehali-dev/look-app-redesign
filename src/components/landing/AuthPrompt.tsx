import Icon from "@/components/ui/icon";

interface AuthPromptProps {
  open: boolean;
  reason: string;
  onClose: () => void;
  onLogin: () => void;
  onRegister: () => void;
}

const AuthPrompt = ({ open, reason, onClose, onLogin, onRegister }: AuthPromptProps) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center text-[#161823] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 hover:bg-black/10"
          aria-label="Закрыть"
        >
          <Icon name="X" size={18} />
        </button>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#14723f] text-white">
          <Icon name="User" size={28} />
        </div>
        <h3 className="text-xl font-bold">Войди в Лоок</h3>
        <p className="mt-2 text-sm text-black/60">{reason}</p>
        <button
          onClick={onRegister}
          className="mt-5 w-full rounded-lg bg-[#14723f] py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          Начать бесплатно
        </button>
        <button
          onClick={onLogin}
          className="mt-2 w-full rounded-lg bg-black/5 py-3 text-sm font-semibold hover:bg-black/10"
        >
          У меня уже есть аккаунт
        </button>
      </div>
    </div>
  );
};

export default AuthPrompt;
