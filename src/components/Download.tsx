import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";

const Download = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="download" className="relative py-28 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00d4ff]/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00d4ff]/3 to-transparent" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#00d4ff]/5 blur-[120px]" />

      <div
        ref={ref}
        className="relative max-w-4xl mx-auto px-6 text-center"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(30px)",
          transition: "all 0.8s ease",
        }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00d4ff]/30 bg-[#00d4ff]/5 text-[#00d4ff] text-sm font-body mb-8">
          <Icon name="Download" size={14} />
          Скачать приложение
        </div>

        <h2 className="font-display text-4xl md:text-6xl font-bold mb-6">
          <span className="text-white">Готов начать?</span>
          <br />
          <span className="gradient-text">Это бесплатно</span>
        </h2>

        <p className="font-body text-white/50 text-lg max-w-lg mx-auto mb-14 leading-relaxed">
          Скачай Look прямо сейчас и присоединяйся к тысячам пользователей, которые уже оценили приложение
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-16">
          <a
            href="https://www.rustore.ru/catalog/app/ru.aleksey.shortapp"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 px-7 py-4 rounded-2xl bg-gradient-to-r from-[#00d4ff] to-[#0ea5e9] text-[#080c14] font-bold text-lg w-full sm:w-auto justify-center hover:shadow-[0_0_40px_rgba(0,212,255,0.5)] transition-all duration-300 hover:scale-105"
          >
            <div className="w-10 h-10 rounded-xl bg-[#080c14]/20 flex items-center justify-center">
              <Icon name="ShoppingBag" size={20} className="text-[#080c14]" />
            </div>
            <div className="text-left">
              <div className="text-xs opacity-70 font-normal">Скачать в</div>
              <div className="font-display text-xl tracking-wide">RuStore</div>
            </div>
            <Icon name="ArrowRight" size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </a>

          <div className="flex items-center gap-4 px-7 py-4 rounded-2xl border border-white/10 text-white/40 text-lg w-full sm:w-auto justify-center cursor-not-allowed">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <Icon name="Smartphone" size={20} className="text-white/40" />
            </div>
            <div className="text-left">
              <div className="text-xs font-normal">Скоро в</div>
              <div className="font-display text-xl tracking-wide">Google Play</div>
            </div>
            <div className="ml-2 text-xs px-2 py-0.5 rounded-full border border-white/10 text-white/30">Скоро</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          {[
            { icon: "Star", value: "4.8 / 5", label: "Средняя оценка", color: "#f59e0b" },
            { icon: "Users", value: "10 000+", label: "Активных пользователей", color: "#00d4ff" },
            { icon: "Heart", value: "Бесплатно", label: "Навсегда", color: "#ec4899" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/8 bg-[#0d1220]/60 p-6 flex flex-col items-center gap-3"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}
              >
                <Icon name={item.icon as "Star"} size={22} style={{ color: item.color }} />
              </div>
              <div className="font-display text-2xl font-bold text-white">{item.value}</div>
              <div className="font-body text-sm text-white/40">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Download;