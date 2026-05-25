import Icon from "@/components/ui/icon";

interface LandingProps {
  onLogin: () => void;
  onRegister: () => void;
}

const FEATURE_IMAGES = [
  "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/6848ec6e-1368-41f4-91fc-859f91fd23ca.jpg",
  "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/b16f1a22-02c2-4565-8f99-73ee4e2c5ce4.jpg",
  "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/feda160a-d236-46c2-bf99-65f6b79f82ff.jpg",
];

const REELS = [
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/67552085-497a-4ff6-b406-51050d80b538.jpg", author: "@nika_dance", likes: "284K", tag: "Танцы" },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/dfa004c8-15bd-44fe-95e0-3c01da267d96.jpg", author: "@max_skate", likes: "612K", tag: "Спорт" },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/6f09c533-c61e-404a-9fe0-9fd393dd0ab0.jpg", author: "@chef_artem", likes: "189K", tag: "Еда" },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/7e102e85-d141-430c-b9e2-deda9adc9d1d.jpg", author: "@travel_lena", likes: "457K", tag: "Путешествия" },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/15fde823-8587-4f53-b3dd-48febcf4e041.jpg", author: "@beauty_kate", likes: "326K", tag: "Красота" },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/e455541f-4a06-4bfc-b50e-7ffe80e8849a.jpg", author: "@gamezone", likes: "743K", tag: "Игры" },
];

const FEATURES = [
  { icon: "Video", title: "Короткие видео", desc: "Снимай и смотри ролики с фильтрами, эффектами и музыкой" },
  { icon: "Users", title: "Сообщества", desc: "Находи единомышленников по интересам — от музыки до спорта" },
  { icon: "Radio", title: "Прямые эфиры", desc: "Веди стримы, общайся в реальном времени и собирай аудиторию" },
  { icon: "MessageCircle", title: "Чаты и звонки", desc: "Общайся приватно или в группах — голос, видео, сообщения" },
];

const Landing = ({ onLogin, onRegister }: LandingProps) => {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-black text-white">
      {/* Background gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-[#22e0a1]/20 blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[460px] h-[460px] rounded-full bg-[#fe2c55]/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[480px] h-[480px] rounded-full bg-[#8b5cf6]/15 blur-3xl" />
      </div>

      <div className="relative">
        {/* Navbar */}
        <header className="px-5 md:px-10 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-white/15">
              <img
                src="https://static.rustore.ru/imgproxy/vs3_tA6Fiyv_VxNKTcByf1sXvc4-Qy2G_VlA-uzDgTs/preset:web_app_icon_62/plain/https://static.rustore.ru/2025/9/16/49/apk/2063656157/content/ICON/586db88b-5139-4dc5-b8f4-5a7e07f892ba.png@webp"
                alt="Лоок"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-black text-2xl bg-gradient-to-r from-[#22e0a1] to-[#22d3ee] bg-clip-text text-transparent">Лоок</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={onLogin}
              className="px-4 py-2 rounded-full text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              Войти
            </button>
            <button
              onClick={onRegister}
              className="px-5 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-[#22e0a1] to-[#22d3ee] text-black hover:opacity-90 transition-opacity"
            >
              Регистрация
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="px-5 md:px-10 pt-6 pb-12 grid md:grid-cols-2 gap-10 items-center max-w-6xl mx-auto">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-white/80 mb-5 border border-white/10">
              <Icon name="Sparkles" size={12} className="text-[#22e0a1]" />
              Социальная сеть нового поколения
            </span>
            <h1 className="font-black text-4xl md:text-6xl leading-[1.05] mb-5">
              Смотри.{" "}
              <span className="bg-gradient-to-r from-[#22e0a1] via-[#22d3ee] to-[#8b5cf6] bg-clip-text text-transparent">
                Делись.
              </span>
              <br />
              <span className="bg-gradient-to-r from-[#fe2c55] via-[#8b5cf6] to-[#22d3ee] bg-clip-text text-transparent">
                Общайся.
              </span>{" "}
              Будь собой.
            </h1>
            <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-lg">
              Короткие видео, прямые эфиры, чаты, сообщества — всё, что нужно, чтобы заявить о себе и найти своих.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onRegister}
                className="px-7 py-4 rounded-2xl text-base font-bold bg-gradient-to-r from-[#22e0a1] to-[#22d3ee] text-black shadow-lg shadow-[#22e0a1]/20 hover:shadow-xl hover:shadow-[#22e0a1]/30 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Начать бесплатно
                <Icon name="ArrowRight" size={18} />
              </button>
              <button
                onClick={onLogin}
                className="px-7 py-4 rounded-2xl text-base font-bold bg-white/10 backdrop-blur text-white hover:bg-white/15 transition-colors active:scale-95 flex items-center justify-center gap-2 border border-white/10"
              >
                <Icon name="LogIn" size={18} />
                У меня уже есть аккаунт
              </button>
            </div>
            <div className="flex items-center gap-4 mt-8 text-white/40 text-sm">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#22e0a1] to-[#22d3ee] border-2 border-black" />
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] border-2 border-black" />
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#22d3ee] border-2 border-black" />
              </div>
              <span>Тысячи авторов уже с нами</span>
            </div>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 gap-3">
              <div className="aspect-[3/4] rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
                <img src={FEATURE_IMAGES[0]} alt="Создавай контент" className="w-full h-full object-cover" />
              </div>
              <div className="space-y-3 pt-8">
                <div className="aspect-square rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
                  <img src={FEATURE_IMAGES[1]} alt="Делись эмоциями" className="w-full h-full object-cover" />
                </div>
                <div className="aspect-square rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
                  <img src={FEATURE_IMAGES[2]} alt="Будь собой" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-5 md:px-10 py-12 max-w-6xl mx-auto">
          <h2 className="text-center text-3xl md:text-4xl font-black mb-3">
            Всё, что нужно для творчества
          </h2>
          <p className="text-center text-white/50 mb-10 max-w-xl mx-auto">
            Снимай, делись, общайся, веди эфиры — в одном приложении
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="p-5 rounded-3xl bg-white/5 backdrop-blur border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#22e0a1] to-[#22d3ee] flex items-center justify-center mb-4">
                  <Icon name={f.icon as "Video"} size={22} className="text-black" />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Live animated reels feed */}
        <section className="py-12 overflow-hidden">
          <div className="px-5 md:px-10 max-w-6xl mx-auto mb-10 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fe2c55]/20 text-xs font-semibold text-[#fe2c55] mb-4 border border-[#fe2c55]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#fe2c55] animate-pulse" />
              Прямо сейчас в Лоок
            </span>
            <h2 className="text-3xl md:text-4xl font-black mb-3">
              Тысячи видео.{" "}
              <span className="bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] bg-clip-text text-transparent">
                Каждую секунду.
              </span>
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Танцы, спорт, путешествия, еда — что бы ты ни любил, твоя лента уже ждёт
            </p>
          </div>

          {/* Marquee row 1 — left direction */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 w-20 md:w-32 z-10 bg-gradient-to-r from-black to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-20 md:w-32 z-10 bg-gradient-to-l from-black to-transparent pointer-events-none" />
            <div className="flex gap-4 marquee-left">
              {[...REELS, ...REELS, ...REELS].map((r, i) => (
                <div
                  key={`row1-${i}`}
                  className="relative flex-shrink-0 w-44 md:w-56 aspect-[9/16] rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-2xl group"
                >
                  <img src={r.img} alt={r.author} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur text-white text-[10px] font-semibold">
                    #{r.tag}
                  </span>
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fe2c55]/90 text-white text-[10px] font-bold">
                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                    LIVE
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white font-bold text-sm truncate">{r.author}</p>
                    <div className="flex items-center gap-1.5 text-white/80 text-xs">
                      <Icon name="Heart" size={11} className="fill-[#fe2c55] text-[#fe2c55]" />
                      <span>{r.likes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Marquee row 2 — right direction */}
          <div className="relative mt-4">
            <div className="absolute inset-y-0 left-0 w-20 md:w-32 z-10 bg-gradient-to-r from-black to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-20 md:w-32 z-10 bg-gradient-to-l from-black to-transparent pointer-events-none" />
            <div className="flex gap-4 marquee-right">
              {[...REELS.slice().reverse(), ...REELS.slice().reverse(), ...REELS.slice().reverse()].map((r, i) => (
                <div
                  key={`row2-${i}`}
                  className="relative flex-shrink-0 w-44 md:w-56 aspect-[9/16] rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-2xl group"
                >
                  <img src={r.img} alt={r.author} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur text-white text-[10px] font-semibold">
                    #{r.tag}
                  </span>
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div>
                      <p className="text-white font-bold text-sm truncate">{r.author}</p>
                      <div className="flex items-center gap-1.5 text-white/80 text-xs">
                        <Icon name="Eye" size={11} className="text-white/80" />
                        <span>{r.likes}</span>
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center">
                      <Icon name="Play" size={14} className="text-white fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 md:px-10 py-12 max-w-4xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden p-8 md:p-12 bg-gradient-to-br from-[#22e0a1]/20 via-[#22d3ee]/15 to-[#8b5cf6]/20 border border-white/10 text-center">
            <div className="absolute inset-0 backdrop-blur-2xl bg-black/20" />
            <div className="relative">
              <h2 className="font-black text-3xl md:text-4xl mb-3">Готов стать звездой?</h2>
              <p className="text-white/70 mb-7 max-w-md mx-auto">
                Регистрация занимает 30 секунд. Никаких сложностей — просто будь собой.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={onRegister}
                  className="px-8 py-4 rounded-2xl text-base font-bold bg-gradient-to-r from-[#22e0a1] to-[#22d3ee] text-black shadow-lg hover:shadow-xl transition-all active:scale-95"
                >
                  Создать аккаунт
                </button>
                <button
                  onClick={onLogin}
                  className="px-8 py-4 rounded-2xl text-base font-bold bg-white/10 text-white hover:bg-white/15 border border-white/10 transition-colors active:scale-95"
                >
                  Войти
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-5 md:px-10 py-8 text-center text-white/30 text-sm">
          © {new Date().getFullYear()} Лоок — Смотри. Делись. Общайся. Будь собой.
        </footer>
      </div>
    </div>
  );
};

export default Landing;