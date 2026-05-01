import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";

interface EditProfileScreenProps {
  onBack: () => void;
  profile: { name: string; bio: string; avatar: string };
  onSave: (profile: { name: string; bio: string; avatar: string }) => void;
}

const EditProfileScreen = ({ onBack, profile, onSave }: EditProfileScreenProps) => {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState(profile.avatar);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatar(url);
  };

  const handleSave = () => {
    onSave({ name, bio, avatar });
    onBack();
  };

  return (
    <div className="h-full bg-gray-100 overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="md:max-w-2xl md:mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 md:pt-10 md:pb-3 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1">
          <Icon name="ArrowLeft" size={22} className="text-black" />
        </button>
        <span className="flex-1 text-center text-black font-bold text-lg md:text-base">Редактировать профиль</span>
        <button onClick={handleSave} className="text-[#8b5cf6] font-semibold text-sm md:text-xs">
          Готово
        </button>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center py-8 md:py-5 bg-white mt-2">
        <div className="relative">
          <div className="w-24 h-24 md:w-20 md:h-20 rounded-full overflow-hidden">
            <UserAvatar src={avatar} name={name} alt="avatar" />
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 md:w-7 md:h-7 rounded-full bg-[#8b5cf6] flex items-center justify-center border-2 border-white"
          >
            <Icon name="Camera" size={14} className="text-white" />
          </button>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="mt-3 md:mt-2 text-[#8b5cf6] font-semibold text-sm md:text-xs"
        >
          Изменить фото
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      </div>

      {/* Fields */}
      <div className="mt-2">
        <div className="px-4 py-2 bg-gray-100">
          <span className="text-gray-400 text-xs font-semibold tracking-widest uppercase">Основное</span>
        </div>

        <div className="bg-white border-b border-gray-100 px-4 py-3 md:py-2.5">
          <p className="text-gray-400 text-xs mb-1">Имя</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Введите имя"
            className="w-full text-black text-base md:text-sm outline-none bg-transparent"
            maxLength={50}
          />
        </div>

        <div className="bg-white border-b border-gray-100 px-4 py-3 md:py-2.5">
          <p className="text-gray-400 text-xs mb-1">О себе</p>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Расскажи о себе..."
            className="w-full text-black text-base md:text-sm outline-none bg-transparent resize-none"
            rows={3}
            maxLength={150}
          />
          <p className="text-gray-300 text-xs text-right mt-1">{bio.length}/150</p>
        </div>
      </div>

      {/* Save button */}
      <div className="px-4 mt-6 md:mt-4">
        <button
          onClick={handleSave}
          className="w-full py-3.5 md:py-2.5 rounded-2xl bg-[#8b5cf6] text-white font-bold text-base md:text-sm"
        >
          Сохранить изменения
        </button>
      </div>

      <div className="pb-28" />
      </div>
    </div>
  );
};

export default EditProfileScreen;