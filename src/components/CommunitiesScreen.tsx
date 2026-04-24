import { useState } from "react";
import Icon from "@/components/ui/icon";

const COMMUNITIES = [
  { id: 1, name: "Фотографы России", desc: "Делимся снимками, лайфхаками и вдохновением", type: "open", members: 14820, img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/dbf882bc-5b07-4604-a1fa-628313ce915f.jpg", category: "Фото", joined: true },
  { id: 2, name: "Клуб путешественников", desc: "Только для тех, кто уже побывал в 10+ странах", type: "closed", members: 3241, img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/a3325030-6571-46e9-845b-2a54062f9059.jpg", category: "Путешествия", joined: false },
  { id: 3, name: "Фитнес & ЗОЖ", desc: "Тренировки, питание, мотивация каждый день", type: "open", members: 28903, img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5b90e1a9-665b-4e6c-9184-2edf68db2e91.jpg", category: "Спорт", joined: true },
  { id: 4, name: "Геймеры ShortApp", desc: "Закрытое сообщество для хардкорных геймеров", type: "closed", members: 891, img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/45213a06-ddb6-4425-9410-cb3777726c55.jpg", category: "Игры", joined: false },
  { id: 5, name: "Кофейная культура", desc: "Всё о кофе: варка, обжарка, кофейни мира", type: "open", members: 7120, img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/0730a864-0860-4c86-8845-835a8c4a720e.jpg", category: "Еда", joined: false },
  { id: 6, name: "Ночная музыка", desc: "Закрытый клуб любителей электронной музыки", type: "closed", members: 2204, img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/c96bc59d-e416-4e11-adf2-a308d67a562d.jpg", category: "Музыка", joined: true },
];

const CATEGORIES = ["Все", "Фото", "Путешествия", "Спорт", "Игры", "Еда", "Музыка"];

interface Props { onBack: () => void; }

const CommunitiesScreen = ({ onBack }: Props) => {
  const [joined, setJoined] = useState<Record<number, boolean>>(
    Object.fromEntries(COMMUNITIES.map((c) => [c.id, c.joined]))
  );
  const [category, setCategory] = useState("Все");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"open" | "closed">("open");
  const [newDesc, setNewDesc] = useState("");
  const [created, setCreated] = useState<typeof COMMUNITIES[0] | null>(null);

  const handleJoin = (id: number, type: string) => {
    if (type === "closed" && !joined[id]) {
      alert("Заявка на вступление отправлена! Администратор рассмотрит её.");
      return;
    }
    setJoined((p) => ({ ...p, [id]: !p[id] }));
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    const newCom = {
      id: Date.now(),
      name: newName,
      desc: newDesc || "Новое сообщество",
      type: newType,
      members: 1,
      img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/014c6ddd-1707-4449-afdd-e9012de11b20.jpg",
      category: "Другое",
      joined: true,
    };
    setCreated(newCom);
    setJoined((p) => ({ ...p, [newCom.id]: true }));
    setShowCreate(false);
    setNewName("");
    setNewDesc("");
  };

  const filtered = [...(created ? [created] : []), ...COMMUNITIES].filter(
    (c) => category === "Все" || c.category === category
  );

  return (
    <div className="h-full bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-14 pb-3">
        <div className="flex items-center gap-2">
          <button onClick={onBack}>
            <Icon name="ChevronLeft" size={24} className="text-white" />
          </button>
          <h2 className="text-white font-bold text-xl">Сообщества</h2>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-[#fe2c55] px-3 py-1.5 rounded-full"
        >
          <Icon name="Plus" size={14} className="text-white" />
          <span className="text-white text-xs font-bold">Создать</span>
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-scroll" style={{ scrollbarWidth: "none" }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              category === cat ? "bg-white text-black" : "bg-white/10 text-white/60"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mx-4 mb-4 bg-[#111] rounded-2xl border border-white/10 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-white font-bold text-sm">Новое сообщество</span>
            <button onClick={() => setShowCreate(false)}>
              <Icon name="X" size={18} className="text-white/40" />
            </button>
          </div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название сообщества..."
            className="bg-white/8 rounded-xl px-3 py-2.5 text-white text-sm outline-none placeholder-white/30"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Описание (необязательно)..."
            className="bg-white/8 rounded-xl px-3 py-2.5 text-white text-sm outline-none placeholder-white/30"
          />
          <div className="flex gap-2">
            {(["open", "closed"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setNewType(t)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  newType === t ? "bg-[#fe2c55] text-white" : "bg-white/8 text-white/50"
                }`}
              >
                <Icon name={t === "open" ? "Globe" : "Lock"} size={14} />
                {t === "open" ? "Открытое" : "Закрытое"}
              </button>
            ))}
          </div>
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="py-2.5 rounded-xl bg-[#fe2c55] text-white font-bold text-sm disabled:opacity-40"
          >
            Создать
          </button>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-scroll px-4 flex flex-col gap-3" style={{ scrollbarWidth: "none" }}>
        {filtered.map((com) => (
          <div key={com.id} className="bg-[#111] rounded-2xl overflow-hidden border border-white/8">
            <div className="relative h-24">
              <img src={com.img} className="w-full h-full object-cover opacity-70" alt={com.name} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
                <Icon name={com.type === "open" ? "Globe" : "Lock"} size={10} className="text-white/70" />
                <span className="text-white/70 text-[10px]">{com.type === "open" ? "Открытое" : "Закрытое"}</span>
              </div>
              {joined[com.id] && (
                <div className="absolute top-2 left-2 bg-[#fe2c55] px-2 py-0.5 rounded-full">
                  <span className="text-white text-[10px] font-bold">Участник</span>
                </div>
              )}
              <div className="absolute bottom-2 left-3">
                <span className="text-white/50 text-[10px] bg-black/40 px-2 py-0.5 rounded-full">{com.category}</span>
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-white font-bold text-sm">{com.name}</h3>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Icon name="Users" size={11} className="text-white/30" />
                  <span className="text-white/40 text-xs">{com.members >= 1000 ? (com.members / 1000).toFixed(1) + "K" : com.members}</span>
                </div>
              </div>
              <p className="text-white/50 text-xs mb-3 leading-snug">{com.desc}</p>
              <button
                onClick={() => handleJoin(com.id, com.type)}
                className={`w-full py-2 rounded-xl text-sm font-bold transition-all ${
                  joined[com.id]
                    ? "bg-white/10 text-white/60"
                    : com.type === "closed"
                    ? "bg-white/10 text-white border border-white/20"
                    : "bg-[#fe2c55] text-white"
                }`}
              >
                {joined[com.id] ? "Вы участник" : com.type === "closed" ? "Подать заявку" : "Вступить"}
              </button>
            </div>
          </div>
        ))}
        <div className="pb-28" />
      </div>
    </div>
  );
};

export default CommunitiesScreen;
