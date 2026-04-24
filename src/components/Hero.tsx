import { useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

const Hero = () => {
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;
    for (let i = 0; i < 30; i++) {
      const dot = document.createElement("div");
      const size = Math.random() * 4 + 1;
      dot.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${Math.random() > 0.5 ? "#00d4ff" : "#8b5cf6"};
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        opacity: ${Math.random() * 0.6 + 0.2};
        animation: particle-float ${Math.random() * 4 + 3}s ease-in-out infinite;
        animation-delay: ${Math.random() * 4}s;
      `;
      container.appendChild(dot);
    }
    return () => { while (container.firstChild) container.removeChild(container.firstChild); };
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/81ffbd3b-5fe8-4a5e-8990-a337f47ce03d.jpg)` }}
      />
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#080c14]/30 to-[#080c14]" />

      <div ref={particlesRef} className="absolute inset-0 pointer-events-none" />

      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-[#00d4ff]/10 blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-[#8b5cf6]/10 blur-[100px] animate-pulse" style={{ animationDelay: "1.5s" }} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-32 pb-20 flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 text-center lg:text-left animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00d4ff]/30 bg-[#00d4ff]/5 text-[#00d4ff] text-sm font-body mb-6">
            <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
            Новый уровень коротких видео
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight mb-6">
            <span className="gradient-text">SHORT</span>
            <br />
            <span className="text-white">APP</span>
          </h1>

          <p className="font-body text-lg md:text-xl text-white/60 max-w-xl mb-10 leading-relaxed">
            Создавай, смотри и делись короткими видео с друзьями. Умный алгоритм подберёт контент именно для тебя.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <button
              onClick={() => scrollTo("download")}
              className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] text-[#080c14] font-bold text-lg hover:shadow-[0_0_40px_rgba(0,212,255,0.4)] transition-all duration-300 hover:scale-105 animate-pulse-glow"
            >
              <Icon name="Download" size={20} />
              Скачать бесплатно
            </button>
            <button
              onClick={() => scrollTo("features")}
              className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl border border-white/20 text-white/80 font-semibold text-lg hover:border-[#00d4ff]/50 hover:text-[#00d4ff] transition-all duration-300 hover:bg-[#00d4ff]/5"
            >
              <Icon name="Play" size={20} />
              Узнать больше
            </button>
          </div>

          <div className="flex items-center gap-8 mt-12 justify-center lg:justify-start">
            {[
              { value: "10K+", label: "Пользователей" },
              { value: "4.8", label: "Рейтинг" },
              { value: "∞", label: "Видео в день" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display text-2xl font-bold gradient-text">{stat.value}</div>
                <div className="font-body text-xs text-white/40 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex justify-center items-center">
          <div className="relative animate-float">
            <div className="absolute inset-0 rounded-[40px] bg-gradient-to-br from-[#00d4ff] to-[#8b5cf6] blur-2xl opacity-30 scale-110" />
            <div className="relative w-64 h-[520px] md:w-72 md:h-[580px] rounded-[40px] overflow-hidden border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.6)] neon-border">
              <img
                src="https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/8c5bdcfd-94c7-4f6f-8957-0890e7b683b8.jpg"
                alt="ShortApp Interface"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080c14]/80 via-transparent to-transparent" />
              <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6">
                {["Heart", "MessageCircle", "Share2"].map((icon) => (
                  <div key={icon} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                    <Icon name={icon as "Heart"} size={18} className="text-white" />
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ec4899] to-[#8b5cf6] flex items-center justify-center shadow-[0_0_20px_rgba(236,72,153,0.4)] animate-pulse">
              <Icon name="TrendingUp" size={24} className="text-white" />
            </div>
            <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#0ea5e9] flex items-center justify-center shadow-[0_0_20px_rgba(0,212,255,0.4)]">
              <Icon name="Sparkles" size={20} className="text-[#080c14]" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce opacity-50">
        <span className="text-xs text-white/40 font-body tracking-widest uppercase">Скролл</span>
        <Icon name="ChevronDown" size={18} className="text-[#00d4ff]" />
      </div>
    </section>
  );
};

export default Hero;
