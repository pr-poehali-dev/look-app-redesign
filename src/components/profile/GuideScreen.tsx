import { useState } from "react";
import Icon from "@/components/ui/icon";
import guide from "@/data/guide.json";

const GuideScreen = ({ onBack }: { onBack: () => void }) => {
  const [open, setOpen] = useState<number>(0);

  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg truncate">{guide.title}</span>
        <div className="w-7" />
      </div>
      <div className="px-4 py-4 pb-24 md:max-w-[620px] md:mx-auto flex flex-col gap-3">
        <img src={guide.cover} alt="" className="w-full h-44 object-cover rounded-2xl" />
        <p className="text-gray-600 text-sm">{guide.intro}</p>
        {guide.sections.map((s, i) => (
          <div key={s.title} className="rounded-2xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? -1 : i)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-[#8b5cf6]/10 flex items-center justify-center flex-shrink-0">
                <Icon name={s.icon} fallback="CircleHelp" size={18} className="text-[#8b5cf6]" />
              </div>
              <span className="flex-1 text-black font-semibold text-sm">{i + 1}. {s.title}</span>
              <Icon name={open === i ? "ChevronUp" : "ChevronDown"} size={18} className="text-gray-400" />
            </button>
            {open === i && (
              <div className="px-4 pb-4 flex flex-col gap-3">
                <img src={s.image} alt="" className="w-full h-40 object-cover rounded-xl" loading="lazy" />
                <ol className="flex flex-col gap-2">
                  {s.points.map((p, k) => (
                    <li key={k} className="flex gap-2.5 text-sm text-gray-700">
                      <span className="w-5 h-5 rounded-full bg-[#FF5A3C] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{k + 1}</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ))}
        <a
          href="/guide.pdf"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 text-black font-semibold text-sm"
        >
          <Icon name="Download" size={16} />
          Скачать инструкцию в PDF
        </a>
      </div>
    </div>
  );
};

export default GuideScreen;
