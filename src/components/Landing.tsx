import { useState } from "react";
import Icon from "@/components/ui/icon";
import AuthPrompt from "@/components/landing/AuthPrompt";
import LandingSidebar from "@/components/landing/LandingSidebar";
import LandingFeed from "@/components/landing/LandingFeed";
import VideoGrid from "@/components/VideoGrid";
import { useIsMobile } from "@/hooks/use-mobile";
import { LegalScreen } from "@/components/SettingsScreen";
import { CATEGORIES } from "@/components/VideoFeed";

interface LandingProps {
  onLogin: () => void;
  onRegister: () => void;
}

const Landing = ({ onLogin, onRegister }: LandingProps) => {
  const [category, setCategory] = useState("new");
  const [menuOpen, setMenuOpen] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [openVideoId, setOpenVideoId] = useState<number | null>(null);
  const [doc, setDoc] = useState<"terms" | "privacy" | null>(null);
  const isMobile = useIsMobile();
  const showGrid = !isMobile && category !== "new" && category !== "subs" && openVideoId === null;

  return (
    <div className="fixed inset-0 flex" style={{ background: "var(--look-bg)", color: "var(--look-fg)" }}>
      <LandingSidebar onLocked={setPrompt} onLogin={onLogin} onOpenDoc={setDoc} />

      <main className="relative h-full min-w-0 flex-1">
        {doc && (
          <div className="absolute inset-0 z-30 bg-gray-100">
            <LegalScreen
              onBack={() => setDoc(null)}
              title={doc === "terms" ? "Условия использования" : "Политика конфиденциальности"}
              settingKey={doc === "terms" ? "terms_of_use" : "privacy_policy"}
              fallback={
                doc === "terms"
                  ? "Используя приложение Look, вы соглашаетесь с нашими условиями использования."
                  : "Мы уважаем вашу конфиденциальность."
              }
            />
          </div>
        )}
        {showGrid ? (
          <VideoGrid category={category} onOpenVideo={(id) => setOpenVideoId(id - 10000)} onGuestAction={setPrompt} />
        ) : (
          <LandingFeed
            key={`${category}-${openVideoId ?? "feed"}`}
            category={category}
            initialVideoId={openVideoId ?? undefined}
            onLocked={setPrompt}
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3 md:p-4">
          <div className="relative">
            <button
              onClick={() => {
                if (openVideoId !== null) {
                  setOpenVideoId(null);
                  return;
                }
                setMenuOpen((o) => !o);
              }}
              className="pointer-events-auto flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-medium text-black"
            >
              {CATEGORIES.find((c) => c.id === category)?.label || "Все"}
              <Icon name={openVideoId !== null ? "ArrowLeft" : menuOpen ? "ChevronUp" : "ChevronDown"} size={14} />
            </button>
            {menuOpen && (
              <div className="pointer-events-auto absolute left-0 top-full mt-1 flex w-[320px] max-w-[calc(100vw-24px)] flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-lg">
                {CATEGORIES.map((c) => {
                  const on = c.id === category;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setMenuOpen(false);
                        if (c.id === "subs") {
                          setPrompt("Войди, чтобы видеть ролики тех, на кого ты подписан.");
                          return;
                        }
                        setOpenVideoId(null);
                        setCategory(c.id);
                      }}
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        on ? "bg-[#1f6b3a] text-white" : "bg-black/10 text-[#0d2a18]"
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
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
