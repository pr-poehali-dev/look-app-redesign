import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { boardsPost } from "@/hooks/useBoards";
import { toast } from "sonner";

const BoardInviteLink = () => {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("board_invite");
    if (t) setToken(t);
  }, []);

  if (!token || !user) return null;

  const close = () => {
    setToken(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("board_invite");
    window.history.replaceState({}, "", url.toString());
  };

  const accept = async () => {
    setBusy(true);
    try {
      const { ok } = await boardsPost("join", user.id, { token });
      if (ok) toast.success("Вы в команде доски. Она появилась в разделе «Доски»");
      else toast.error("Приглашение недействительно");
    } catch {
      toast.error("Не удалось принять приглашение");
    }
    setBusy(false);
    close();
  };

  return createPortal(
    <div className="fixed inset-0 z-[10002] bg-black/60 flex items-center justify-center px-6">
      <div className="sheet-theme rounded-3xl p-6 w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-full bg-[#fe2c55]/20 flex items-center justify-center mx-auto mb-3">
          <Icon name="Users" size={26} className="text-[#fe2c55]" />
        </div>
        <p className="text-white font-bold text-lg mb-1">Вас приглашают в общую доску</p>
        <p className="text-white/50 text-sm mb-5">Вместе собирайте идеи и добавляйте публикации</p>
        <div className="flex gap-2">
          <button onClick={close} className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold">Не сейчас</button>
          <button onClick={accept} disabled={busy} className="flex-1 py-2.5 rounded-xl bg-[#fe2c55] text-white text-sm font-semibold disabled:opacity-50">
            {busy ? "Входим..." : "Принять"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BoardInviteLink;
