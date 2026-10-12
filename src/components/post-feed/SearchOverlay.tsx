import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { Post } from "./PostFeedTypes";
import { Product } from "@/hooks/useProducts";
import { Reader } from "@/components/profile/ArticlesScreen";
import { toPost } from "@/components/MediaDeepLink";
import SearchVideoViewer from "./SearchVideoViewer";
import UserProfileModal from "@/components/UserProfileModal";

const SEARCH_URL = "https://functions.poehali.dev/7f681f12-fcd3-45e4-aa45-38fccd3d0760";

interface VideoHit { id: number; url: string; thumbnail: string | null; author: string; handle: string; description: string; likes: string }
interface ArticleHit { id: number; title: string; cover: string | null; views: number }
interface PersonHit { id: string; name: string; handle: string; avatar: string | null; is_verified: boolean }

const PRODUCTS_URL = "https://functions.poehali.dev/c4d3aa37-b7c2-4047-880a-ab17127da315";

const RECENT_KEY = "search_recent_v1";

const readRecent = (): string[] => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeRecent = (list: string[]) => {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 10))); } catch { /* ignore */ }
};

interface Props {
  posts: Post[];
  onClose: () => void;
  onOpenPost: (post: Post) => void;
}

const SearchOverlay = ({ posts, onClose, onOpenPost }: Props) => {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>(readRecent);
  const [resultTab, setResultTab] = useState<"posts" | "videos" | "people" | "articles" | "products">("posts");
  const [videoHits, setVideoHits] = useState<VideoHit[]>([]);
  const [people, setPeople] = useState<PersonHit[]>([]);
  const [postHits, setPostHits] = useState<Post[]>([]);
  const [sort, setSort] = useState<"new" | "popular">("new");
  const [period, setPeriod] = useState<"all" | "day" | "week" | "month">("all");
  const [fuzzy, setFuzzy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggest, setShowSuggest] = useState(true);
  const [articles, setArticles] = useState<ArticleHit[]>([]);
  const [openArticleId, setOpenArticleId] = useState<number | null>(null);
  const [extraLoading, setExtraLoading] = useState(false);
  const [openVideoId, setOpenVideoId] = useState<number | null>(null);
  const [openHandle, setOpenHandle] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setProducts([]); return; }
    let cancelled = false;
    setProductsLoading(true);
    const timeout = setTimeout(() => {
      fetch(`${PRODUCTS_URL}?action=search&q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((raw) => {
          const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
          if (!cancelled) setProducts(data.products || []);
        })
        .catch(() => { if (!cancelled) setProducts([]); })
        .finally(() => { if (!cancelled) setProductsLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [query]);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setVideoHits([]); setPeople([]); setArticles([]); setPostHits([]); setFuzzy(false); return; }
    let cancelled = false;
    setExtraLoading(true);
    const timeout = setTimeout(() => {
      const load = (kind: string) =>
        fetch(`${SEARCH_URL}?kind=${kind}&sort=${sort}&period=${period}&q=${encodeURIComponent(q)}`)
          .then((r) => r.json())
          .then((raw) => (typeof raw.body === "string" ? JSON.parse(raw.body) : raw))
          .catch(() => ({ items: [] }));
      Promise.all([load("post"), load("video"), load("people"), load("article")]).then(([po, v, pe, a]) => {
        if (cancelled) return;
        setPostHits((po.items || []).map(toPost));
        setVideoHits(v.items || []);
        setPeople(pe.items || []);
        setArticles(a.items || []);
        setFuzzy(!!(po.fuzzy || v.fuzzy || pe.fuzzy || a.fuzzy));
        setExtraLoading(false);
      });
    }, 300);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [query, sort, period]);

  useEffect(() => {
    const q = query.trim();
    if (!q || !showSuggest) { setSuggestions([]); return; }
    let cancelled = false;
    const timeout = setTimeout(() => {
      fetch(`${SEARCH_URL}?kind=suggest&q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((raw) => {
          const d = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
          if (!cancelled) setSuggestions(d.suggestions || []);
        })
        .catch(() => { if (!cancelled) setSuggestions([]); });
    }, 200);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [query, showSuggest]);

  const applySuggestion = (sg: string) => {
    const words = query.trim().split(/\s+/);
    words[words.length - 1] = sg;
    setShowSuggest(false);
    setQuery(words.join(" "));
  };

  const trending = useMemo(() => {
    const freq: Record<string, number> = {};
    posts.forEach((p) => p.hashtags.forEach((t) => { freq[t] = (freq[t] || 0) + 1; }));
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([tag]) => tag);
  }, [posts]);

  const results = postHits;

  const commitSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const next = [trimmed, ...recent.filter((r) => r !== trimmed)];
    setRecent(next);
    writeRecent(next);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9997] bg-black flex flex-col">
      <div className="flex items-center gap-2 px-3 pt-12 pb-3 flex-shrink-0 border-b border-white/8">
        <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-full px-3 py-2">
          <Icon name="Search" size={16} className="text-white/50 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setShowSuggest(true); setQuery(e.target.value); }}
            onKeyDown={(e) => e.key === "Enter" && commitSearch(query)}
            placeholder={`Поиск: "точная фраза", -исключить`}
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/40 min-w-0"
          />
          {query && (
            <button onClick={() => setQuery("")}>
              <Icon name="X" size={14} className="text-white/50" />
            </button>
          )}
        </div>
        <button onClick={onClose} className="text-white text-sm font-medium px-1 flex-shrink-0">Отмена</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: "none" }}>
        {query.trim() ? (
          <>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {suggestions.map((sg) => (
                  <button key={sg} onClick={() => applySuggestion(sg)} className="px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs">
                    {sg}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 mb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {([["new", "Новые"], ["popular", "Популярные"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setSort(k)} className={`px-3 py-1 rounded-full text-[11px] flex-shrink-0 border ${sort === k ? "border-white text-white" : "border-white/15 text-white/50"}`}>{l}</button>
              ))}
              <span className="w-px h-4 bg-white/15 flex-shrink-0" />
              {([["all", "За всё время"], ["day", "Сутки"], ["week", "Неделя"], ["month", "Месяц"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setPeriod(k)} className={`px-3 py-1 rounded-full text-[11px] flex-shrink-0 border ${period === k ? "border-white text-white" : "border-white/15 text-white/50"}`}>{l}</button>
              ))}
            </div>
            {fuzzy && <p className="text-white/40 text-xs mb-3">Показаны похожие результаты (с учётом опечаток)</p>}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setResultTab("posts")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${resultTab === "posts" ? "bg-white text-black" : "bg-white/10 text-white/60"}`}
              >
                Посты {results.length > 0 ? `(${results.length})` : ""}
              </button>
              <button
                onClick={() => setResultTab("videos")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${resultTab === "videos" ? "bg-white text-black" : "bg-white/10 text-white/60"}`}
              >
                Видео {videoHits.length > 0 ? `(${videoHits.length})` : ""}
              </button>
              <button
                onClick={() => setResultTab("people")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${resultTab === "people" ? "bg-white text-black" : "bg-white/10 text-white/60"}`}
              >
                Люди {people.length > 0 ? `(${people.length})` : ""}
              </button>
              <button
                onClick={() => setResultTab("articles")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${resultTab === "articles" ? "bg-white text-black" : "bg-white/10 text-white/60"}`}
              >
                Статьи {articles.length > 0 ? `(${articles.length})` : ""}
              </button>
              <button
                onClick={() => setResultTab("products")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 ${resultTab === "products" ? "bg-white text-black" : "bg-white/10 text-white/60"}`}
              >
                <Icon name="ShoppingBag" size={12} />
                Товары {products.length > 0 ? `(${products.length})` : ""}
              </button>
            </div>

            {resultTab === "videos" ? (
              extraLoading && videoHits.length === 0 ? (
                <div className="flex justify-center py-16">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              ) : videoHits.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {videoHits.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => { commitSearch(query); setOpenVideoId(v.id); }}
                      className="rounded-2xl overflow-hidden bg-white/5 text-left active:opacity-90"
                    >
                      <div className="relative aspect-[3/4] bg-white/10">
                        {v.thumbnail && <img src={v.thumbnail} alt={v.description} className="w-full h-full object-cover" loading="lazy" />}
                        <Icon name="Play" size={18} className="absolute bottom-2 left-2 text-white" />
                      </div>
                      <div className="p-2">
                        <p className="text-white text-[12px] leading-snug line-clamp-2">{v.description || "Видео"}</p>
                        <span className="text-white/40 text-[10px]">@{v.handle}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Icon name="Video" size={32} className="text-white/20" />
                  <p className="text-white/40 text-sm">Видео не найдены</p>
                </div>
              )
            ) : resultTab === "people" ? (
              extraLoading && people.length === 0 ? (
                <div className="flex justify-center py-16">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              ) : people.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {people.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => { commitSearch(query); setOpenHandle(u.handle); }}
                      className="flex items-center gap-3 text-left"
                    >
                      <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0">
                        <UserAvatar src={u.avatar || ""} name={u.name || u.handle} alt={u.name} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{u.name}</p>
                        <p className="text-white/40 text-xs truncate">@{u.handle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Icon name="UserX" size={32} className="text-white/20" />
                  <p className="text-white/40 text-sm">Люди не найдены</p>
                </div>
              )
            ) : resultTab === "articles" ? (
              extraLoading && articles.length === 0 ? (
                <div className="flex justify-center py-16">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              ) : articles.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {articles.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => { commitSearch(query); setOpenArticleId(a.id); }}
                      className="flex items-center gap-3 text-left"
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                        {a.cover && <img src={a.cover} alt={a.title} className="w-full h-full object-cover" loading="lazy" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium line-clamp-2">{a.title}</p>
                        <p className="text-white/40 text-xs">{a.views} просмотров</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Icon name="FileText" size={32} className="text-white/20" />
                  <p className="text-white/40 text-sm">Статьи не найдены</p>
                </div>
              )
            ) : resultTab === "posts" ? (
              extraLoading && results.length === 0 ? (
                <div className="flex justify-center py-16">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              ) : results.length > 0 ? (
                <div className="flex gap-2 items-start">
                  {[0, 1].map((col) => (
                    <div key={col} className="flex-1 min-w-0 flex flex-col gap-2">
                      {results.filter((_, i) => i % 2 === col).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { commitSearch(query); onOpenPost(p); }}
                          className="rounded-2xl overflow-hidden bg-white/5 text-left active:opacity-90"
                        >
                          <img src={p.image} alt={p.caption} className="w-full aspect-square object-cover" loading="lazy" />
                          <div className="p-2">
                            <p className="text-white text-[12px] leading-snug line-clamp-2">{p.caption}</p>
                            <span className="text-white/40 text-[10px]">@{p.handle}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Icon name="SearchX" size={32} className="text-white/20" />
                  <p className="text-white/40 text-sm">Ничего не найдено</p>
                </div>
              )
            ) : productsLoading && products.length === 0 ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            ) : products.length > 0 ? (
              <div className="columns-2 gap-3">
                {products.map((p) => (
                  <a
                    key={p.id}
                    onClick={() => commitSearch(query)}
                    className="mb-3 block break-inside-avoid rounded-2xl overflow-hidden bg-white/5"
                  >
                    <div className="bg-white/10">
                      {p.image && <img src={p.image} alt={p.title} className="w-full h-auto object-cover block" loading="lazy" />}
                    </div>
                    <div className="p-2.5">
                      <p className="text-white text-[12px] leading-snug line-clamp-2 mb-1">{p.title}</p>
                      <span className="text-[#fe2c55] text-sm font-bold">{p.price.toLocaleString("ru-RU")} ₽</span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Icon name="ShoppingBag" size={32} className="text-white/20" />
                <p className="text-white/40 text-sm">Товары не найдены</p>
              </div>
            )}
          </>
        ) : (
          <>
            {recent.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/50 text-xs font-semibold uppercase tracking-wide">Недавние</span>
                  <button onClick={() => { setRecent([]); writeRecent([]); }} className="text-white/30 text-xs">Очистить</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recent.map((r) => (
                    <button
                      key={r}
                      onClick={() => setQuery(r)}
                      className="px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs flex items-center gap-1.5"
                    >
                      <Icon name="Clock" size={11} className="text-white/40" />
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <Icon name="TrendingUp" size={14} className="text-[#fe2c55]" />
                <span className="text-white/50 text-xs font-semibold uppercase tracking-wide">В тренде</span>
              </div>
              <div className="flex flex-col gap-0.5">
                {trending.map((tag, i) => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="flex items-center gap-3 py-2.5 active:bg-white/5 rounded-xl px-1"
                  >
                    <span className={`text-sm font-bold w-5 text-center ${i < 3 ? "text-[#fe2c55]" : "text-white/30"}`}>{i + 1}</span>
                    <span className="text-white text-sm flex-1 text-left">#{tag}</span>
                    <Icon name="Flame" size={14} className={i < 3 ? "text-[#fe2c55]" : "text-white/20"} />
                  </button>
                ))}
                {trending.length === 0 && (
                  <p className="text-white/30 text-sm">Пока нет трендовых тегов</p>
                )}
              </div>
            </div>

            {posts.length > 0 && (
              <div className="mt-6">
                <span className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-3 block">Популярные авторы</span>
                <div className="flex flex-col gap-3">
                  {Array.from(new Map(posts.map((p) => [p.handle, p])).values()).slice(0, 5).map((p) => (
                    <button key={p.handle} onClick={() => setQuery(p.handle)} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                        <UserAvatar src={p.avatar} name={p.author || p.handle} alt={p.author} />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-white text-sm font-medium truncate">{p.author}</p>
                        <p className="text-white/40 text-xs truncate">@{p.handle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {openVideoId !== null && <SearchVideoViewer id={openVideoId} onClose={() => setOpenVideoId(null)} />}
      {openArticleId !== null && (
        <div className="fixed inset-0 z-[9998] bg-white">
          <Reader id={openArticleId} onBack={() => setOpenArticleId(null)} onEdit={() => setOpenArticleId(null)} />
        </div>
      )}
      {openHandle && <UserProfileModal key={openHandle} handle={openHandle} onClose={() => setOpenHandle(null)} />}
    </div>,
    document.body
  );
};

export default SearchOverlay;