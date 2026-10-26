import { useState } from "react";
import Icon from "@/components/ui/icon";
import i18n from "@/i18n";

const LANGUAGES = [
  { code: "ru", label: "Русский", hint: "Основной" },
  { code: "en", label: "English", hint: "English" },
  { code: "zh", label: "中文", hint: "Chinese" },
];

const LanguageScreen = ({ onBack }: { onBack: () => void }) => {
  const [current, setCurrent] = useState(() => {
    try { return localStorage.getItem("app_lang") || "ru"; } catch { return "ru"; }
  });

  const choose = (code: string) => {
    setCurrent(code);
    i18n.changeLanguage(code);
    window.dispatchEvent(new CustomEvent("app-lang-change", { detail: code }));
  };

  return (
    <div className="h-full bg-gray-100 overflow-y-auto">
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1">
          <Icon name="ArrowLeft" size={22} className="text-black" />
        </button>
        <span data-no-translate className="flex-1 text-center text-black font-bold text-lg pr-7">Язык / Language / 语言</span>
      </div>
      <div className="mt-2">
        {LANGUAGES.map(l => (
          <button
            key={l.code}
            onClick={() => choose(l.code)}
            data-no-translate
            className="w-full flex items-center gap-4 px-4 py-4 bg-white border-b border-gray-100"
          >
            <div className="flex-1 text-left">
              <p className="text-black text-base">{l.label}</p>
              <p className="text-gray-400 text-xs">{l.hint}</p>
            </div>
            {current === l.code && <Icon name="Check" size={20} className="text-[#8b5cf6]" />}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageScreen;
