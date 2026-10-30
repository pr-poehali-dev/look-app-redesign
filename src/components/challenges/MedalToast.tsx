import { useEffect } from "react";
import Icon from "@/components/ui/icon";

const MedalToast = ({ title, onClose }: { title: string; onClose: () => void }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="anim-medal flex flex-col items-center gap-3 rounded-[20px] bg-[#FFE9E3] border border-[#FF5A3C]/30 px-8 py-7">
        <div className="w-20 h-20 rounded-full bg-[#FF5A3C] flex items-center justify-center shadow-lg">
          <Icon name="Award" size={40} className="text-white" />
        </div>
        <p className="text-[#1A1A18] font-bold text-lg text-center">Бейдж получен</p>
        <p className="text-[#6B6B66] text-sm text-center">«{title}»</p>
      </div>
    </div>
  );
};

export default MedalToast;
