import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { uploadChatMedia } from "@/lib/chatMediaUpload";
import PollMessage from "@/components/community/PollMessage";
import PollsPanel from "@/components/community/PollsPanel";
import { Channel } from "./types";

const API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";
const REACTIONS = ["👍", "❤️", "🔥", "😂", "😮", "😢"];

interface Post {
  id: number;
  user_name: string;
  type: string;
  content: string;
  time: string;
}

interface Stat {
  views: number;
  reactions: Record<string, number>;
  my_reaction: string;
  comments: number;
}

interface Comment {
  id: number;
  user_id: string;
  user_name: string;
  content: string;
  time: string;
}

interface Props {
  channel: Channel;
  onBack: () => void;
  onChanged: (patch: Partial<Channel>) => void;
  onDeleted: () => void;
}

const parse = (raw: { body?: unknown }) => (typeof raw.body === "string" ? JSON.parse(raw.body) : raw);

const ChannelView = ({ channel, onBack, onChanged, onDeleted }: Props) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [openComments, setOpenComments] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [reactFor, setReactFor] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const [showPolls, setShowPolls] = useState(false);
  const [pinned, setPinned] = useState<{ message_id: number; type: string; content: string } | null>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const viewedRef = useRef<Set<number>>(new Set());
  const lastIdRef = useRef(0);

  const headers = {
    "Content-Type": "application/json",
    "X-User-Id": user?.id || "anon",
    "X-User-Name": encodeURIComponent(user?.name || ""),
  };

  const loadStats = useCallback((ids: number[]) => {
    if (!ids.length) return;
    fetch(`${API}?module=community&action=channel_stats&ids=${ids.join(",")}`, { headers })
      .then(r => r.json())
      .then(raw => setStats(prev => ({ ...prev, ...(parse(raw).stats || {}) })))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadPosts = useCallback((initial = false) => {
    fetch(`${API}?module=chat&action=messages&chat_id=${channel.id}&since_id=${initial ? 0 : lastIdRef.current}`, { headers })
      .then(r => r.json())
      .then(raw => {
        const list: Post[] = (parse(raw).messages || []).filter((m: Post) => m.type !== "system");
        if (initial) {
          setPosts(list);
          loadStats(list.map(p => p.id));
          setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
        } else if (list.length) {
          setPosts(prev => [...prev, ...list.filter(n => !prev.some(p => p.id === n.id))]);
          loadStats(list.map(p => p.id));
        }
        const all = (parse(raw).messages || []) as Post[];
        all.forEach(m => { if (m.id > lastIdRef.current) lastIdRef.current = m.id; });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id, user?.id]);

  const loadPinned = useCallback(() => {
    fetch(`${API}?module=community`, {
      method: "POST", headers,
      body: JSON.stringify({ action: "get_pinned", community_id: channel.id }),
    })
      .then(r => r.json())
      .then(raw => setPinned(parse(raw).pinned || null))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id, user?.id]);

  useEffect(() => { loadPinned(); }, [loadPinned]);

  const togglePin = async (post: Post) => {
    const isPinned = pinned?.message_id === post.id;
    await fetch(`${API}?module=community`, {
      method: "POST", headers,
      body: JSON.stringify(isPinned
        ? { action: "unpin_message", community_id: channel.id }
        : { action: "pin_message", community_id: channel.id, message_id: post.id }),
    }).catch(() => {});
    loadPinned();
  };

  const scrollToPost = (id: number) => document.getElementById(`post-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });

  useEffect(() => {
    loadPosts(true);
    const t = setInterval(() => loadPosts(false), 6000);
    return () => clearInterval(t);
  }, [loadPosts]);

  useEffect(() => {
    if (!channel.joined && !channel.is_admin) return;
    const fresh = posts.map(p => p.id).filter(id => id > 0 && !viewedRef.current.has(id));
    if (!fresh.length) return;
    fresh.forEach(id => viewedRef.current.add(id));
    fetch(`${API}?module=community`, {
      method: "POST", headers,
      body: JSON.stringify({ action: "channel_view", message_ids: fresh }),
    }).then(() => loadStats(fresh)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, channel.joined]);

  const publish = async (content: string, type: "text" | "image" | "video") => {
    if (!content.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${API}?module=chat`, {
        method: "POST", headers,
        body: JSON.stringify({ action: "send", chat_id: channel.id, content, type }),
      });
      const data = parse(await res.json());
      if (data.id) {
        setPosts(prev => [...prev, { id: data.id, user_name: channel.name, type, content, time: data.time }]);
        lastIdRef.current = Math.max(lastIdRef.current, data.id);
        setText("");
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      } else {
        alert("Не удалось опубликовать пост");
      }
    } catch {
      alert("Не удалось опубликовать пост. Проверь интернет.");
    }
    setSending(false);
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const url = await uploadChatMedia(file, ext, file.type || "image/jpeg");
      await publish(url, "image");
    } catch {
      alert("Не удалось загрузить фото");
    }
  };

  const handleVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
      const url = await uploadChatMedia(file, ext, file.type || "video/mp4");
      await publish(url, "video");
    } catch {
      alert("Не удалось загрузить видео");
    }
  };

  const toggleSub = async () => {
    const action = channel.joined ? "leave" : "join";
    const res = await fetch(`${API}?module=community`, {
      method: "POST", headers,
      body: JSON.stringify({ action, community_id: channel.id }),
    });
    const data = parse(await res.json());
    if (data.pending) { alert("Заявка отправлена. Админ её рассмотрит."); return; }
    if (data.ok) onChanged({ joined: !channel.joined, members: channel.members + (channel.joined ? -1 : 1) });
  };

  const react = async (post: Post, emoji: string) => {
    setReactFor(null);
    const cur = stats[post.id] || { views: 0, reactions: {}, my_reaction: "", comments: 0 };
    const next = { ...cur.reactions };
    if (cur.my_reaction) next[cur.my_reaction] = Math.max(0, (next[cur.my_reaction] || 1) - 1);
    const mine = cur.my_reaction === emoji ? "" : emoji;
    if (mine) next[mine] = (next[mine] || 0) + 1;
    setStats(prev => ({ ...prev, [post.id]: { ...cur, reactions: next, my_reaction: mine } }));
    await fetch(`${API}?module=community`, {
      method: "POST", headers,
      body: JSON.stringify({ action: "channel_react", message_id: post.id, emoji }),
    }).catch(() => {});
  };

  const openThread = (post: Post) => {
    setOpenComments(post);
    setComments([]);
    fetch(`${API}?module=community&action=channel_comments&message_id=${post.id}`, { headers })
      .then(r => r.json())
      .then(raw => setComments(parse(raw).comments || []))
      .catch(() => {});
  };

  const sendComment = async () => {
    if (!openComments || !commentText.trim()) return;
    const res = await fetch(`${API}?module=community`, {
      method: "POST", headers,
      body: JSON.stringify({ action: "channel_comment", message_id: openComments.id, content: commentText }),
    });
    const data = parse(await res.json());
    if (data.comment) {
      setComments(prev => [...prev, data.comment]);
      setCommentText("");
      const id = openComments.id;
      setStats(prev => {
        const s = prev[id] || { views: 0, reactions: {}, my_reaction: "", comments: 0 };
        return { ...prev, [id]: { ...s, comments: s.comments + 1 } };
      });
    }
  };

  const shareLink = async () => {
    setMenu(false);
    const res = await fetch(`${API}?module=community`, {
      method: "POST", headers,
      body: JSON.stringify({ action: "create_invite", community_id: channel.id }),
    });
    const data = parse(await res.json());
    if (data.token) {
      const link = `${window.location.origin}/?invite=${data.token}`;
      try { await navigator.clipboard.writeText(link); alert("Ссылка на канал скопирована"); }
      catch { prompt("Ссылка на канал", link); }
    } else {
      alert("Ссылку может создать только админ");
    }
  };

  const deleteChannel = async () => {
    setMenu(false);
    if (!confirm(`Удалить канал «${channel.name}»? Это нельзя отменить.`)) return;
    const res = await fetch(`${API}?module=community`, {
      method: "POST", headers,
      body: JSON.stringify({ action: "delete", community_id: channel.id }),
    });
    if (parse(await res.json()).ok) onDeleted();
    else alert("Удалить канал может только создатель или админ");
  };

  const canPost = !!channel.is_admin;
  const canSee = channel.joined || channel.is_admin || channel.type === "open";

  return (
    <div className="h-full bg-black flex flex-col overflow-hidden relative">
      <div className="flex items-center gap-3 px-3 pt-14 pb-3 border-b border-white/8">
        <button onClick={onBack}><Icon name="ChevronLeft" size={24} className="text-white" /></button>
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center flex-shrink-0">
          {channel.img ? <img src={channel.img} className="w-full h-full object-cover" alt="" /> : <Icon name="Megaphone" size={18} className="text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">{channel.name}</p>
          <p className="text-white/40 text-xs">{channel.members} подписчиков</p>
        </div>
        {!canPost && (
          <button
            onClick={toggleSub}
            className={`px-3 py-1.5 rounded-full text-xs font-bold ${channel.joined ? "bg-white/10 text-white/70" : "bg-[#fe2c55] text-white"}`}
          >
            {channel.joined ? "Отписаться" : "Подписаться"}
          </button>
        )}
        {canPost && (
          <button onClick={deleteChannel} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0" title="Удалить канал">
            <Icon name="Trash2" size={17} className="text-[#fe2c55]" />
          </button>
        )}
        {canPost && (
          <div className="relative">
            <button onClick={() => setMenu(v => !v)}><Icon name="MoreVertical" size={20} className="text-white/70" /></button>
            {menu && (
              <div className="absolute right-0 top-8 z-30 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden w-52">
                <button onClick={shareLink} className="w-full text-left px-4 py-3 text-white text-sm flex items-center gap-2 hover:bg-white/5">
                  <Icon name="Link" size={15} /> Ссылка-приглашение
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {pinned && (
        <button onClick={() => scrollToPost(pinned.message_id)} className="flex items-center gap-2 px-4 py-2 bg-white/5 border-b border-white/8 text-left">
          <Icon name="Pin" size={14} className="text-[#fe2c55] flex-shrink-0" />
          <span className="text-white/70 text-xs truncate">
            {pinned.type === "image" ? "Фото" : pinned.type === "video" ? "Видео" : pinned.type === "poll" ? "Опрос" : pinned.content}
          </span>
        </button>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-3" style={{ scrollbarWidth: "none" }}>
        {!canSee ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 px-6">
            <Icon name="Lock" size={32} className="text-white/30" />
            <p className="text-white/50 text-sm">Закрытый канал. Подпишись, чтобы подать заявку.</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white/30 text-sm">{canPost ? "Опубликуй первый пост" : "Пока нет публикаций"}</p>
          </div>
        ) : posts.map(post => {
          const st = stats[post.id];
          return (
            <div key={post.id} id={`post-${post.id}`} className="flex-shrink-0 bg-[#161616] rounded-2xl overflow-hidden border border-white/8">
              {post.type === "image" && <img src={post.content} className="w-full max-h-96 object-cover" alt="" />}
              {post.type === "video" && <video src={post.content} controls playsInline preload="metadata" className="w-full max-h-96 bg-black" />}
              {post.type === "poll" && (() => {
                let pid = 0;
                try { pid = JSON.parse(post.content).poll_id; } catch { pid = 0; }
                return pid ? <div className="p-2"><PollMessage pollId={pid} communityId={channel.id} isMe={false} time={post.time} /></div> : <p className="text-white text-sm px-4 pt-3">Опрос</p>;
              })()}
              {!["image", "video", "poll"].includes(post.type) && (
                <p className="text-white text-sm px-4 pt-3 whitespace-pre-wrap break-words">{post.content}</p>
              )}
              <div className="flex items-center justify-between px-4 py-2 text-white/40 text-xs">
                <span className="flex items-center gap-1"><Icon name="Eye" size={12} />{st?.views ?? 0}</span>
                <span className="flex items-center gap-3">
                  {canPost && (
                    <button onClick={() => togglePin(post)} className={pinned?.message_id === post.id ? "text-[#fe2c55]" : "text-white/40"} title="Закрепить">
                      <Icon name="Pin" size={13} />
                    </button>
                  )}
                  {post.time}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 px-3 pb-3 relative">
                {Object.entries(st?.reactions || {}).filter(([, n]) => n > 0).map(([emoji, n]) => (
                  <button
                    key={emoji}
                    onClick={() => react(post, emoji)}
                    className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${st?.my_reaction === emoji ? "bg-[#fe2c55]/30 border border-[#fe2c55]" : "bg-white/10 border border-transparent"}`}
                  >
                    <span>{emoji}</span><span className="text-white/80">{n}</span>
                  </button>
                ))}
                <button onClick={() => setReactFor(reactFor === post.id ? null : post.id)} className="px-2 py-1 rounded-full bg-white/10 text-white/60 text-xs">
                  <Icon name="SmilePlus" size={14} />
                </button>
                {reactFor === post.id && (
                  <div className="absolute bottom-10 left-3 z-20 bg-zinc-900 border border-white/10 rounded-full px-2 py-1.5 flex gap-1">
                    {REACTIONS.map(e => (
                      <button key={e} onClick={() => react(post, e)} className="text-xl px-1 active:scale-125 transition-transform">{e}</button>
                    ))}
                  </div>
                )}
                <button onClick={() => openThread(post)} className="ml-auto flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-white/70 text-xs">
                  <Icon name="MessageCircle" size={13} />
                  {st?.comments ? `${st.comments}` : "Комментировать"}
                </button>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {canPost && (
        <div className="flex items-end gap-2 px-3 pb-24 pt-3 border-t border-white/8 bg-black">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={handleVideo} />
          <button onClick={() => fileRef.current?.click()} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mb-0.5" title="Фото">
            <Icon name="Image" size={18} className="text-white/70" />
          </button>
          <button onClick={() => videoRef.current?.click()} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mb-0.5" title="Видео">
            <Icon name="Video" size={18} className="text-white/70" />
          </button>
          <button onClick={() => setShowPolls(true)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mb-0.5" title="Опрос">
            <Icon name="BarChart3" size={18} className="text-white/70" />
          </button>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Новый пост..."
            rows={1}
            className="flex-1 bg-[#1a1a1a] rounded-3xl px-4 py-2.5 text-white text-base outline-none resize-none placeholder-white/30 max-h-32"
          />
          <button
            onClick={() => publish(text, "text")}
            disabled={!text.trim() || sending}
            className="w-10 h-10 rounded-full bg-[#fe2c55] flex items-center justify-center flex-shrink-0 disabled:opacity-40"
          >
            <Icon name="Send" size={17} className="text-white" />
          </button>
        </div>
      )}

      {showPolls && (
        <PollsPanel
          communityId={channel.id}
          isAdmin={canPost}
          onClose={() => { setShowPolls(false); setTimeout(() => loadPosts(false), 400); }}
        />
      )}

      {openComments && (
        <div className="absolute inset-0 z-40 bg-black flex flex-col">
          <div className="flex items-center gap-3 px-3 pt-14 pb-3 border-b border-white/8">
            <button onClick={() => setOpenComments(null)}><Icon name="ChevronLeft" size={24} className="text-white" /></button>
            <p className="text-white font-bold text-sm">Комментарии</p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3" style={{ scrollbarWidth: "none" }}>
            {comments.length === 0 && <p className="text-white/30 text-sm text-center mt-10">Комментариев пока нет</p>}
            {comments.map(c => (
              <div key={c.id}>
                <p className="text-white/50 text-xs font-semibold">{c.user_name} <span className="text-white/25 font-normal">{c.time}</span></p>
                <p className="text-white text-sm whitespace-pre-wrap break-words">{c.content}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 pb-24 pt-3 border-t border-white/8">
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") sendComment(); }}
              placeholder="Написать комментарий..."
              className="flex-1 bg-[#1a1a1a] rounded-full px-4 py-2.5 text-white text-base outline-none placeholder-white/30"
            />
            <button onClick={sendComment} disabled={!commentText.trim()} className="w-10 h-10 rounded-full bg-[#fe2c55] flex items-center justify-center disabled:opacity-40">
              <Icon name="Send" size={17} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelView;
