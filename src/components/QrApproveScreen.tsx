import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";

const AUTH_URL = "https://functions.poehali.dev/075d6280-020a-48ce-a5e4-64eb3291a01e";

interface Props {
  code: string;
  onDone: () => void;
}

const QrApproveScreen = ({ code, onDone }: Props) => {
  const { user, token } = useAuth();
  const [state, setState] = useState<"idle" | "approving" | "approved" | "rejecting" | "rejected" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Если не вошёл — не на этом экране нечего делать
  useEffect(() => {
    if (!token) return;
  }, [token]);

  const approve = async () => {
    if (!token) return;
    setState("approving");
    try {
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "qr_approve", code, token }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.status === "approved") {
        setState("approved");
        setTimeout(onDone, 1500);
      } else {
        setErrorMsg(data.error || "Не удалось подтвердить вход");
        setState("error");
      }
    } catch {
      setErrorMsg("Сеть недоступна");
      setState("error");
    }
  };

  const reject = async () => {
    setState("rejecting");
    try {
      await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "qr_reject", code }),
      });
    } catch { /* ignore */ }
    setState("rejected");
    setTimeout(onDone, 1200);
  };

  if (!token) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center mb-4">
          <Icon name="QrCode" size={36} className="text-white" />
        </div>
        <p className="text-white font-bold text-xl mb-2">Войди в аккаунт</p>
        <p className="text-white/60 text-sm mb-6">Чтобы подтвердить вход на ПК, сначала войди в Лоок на этом устройстве.</p>
        <button onClick={onDone} className="px-5 py-3 rounded-xl bg-white text-black font-bold">Перейти ко входу</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 pt-12 pb-3">
        <button onClick={onDone} className="p-2 -ml-1 text-white"><Icon name="X" size={22} /></button>
        <p className="text-white font-bold">Вход на ПК</p>
        <div className="w-9" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col items-center gap-4">
          {state === "approved" ? (
            <>
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <Icon name="Check" size={44} className="text-green-600" />
              </div>
              <p className="text-black font-bold text-lg">Вход подтверждён</p>
              <p className="text-gray-500 text-sm text-center">Теперь ты вошёл в Лоок и на ПК.</p>
            </>
          ) : state === "rejected" ? (
            <>
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                <Icon name="X" size={44} className="text-gray-500" />
              </div>
              <p className="text-black font-bold text-lg">Вход отклонён</p>
            </>
          ) : state === "error" ? (
            <>
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                <Icon name="AlertCircle" size={44} className="text-red-500" />
              </div>
              <p className="text-black font-bold text-lg">Ошибка</p>
              <p className="text-gray-500 text-sm text-center">{errorMsg}</p>
              <button onClick={onDone} className="px-5 py-2.5 rounded-xl bg-gray-100 text-black font-semibold">Закрыть</button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center">
                <Icon name="Monitor" size={36} className="text-white" />
              </div>
              <p className="text-black font-bold text-lg text-center">Подтвердить вход на ПК?</p>
              <p className="text-gray-500 text-sm text-center">
                После подтверждения на ПК откроется твой аккаунт <span className="font-semibold text-black">@{user?.handle}</span>.
              </p>
              <div className="flex flex-col gap-2 w-full mt-2">
                <button
                  onClick={approve}
                  disabled={state === "approving"}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white font-bold disabled:opacity-50"
                >{state === "approving" ? "Подтверждаем..." : "Подтвердить вход"}</button>
                <button
                  onClick={reject}
                  className="w-full py-3 rounded-xl bg-gray-100 text-black font-semibold"
                >Это не я</button>
              </div>
            </>
          )}
        </div>
        <p className="text-white/40 text-xs mt-6 text-center max-w-sm">
          Подтверждай вход только если ты сейчас сам открыл Лоок на компьютере.
        </p>
      </div>
    </div>
  );
};

export default QrApproveScreen;
