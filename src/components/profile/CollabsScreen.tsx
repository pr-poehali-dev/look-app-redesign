import { useState } from "react";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { toast } from "sonner";
import { BrandCollab, CollabStatus, useBrandCollabs } from "@/hooks/useBrandCollabs";
import { openInBrowser } from "@/lib/externalLinks";

const STATUS_LABEL: Record<CollabStatus, string> = {
  pending: "Ждёт ответа",
  accepted: "Принято",
  declined: "Отклонено",
  published: "Пост опубликован",
  cancelled: "Отменено",
};

const STATUS_STYLE: Record<CollabStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-gray-100 text-gray-500",
  published: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const Badge = ({ status }: { status: CollabStatus }) => (
  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
);

const IncomingCard = ({ c, onRespond }: { c: BrandCollab; onRespond: (id: number, d: "accept" | "decline") => void }) => (
  <div className="rounded-2xl border border-gray-100 p-3 flex flex-col gap-2">
    <div className="flex items-center gap-2.5">
      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
        <UserAvatar src={c.brand_avatar || ""} name={c.brand_name} alt={c.brand_name} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-black text-sm font-semibold truncate">{c.brand_name}</p>
        <p className="text-gray-400 text-xs truncate">{c.brand_handle ? `@${c.brand_handle}` : ""}</p>
      </div>
      <Badge status={c.status} />
    </div>
    <p className="text-black text-sm font-medium">{c.product_title}</p>
    {c.message && <p className="text-gray-600 text-sm whitespace-pre-wrap break-words">{c.message}</p>}
    {c.product_url && (
      <button onClick={() => openInBrowser(c.product_url as string)} className="flex items-center gap-1.5 text-[#2AABEE] text-xs font-medium w-fit">
        <Icon name="ExternalLink" size={13} />
        Страница товара
      </button>
    )}
    {c.status === "pending" && (
      <div className="flex gap-2 pt-1">
        <button onClick={() => onRespond(c.id, "decline")} className="flex-1 py-2 rounded-xl bg-gray-100 text-black text-sm font-semibold">Отклонить</button>
        <button onClick={() => onRespond(c.id, "accept")} className="flex-1 py-2 rounded-xl bg-black text-white text-sm font-semibold">Принять</button>
      </div>
    )}
    {c.status === "accepted" && (
      <p className="text-gray-500 text-xs">Создайте пост и выберите это предложение в разделе «Предложение от бренда». Если это реклама, включите переключатель «Это реклама».</p>
    )}
  </div>
);

const OutgoingCard = ({ c, onCancel }: { c: BrandCollab; onCancel: (id: number) => void }) => (
  <div className="rounded-2xl border border-gray-100 p-3 flex flex-col gap-2">
    <div className="flex items-center gap-2.5">
      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
        <UserAvatar src={c.author_avatar || ""} name={c.author_handle || ""} alt={c.author_handle || ""} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-black text-sm font-semibold truncate">{c.author_handle ? `@${c.author_handle}` : "Автор"}</p>
        <p className="text-gray-400 text-xs truncate">{c.brand_name}: {c.product_title}</p>
      </div>
      <Badge status={c.status} />
    </div>
    {(c.status === "pending" || c.status === "accepted") && (
      <button onClick={() => onCancel(c.id)} className="text-gray-500 text-xs font-medium w-fit">Отозвать предложение</button>
    )}
  </div>
);

const SendForm = ({ onSent }: { onSent: () => void }) => {
  const { send } = useBrandCollabs("outgoing");
  const [authorHandle, setAuthorHandle] = useState("");
  const [brandName, setBrandName] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const field = "w-full bg-gray-100 rounded-xl px-3 py-2.5 text-sm text-black placeholder:text-gray-400 outline-none";

  const submit = async () => {
    setBusy(true);
    const r = await send({ author_handle: authorHandle, brand_name: brandName, product_title: title, message, product_url: url });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Предложение отправлено автору");
    setAuthorHandle(""); setTitle(""); setMessage(""); setUrl("");
    onSent();
  };

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-gray-50 p-3">
      <input value={authorHandle} onChange={(e) => setAuthorHandle(e.target.value)} placeholder="Логин автора, например @anna" className={field} />
      <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Название вашего бренда" className={field} maxLength={80} />
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Какой товар на обзор" className={field} maxLength={200} />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Сообщение автору: условия, сроки, пожелания" rows={3} className={`${field} resize-none`} maxLength={1000} />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Ссылка на товар, https://… (необязательно)" className={field} />
      <button
        onClick={submit}
        disabled={busy || !authorHandle.trim() || !brandName.trim() || !title.trim()}
        className="py-2.5 rounded-xl bg-black text-white text-sm font-semibold disabled:opacity-40"
      >
        {busy ? "Отправляю..." : "Отправить предложение"}
      </button>
    </div>
  );
};

const CollabsScreen = ({ onBack }: { onBack: () => void }) => {
  const [tab, setTab] = useState<"incoming" | "outgoing">("incoming");
  const incoming = useBrandCollabs("incoming");
  const outgoing = useBrandCollabs("outgoing");
  const [showForm, setShowForm] = useState(false);

  const respond = async (id: number, d: "accept" | "decline") => {
    const ok = await incoming.respond(id, d);
    if (ok) toast.success(d === "accept" ? "Предложение принято" : "Предложение отклонено");
    else toast.error("Не удалось ответить");
  };

  const list = tab === "incoming" ? incoming : outgoing;

  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg pr-7">Предложения брендов</span>
      </div>

      <div className="flex gap-2 px-4 py-3">
        {([["incoming", "Мне"], ["outgoing", "От меня"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold ${tab === id ? "bg-black text-white" : "bg-gray-100 text-gray-600"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 px-4 pb-8">
        {tab === "outgoing" && (
          showForm ? <SendForm onSent={() => { setShowForm(false); outgoing.reload(); }} /> : (
            <button onClick={() => setShowForm(true)} className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 text-black text-sm font-semibold">
              <Icon name="Plus" size={16} />
              Предложить товар автору
            </button>
          )
        )}

        {list.loading && list.collabs.length === 0 ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : list.collabs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            {tab === "incoming" ? "Пока нет предложений от брендов" : "Вы ещё не отправляли предложений"}
          </p>
        ) : tab === "incoming" ? (
          incoming.collabs.map((c) => <IncomingCard key={c.id} c={c} onRespond={respond} />)
        ) : (
          outgoing.collabs.map((c) => <OutgoingCard key={c.id} c={c} onCancel={async (id) => { await outgoing.cancel(id); }} />)
        )}
      </div>
    </div>
  );
};

export default CollabsScreen;
