import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { Article, fetchArticle, importArticleByUrl, saveArticle, useArticles } from "@/hooks/useArticles";
import { uploadProductImage } from "@/hooks/useProducts";
import { toast } from "sonner";

type View = { type: "list" } | { type: "read"; id: number } | { type: "edit"; article?: Article };

const Header = ({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) => (
  <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
    <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
    <span className="flex-1 text-center text-black font-bold text-lg truncate">{title}</span>
    <div className="w-7 flex justify-end">{right}</div>
  </div>
);

export const Reader = ({ id, onBack, onEdit }: { id: number; onBack: () => void; onEdit: (a: Article) => void }) => {
  const { user } = useAuth();
  const [a, setA] = useState<Article | null>(null);
  useEffect(() => { fetchArticle(id).then(setA); }, [id]);
  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <Header title="Статья" onBack={onBack} right={a && a.owner_user_id === user?.id ? (
        <button onClick={() => onEdit(a)}><Icon name="Pencil" size={18} className="text-black" /></button>
      ) : undefined} />
      {!a ? (
        <div className="py-20 flex justify-center"><div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" /></div>
      ) : (
        <article className="pb-16">
          {a.cover_image && <img src={a.cover_image} alt="" className="w-full max-h-72 object-cover" />}
          <div className="px-5 pt-5 flex flex-col gap-3">
            <h1 className="text-black text-2xl font-bold leading-tight">{a.title}</h1>
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200">
                {a.author_avatar && <img src={a.author_avatar} alt="" className="w-full h-full object-cover" />}
              </div>
              <span className="font-semibold text-black">{a.author_name}</span>
              <span>· {a.read_minutes} мин · {a.views} просм.</span>
            </div>
            <div className="text-black text-[15px] leading-relaxed whitespace-pre-wrap">{a.body}</div>
            {a.source_url && (
              <a href={a.source_url} target="_blank" rel="noopener noreferrer" className="text-[#8b5cf6] text-xs underline break-all">Источник</a>
            )}
          </div>
        </article>
      )}
    </div>
  );
};

const Editor = ({ article, onBack, onSaved }: { article?: Article; onBack: () => void; onSaved: () => void }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState(article?.title || "");
  const [body, setBody] = useState(article?.body || "");
  const [cover, setCover] = useState<string | null>(article?.cover_image || null);
  const [source, setSource] = useState<string | null>(article?.source_url || null);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const doImport = async () => {
    if (!user?.id || !importUrl.trim()) return;
    setImporting(true);
    const { article: imp, error } = await importArticleByUrl(user.id, importUrl.trim());
    setImporting(false);
    if (error || !imp) { toast.error(error || "Не удалось импортировать"); return; }
    setTitle(imp.title || title);
    setBody(imp.body || body);
    setCover(imp.cover_image || cover);
    setSource(imp.source_url || importUrl.trim());
    setImportUrl("");
    toast.success("Импортировано. Проверь текст перед публикацией");
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !user?.id) return;
    const url = await uploadProductImage(f, user.id);
    if (url) setCover(url); else toast.error("Не удалось загрузить обложку");
  };

  const save = async () => {
    if (!user?.id) return;
    if (!title.trim() || !body.trim()) { toast.error("Заполни заголовок и текст"); return; }
    setSaving(true);
    const ok = await saveArticle(user.id, { id: article?.id, title, body, cover_image: cover, source_url: source });
    setSaving(false);
    if (ok) { toast.success("Статья опубликована"); onSaved(); } else toast.error("Не удалось сохранить");
  };

  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <Header title={article ? "Редактирование" : "Новая статья"} onBack={onBack} />
      <div className="px-4 py-4 flex flex-col gap-3 pb-20">
        {!article && (
          <div className="rounded-2xl bg-gray-50 p-3 flex flex-col gap-2">
            <span className="text-black text-xs font-semibold flex items-center gap-1.5"><Icon name="Download" size={13} /> Импорт по ссылке</span>
            <div className="flex gap-2">
              <input value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="https://..."
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white border border-gray-200 text-black text-sm outline-none" />
              <button onClick={doImport} disabled={importing || !importUrl.trim()} className="px-3 rounded-xl bg-black text-white text-sm font-semibold disabled:opacity-50">
                {importing ? "..." : "Загрузить"}
              </button>
            </div>
            <p className="text-gray-400 text-[11px]">Подтянем заголовок, обложку и текст страницы. Закрытые страницы соцсетей (Instagram, VK) могут не открыться.</p>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        <button onClick={() => fileRef.current?.click()} className="w-full h-36 rounded-2xl bg-gray-100 overflow-hidden flex flex-col items-center justify-center gap-1 text-gray-500">
          {cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : (<><Icon name="Image" size={24} /><span className="text-xs">Добавить обложку</span></>)}
        </button>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Заголовок"
          className="w-full px-1 py-2 text-black text-xl font-bold outline-none border-b border-gray-100" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14} placeholder="Напиши свою статью..."
          className="w-full px-1 py-2 text-black text-[15px] leading-relaxed outline-none resize-none" />
        <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-black text-white font-bold text-sm disabled:opacity-60">
          {saving ? "Публикую..." : "Опубликовать"}
        </button>
      </div>
    </div>
  );
};

const ArticlesScreen = ({ onBack }: { onBack: () => void }) => {
  const [mode, setMode] = useState<"feed" | "mine">("feed");
  const [view, setView] = useState<View>({ type: "list" });
  const { articles, loading, refresh, remove } = useArticles(mode);
  const { user } = useAuth();

  if (view.type === "read") return <Reader id={view.id} onBack={() => setView({ type: "list" })} onEdit={(a) => setView({ type: "edit", article: a })} />;
  if (view.type === "edit") return <Editor article={view.article} onBack={() => setView({ type: "list" })} onSaved={() => { setView({ type: "list" }); refresh(); }} />;

  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <Header title="Статьи" onBack={onBack} right={<button onClick={() => setView({ type: "edit" })}><Icon name="Plus" size={22} className="text-black" /></button>} />
      <div className="flex gap-2 px-4 py-3">
        {([["feed", "Лента"], ["mine", "Мои"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setMode(id)} className={`px-4 py-1.5 rounded-full text-sm font-semibold ${mode === id ? "bg-black text-white" : "bg-gray-100 text-black"}`}>{label}</button>
        ))}
      </div>
      {loading ? (
        <div className="py-16 flex justify-center"><div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" /></div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 px-8 text-center">
          <Icon name="FileText" size={48} className="text-gray-300" />
          <p className="text-gray-400 text-sm">{mode === "mine" ? "У тебя пока нет статей" : "Пока никто не опубликовал статьи"}</p>
          <button onClick={() => setView({ type: "edit" })} className="px-5 py-2 rounded-xl bg-black text-white text-sm font-semibold">Написать статью</button>
        </div>
      ) : (
        <div className="px-4 pb-16 flex flex-col gap-3">
          {articles.map((a) => (
            <div key={a.id} className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-sm">
              <button onClick={() => setView({ type: "read", id: a.id })} className="w-full text-left">
                {a.cover_image && <img src={a.cover_image} alt="" className="w-full h-40 object-cover" loading="lazy" />}
                <div className="p-3 flex flex-col gap-1">
                  <p className="text-black font-bold text-base leading-snug line-clamp-2">{a.title}</p>
                  <p className="text-gray-500 text-sm line-clamp-2">{a.body}</p>
                  <p className="text-gray-400 text-[11px] pt-1">{a.author_name} · {a.read_minutes} мин · {a.views} просм.</p>
                </div>
              </button>
              {mode === "mine" && a.owner_user_id === user?.id && (
                <button onClick={() => remove(a.id)} className="w-full py-2 border-t border-gray-100 text-red-500 text-xs font-semibold">Удалить</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArticlesScreen;
