import { useState } from "react";
import AuthPrompt from "@/components/landing/AuthPrompt";
import LandingSidebar, { LandingTab } from "@/components/landing/LandingSidebar";
import LandingFeed from "@/components/landing/LandingFeed";

interface LandingProps {
  onLogin: () => void;
  onRegister: () => void;
}

const LOGO =
  "https://static.rustore.ru/imgproxy/vs3_tA6Fiyv_VxNKTcByf1sXvc4-Qy2G_VlA-uzDgTs/preset:web_app_icon_62/plain/https://static.rustore.ru/2025/9/16/49/apk/2063656157/content/ICON/586db88b-5139-4dc5-b8f4-5a7e07f892ba.png@webp";

const Landing = ({ onLogin, onRegister }: LandingProps) => {
  const [tab, setTab] = useState<LandingTab>("foryou");
  const [prompt, setPrompt] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 flex bg-white text-[#161823]">
      <LandingSidebar tab={tab} onTab={setTab} onLocked={setPrompt} onLogin={onLogin} />

      <main className="relative h-full min-w-0 flex-1">
        <LandingFeed key={tab} newestFirst={tab === "explore"} onLocked={setPrompt} />

        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3 lg:justify-end lg:p-5">
          <div className="pointer-events-auto flex items-center gap-2 lg:hidden">
            <img src={LOGO} alt="Лоок" className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-xl font-black text-white">Лоок</span>
          </div>
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/40 p-1.5 backdrop-blur lg:bg-white lg:shadow-md">
            <button
              onClick={onRegister}
              className="hidden px-3 py-1.5 text-sm font-semibold text-white sm:block lg:text-[#161823]"
            >
              Начать бесплатно
            </button>
            <button
              onClick={onLogin}
              className="rounded-full bg-[#14723f] px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Войти
            </button>
          </div>
        </header>
      </main>

      <AuthPrompt
        open={prompt !== null}
        reason={prompt || ""}
        onClose={() => setPrompt(null)}
        onLogin={() => {
          setPrompt(null);
          onLogin();
        }}
        onRegister={() => {
          setPrompt(null);
          onRegister();
        }}
      />
    </div>
  );
};

export default Landing;
