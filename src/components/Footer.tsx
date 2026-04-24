import Icon from "@/components/ui/icon";

const Footer = () => {
  return (
    <footer className="relative border-t border-white/5 py-12">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#8b5cf6]/30 to-transparent" />
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#8b5cf6] flex items-center justify-center">
            <Icon name="Zap" size={14} className="text-[#080c14]" />
          </div>
          <span className="font-display text-lg font-bold gradient-text">ShortApp</span>
        </div>

        <p className="font-body text-sm text-white/30 text-center">
          © {new Date().getFullYear()} ShortApp — Создано с ❤️
        </p>

        <a
          href="https://www.rustore.ru/catalog/app/ru.aleksey.shortapp"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-[#00d4ff]/60 hover:text-[#00d4ff] transition-colors font-body"
        >
          <Icon name="ExternalLink" size={14} />
          RuStore
        </a>
      </div>
    </footer>
  );
};

export default Footer;
