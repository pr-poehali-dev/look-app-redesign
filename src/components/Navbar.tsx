import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#080c14]/90 backdrop-blur-xl border-b border-[#00d4ff]/10 shadow-[0_4px_30px_rgba(0,212,255,0.08)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollTo("hero")}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#8b5cf6] flex items-center justify-center">
            <Icon name="Zap" size={16} className="text-[#080c14]" />
          </div>
          <span className="font-display text-xl font-bold gradient-text tracking-wide">ShortApp</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: "Главная", id: "hero" },
            { label: "Функции", id: "features" },
            { label: "Скачать", id: "download" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="text-sm text-white/60 hover:text-[#00d4ff] transition-colors duration-300 font-body tracking-wide relative group"
            >
              {item.label}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#00d4ff] group-hover:w-full transition-all duration-300" />
            </button>
          ))}
        </nav>

        <button
          onClick={() => scrollTo("download")}
          className="hidden md:flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] text-[#080c14] font-semibold text-sm hover:shadow-[0_0_20px_rgba(0,212,255,0.5)] transition-all duration-300 hover:scale-105"
        >
          <Icon name="Download" size={14} />
          Скачать
        </button>

        <button
          className="md:hidden text-white/70 hover:text-[#00d4ff] transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Icon name={menuOpen ? "X" : "Menu"} size={22} />
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-[#080c14]/95 backdrop-blur-xl border-t border-[#00d4ff]/10 px-6 py-4 flex flex-col gap-4">
          {[
            { label: "Главная", id: "hero" },
            { label: "Функции", id: "features" },
            { label: "Скачать", id: "download" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="text-left text-white/70 hover:text-[#00d4ff] transition-colors font-body py-1"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};

export default Navbar;
