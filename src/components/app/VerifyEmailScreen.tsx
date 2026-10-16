import Icon from "@/components/ui/icon";

interface VerifyEmailScreenProps {
  verifyState: "loading" | "ok" | "error";
  verifyError: string;
  onClose: () => void;
}

const VerifyEmailScreen = ({ verifyState, verifyError, onClose }: VerifyEmailScreenProps) => {
  const close = onClose;
  return (
    <div className="fixed inset-0 bg-black flex flex-col" style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-2">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center mb-2">
          <Icon name="MailCheck" size={28} className="text-white" />
        </div>
        <h1 className="text-white font-black text-3xl">Подтверждение email</h1>
      </div>
      <div className="bg-white rounded-t-3xl px-6 pt-7 pb-10 flex flex-col gap-4">
        {verifyState === "loading" ? (
          <p className="text-gray-500 text-center py-6">Проверяем ссылку...</p>
        ) : verifyState === "ok" ? (
          <>
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <Icon name="CheckCircle2" size={28} className="text-green-600" />
              </div>
              <p className="text-black font-semibold text-base text-center">Email подтверждён</p>
              <p className="text-gray-500 text-sm text-center">Спасибо! Теперь твой аккаунт защищён.</p>
            </div>
            <button onClick={close} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white font-bold text-base">Продолжить</button>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <Icon name="AlertCircle" size={28} className="text-red-600" />
              </div>
              <p className="text-black font-semibold text-base text-center">Ссылка не работает</p>
              <p className="text-gray-500 text-sm text-center">{verifyError}</p>
            </div>
            <button onClick={close} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white font-bold text-base">Закрыть</button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailScreen;
