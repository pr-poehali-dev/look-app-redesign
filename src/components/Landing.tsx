import { useState } from "react";
import Icon from "@/components/ui/icon";
import AuthPrompt from "@/components/landing/AuthPrompt";
import LandingSidebar from "@/components/landing/LandingSidebar";
import LandingFeed from "@/components/landing/LandingFeed";

interface LandingProps {
  onLogin: () => void;
  onRegister: () => void;
}

const Landing = ({ onLogin, onRegister }: LandingProps) => {
  const [newest, setNewest] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 flex" style={{ background: "var(--look-bg)", color: "var(--look-fg)" }}>
      <LandingSidebar onLocked={setPrompt} onLogin={onLogin} />

      <main className="relative h-full min-w-0 flex-1">
        <LandingFeed key={String(newest)} newestFirst={newest} onLocked={setPrompt} />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3 md:p-4">
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="pointer-events-auto flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-medium text-black"
            >
              {newest ? "Новые" : "Все"}
              <Icon name={menuOpen ? "ChevronUp" : "ChevronDown"} size={14} />
            </button>
            {menuOpen && (
              <div className="pointer-events-auto absolute left-0 top-full mt-1 flex w-32 flex-col rounded-xl bg-white p-1 text-sm text-black shadow-lg">
                {[
                  { label: "Новые", value: true },
                  { label: "Все", value: false },
                ].map((o) => (
                  <button
                    key={o.label}
                    onClick={() => {
                      setNewest(o.value);
                      setMenuOpen(false);
                    }}
                    className="rounded-lg px-3 py-2 text-left hover:bg-black/5"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onLogin}
            className="pointer-events-auto rounded-full bg-black/40 px-4 py-1.5 text-sm font-bold text-white backdrop-blur md:hidden"
          >
            Войти
          </button>
        </div>
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
