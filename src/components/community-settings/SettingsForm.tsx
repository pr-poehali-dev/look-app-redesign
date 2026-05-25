import { RefObject } from "react";
import Icon from "@/components/ui/icon";
import { CATEGORIES, Community } from "./types";

interface Props {
  community: Community;
  isOwner: boolean;
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  type: "open" | "closed";
  setType: (t: "open" | "closed") => void;
  category: string;
  setCategory: (c: string) => void;
  displayImg: string;
  fileRef: RefObject<HTMLInputElement>;
  onPickImage: () => void;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  linkCopied: boolean;
  onShareLink: () => void;
  onCopyLink: () => void;
  onShowInvite: () => void;
  pendingCount: number;
  onShowRequests: () => void;
  deleting: boolean;
  onDelete: () => void;
}

const SettingsForm = ({
  community,
  isOwner,
  name,
  setName,
  description,
  setDescription,
  type,
  setType,
  category,
  setCategory,
  displayImg,
  fileRef,
  onPickImage,
  onImageChange,
  linkCopied,
  onShareLink,
  onCopyLink,
  onShowInvite,
  pendingCount,
  onShowRequests,
  deleting,
  onDelete,
}: Props) => {
  return (
    <div className="flex-1 overflow-y-scroll px-4 pb-28 flex flex-col gap-4" style={{ scrollbarWidth: "none" }}>
      <div className="relative h-40 rounded-2xl overflow-hidden bg-[#111] border border-white/10">
        {displayImg ? (
          <img src={displayImg} className="w-full h-full object-cover" alt={name} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#fe2c55]/30 to-[#8b5cf6]/30" />
        )}
        {isOwner && (
          <button
            onClick={onPickImage}
            className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-full flex items-center gap-1.5"
          >
            <Icon name="Camera" size={14} className="text-white" />
            <span className="text-white text-xs font-semibold">Изменить фото</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onImageChange} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-white/50 text-xs font-semibold uppercase tracking-wide">Название</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!isOwner}
          placeholder="Название сообщества"
          className="bg-[#111] rounded-xl px-3 py-3 text-white text-sm outline-none placeholder-zinc-500 border border-white/10 disabled:opacity-60"
          maxLength={80}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-white/50 text-xs font-semibold uppercase tracking-wide">Описание</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!isOwner}
          placeholder="О чём это сообщество..."
          rows={3}
          className="bg-[#111] rounded-xl px-3 py-3 text-white text-sm outline-none placeholder-zinc-500 border border-white/10 resize-none disabled:opacity-60"
          maxLength={500}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-white/50 text-xs font-semibold uppercase tracking-wide">Тип</label>
        <div className="flex gap-2">
          {(["open", "closed"] as const).map((t) => (
            <button
              key={t}
              onClick={() => isOwner && setType(t)}
              disabled={!isOwner}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${
                type === t ? "bg-[#fe2c55] text-white" : "bg-white/8 text-white/50"
              }`}
            >
              <Icon name={t === "open" ? "Globe" : "Lock"} size={14} />
              {t === "open" ? "Открытое" : "Закрытое"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-white/50 text-xs font-semibold uppercase tracking-wide">Категория</label>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => isOwner && setCategory(c)}
              disabled={!isOwner}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-60 ${
                category === c ? "bg-white text-black" : "bg-white/10 text-white/60"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-2">
        <label className="text-white/50 text-xs font-semibold uppercase tracking-wide">Пригласить друзей</label>
        <div className="flex gap-2">
          <button
            onClick={onShowInvite}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#fe2c55] text-white text-sm font-bold"
          >
            <Icon name="UserPlus" size={16} />
            Выбрать друзей
          </button>
          <button
            onClick={onShareLink}
            className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold flex items-center gap-2"
            title="Поделиться ссылкой"
          >
            <Icon name="Share2" size={16} />
          </button>
          <button
            onClick={onCopyLink}
            className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold flex items-center gap-2"
            title="Скопировать ссылку"
          >
            <Icon name={linkCopied ? "Check" : "Link"} size={16} className={linkCopied ? "text-green-400" : ""} />
          </button>
        </div>
        {linkCopied && <span className="text-green-400 text-xs">Ссылка скопирована</span>}
      </div>

      {isOwner && type === "closed" && (
        <div className="flex flex-col gap-1.5 mt-2">
          <label className="text-white/50 text-xs font-semibold uppercase tracking-wide">Заявки на вступление</label>
          <button
            onClick={onShowRequests}
            className="flex items-center justify-between bg-[#111] rounded-xl border border-white/10 p-3 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center">
                <Icon name="UserCheck" size={18} className="text-[#8b5cf6]" />
              </div>
              <div className="text-left">
                <div className="text-white font-bold text-sm">
                  {pendingCount > 0
                    ? `${pendingCount} ${pendingCount === 1 ? "заявка" : pendingCount < 5 ? "заявки" : "заявок"}`
                    : "Нет заявок"}
                </div>
                <div className="text-white/50 text-xs">от пользователей</div>
              </div>
            </div>
            <Icon name="ChevronRight" size={18} className="text-white/40" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1.5 mt-2">
        <label className="text-white/50 text-xs font-semibold uppercase tracking-wide">Статистика</label>
        <div className="bg-[#111] rounded-xl border border-white/10 p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#fe2c55]/20 flex items-center justify-center">
            <Icon name="Users" size={18} className="text-[#fe2c55]" />
          </div>
          <div>
            <div className="text-white font-bold text-sm">{community.members}</div>
            <div className="text-white/50 text-xs">участников</div>
          </div>
        </div>
      </div>

      {isOwner && (
        <button
          onClick={onDelete}
          disabled={deleting}
          className="mt-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 text-sm font-bold hover:bg-red-500/25 transition-colors disabled:opacity-40"
        >
          <Icon name="Trash2" size={16} />
          {deleting ? "Удаляем..." : "Удалить сообщество"}
        </button>
      )}
    </div>
  );
};

export default SettingsForm;
