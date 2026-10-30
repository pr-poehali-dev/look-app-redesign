import Icon from "@/components/ui/icon";

const BoardCollage = ({ images, cover }: { images?: string[]; cover?: string | null }) => {
  const list = (images && images.length ? images : cover ? [cover] : []).slice(0, 4);
  if (list.length === 0) {
    return <div className="w-full h-full flex items-center justify-center bg-white/5"><Icon name="LayoutGrid" size={32} className="text-white/20" /></div>;
  }
  if (list.length < 4) {
    return <img src={list[0]} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />;
  }
  return (
    <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5">
      {list.map((src, i) => (
        <img key={i} src={src} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
      ))}
    </div>
  );
};

export default BoardCollage;
