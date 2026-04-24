import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";

const features = [
  {
    icon: "Zap",
    title: "Умная лента",
    desc: "Алгоритм изучает твои предпочтения и показывает только то, что тебе интересно — без лишнего шума.",
    color: "#00d4ff",
    gradient: "from-[#00d4ff]/20 to-transparent",
  },
  {
    icon: "Video",
    title: "Съёмка в приложении",
    desc: "Записывай видео прямо в ShortApp с фильтрами, музыкой и эффектами в один клик.",
    color: "#8b5cf6",
    gradient: "from-[#8b5cf6]/20 to-transparent",
  },
  {
    icon: "Share2",
    title: "Мгновенный шеринг",
    desc: "Делись видео с друзьями через любые мессенджеры или публикуй в своём профиле за секунды.",
    color: "#ec4899",
    gradient: "from-[#ec4899]/20 to-transparent",
  },
  {
    icon: "TrendingUp",
    title: "Тренды в реальном времени",
    desc: "Всегда в курсе того, что сейчас популярно. Живой раздел трендов обновляется каждый час.",
    color: "#10b981",
    gradient: "from-[#10b981]/20 to-transparent",
  },
  {
    icon: "Music",
    title: "Библиотека музыки",
    desc: "Тысячи треков для твоих видео. Добавляй саундтрек одним нажатием и делай контент ярче.",
    color: "#f59e0b",
    gradient: "from-[#f59e0b]/20 to-transparent",
  },
  {
    icon: "ShieldCheck",
    title: "Приватность и безопасность",
    desc: "Управляй тем, кто видит твой контент. Гибкие настройки приватности под каждый пост.",
    color: "#00d4ff",
    gradient: "from-[#00d4ff]/20 to-transparent",
  },
];

const FeatureCard = ({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="group relative rounded-3xl border border-white/8 bg-[#0d1220]/80 backdrop-blur-sm p-7 card-hover overflow-hidden"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        transition: `all 0.6s ease ${index * 0.1}s`,
      }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div
        className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: `${feature.color}15`, border: `1px solid ${feature.color}30` }}
      >
        <Icon name={feature.icon as "Zap"} size={26} style={{ color: feature.color }} />
      </div>
      <h3 className="relative font-display text-xl text-white mb-3 tracking-wide">{feature.title}</h3>
      <p className="relative font-body text-sm text-white/50 leading-relaxed">{feature.desc}</p>
      <div
        className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500"
        style={{ background: `linear-gradient(90deg, ${feature.color}, transparent)` }}
      />
    </div>
  );
};

const Features = () => {
  const titleRef = useRef<HTMLDivElement>(null);
  const [titleVisible, setTitleVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setTitleVisible(true); },
      { threshold: 0.2 }
    );
    if (titleRef.current) observer.observe(titleRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-[#8b5cf6]/5 blur-[120px]" />

      <div className="relative max-w-6xl mx-auto px-6">
        <div
          ref={titleRef}
          className="text-center mb-20"
          style={{
            opacity: titleVisible ? 1 : 0,
            transform: titleVisible ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.7s ease",
          }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#8b5cf6]/30 bg-[#8b5cf6]/5 text-[#8b5cf6] text-sm font-body mb-6">
            <Icon name="Sparkles" size={14} />
            Возможности
          </div>
          <h2 className="font-display text-4xl md:text-6xl font-bold text-white mb-4">
            Всё что нужно
            <br />
            <span className="gradient-text">для крутого контента</span>
          </h2>
          <p className="font-body text-white/50 text-lg max-w-xl mx-auto">
            ShortApp объединяет лучшие инструменты для создания и просмотра видео
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
