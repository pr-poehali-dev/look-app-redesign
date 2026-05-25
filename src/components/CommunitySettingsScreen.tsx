import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import SettingsHeader from "./community-settings/SettingsHeader";
import SettingsForm from "./community-settings/SettingsForm";
import InviteModal from "./community-settings/InviteModal";
import RequestsModal from "./community-settings/RequestsModal";
import { API, Community, ContactUser, JoinRequest } from "./community-settings/types";

interface Props {
  community: Community;
  onBack: () => void;
  onUpdated: (patch: Partial<Community>) => void;
  onDeleted: () => void;
}

const CommunitySettingsScreen = ({ community, onBack, onUpdated, onDeleted }: Props) => {
  const { user } = useAuth();
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description);
  const [type, setType] = useState<"open" | "closed">(community.type);
  const [category, setCategory] = useState(community.category);
  const [img, setImg] = useState(community.img);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [contacts, setContacts] = useState<ContactUser[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviting, setInviting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const inviteLink = `${window.location.origin}/?community=${community.id}`;

  useEffect(() => {
    if (!showInvite || !user || contacts.length > 0) return;
    setContactsLoading(true);
    fetch(`${API}?module=chat&action=all_users`, {
      headers: { "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
    })
      .then((r) => r.json())
      .then((raw) => {
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        const list: ContactUser[] = (data.users || []).filter((u: ContactUser) => u.id !== user.id);
        setContacts(list);
      })
      .catch(() => {})
      .finally(() => setContactsLoading(false));
  }, [showInvite, user, contacts.length]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleInvite = async () => {
    if (!user || selectedIds.length === 0) return;
    setInviting(true);
    try {
      const res = await fetch(`${API}?module=community`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
          "X-User-Name": encodeURIComponent(user.name),
        },
        body: JSON.stringify({ action: "invite", community_id: community.id, user_ids: selectedIds }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.ok) {
        onUpdated({ members: community.members + (data.added || selectedIds.length) });
        setSelectedIds([]);
        setShowInvite(false);
        alert(`Приглашено: ${data.added || selectedIds.length}`);
      } else {
        alert("Не удалось пригласить");
      }
    } catch (e) {
      console.error("[CommunitySettings] invite failed", e);
      alert("Не удалось пригласить. Проверь интернет.");
    } finally {
      setInviting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      alert("Не удалось скопировать. Скопируй вручную: " + inviteLink);
    }
  };

  const shareLink = async () => {
    const text = `Присоединяйся к сообществу «${community.name}»`;
    if (navigator.share) {
      try {
        await navigator.share({ title: community.name, text, url: inviteLink });
        return;
      } catch {
        // отменено
      }
    }
    copyLink();
  };

  const isOwner = !!(user && community.creator_id === user.id);

  const loadRequests = async () => {
    if (!user || !isOwner) return;
    setRequestsLoading(true);
    try {
      const res = await fetch(`${API}?module=community`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
        body: JSON.stringify({ action: "list_requests", community_id: community.id }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      const list: JoinRequest[] = data.requests || [];
      setRequests(list);
      setPendingCount(list.length);
    } catch {
      // тихо
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner && type === "closed") loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, type]);

  useEffect(() => {
    if (showRequests) loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRequests]);

  const decideRequest = async (uid: string, approve: boolean) => {
    if (!user) return;
    try {
      const res = await fetch(`${API}?module=community`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
        body: JSON.stringify({
          action: approve ? "approve_request" : "reject_request",
          community_id: community.id,
          user_id: uid,
        }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.ok) {
        setRequests((prev) => prev.filter((r) => r.user_id !== uid));
        setPendingCount((p) => Math.max(0, p - 1));
        if (approve) onUpdated({ members: community.members + 1 });
      } else {
        alert("Не удалось обработать заявку");
      }
    } catch {
      alert("Не удалось обработать заявку. Проверь интернет.");
    }
  };

  const handlePickImage = () => fileRef.current?.click();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Файл слишком большой. Максимум 5 МБ.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImgPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user || !isOwner) return;
    if (!name.trim()) {
      alert("Название не может быть пустым");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        action: "update",
        community_id: community.id,
        name: name.trim(),
        description: description.trim(),
        type,
        category,
      };
      if (imgPreview) payload.img = imgPreview;

      const res = await fetch(`${API}?module=community`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
          "X-User-Name": encodeURIComponent(user.name),
        },
        body: JSON.stringify(payload),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.ok) {
        const patch: Partial<Community> = { name: name.trim(), description: description.trim(), type, category };
        if (imgPreview) {
          patch.img = imgPreview;
          setImg(imgPreview);
          setImgPreview(null);
        }
        onUpdated(patch);
        alert("Сохранено");
      } else {
        alert(data.error === "only creator can edit" ? "Редактировать может только создатель" : "Не удалось сохранить");
      }
    } catch (e) {
      console.error("[CommunitySettings] save failed", e);
      alert("Не удалось сохранить. Проверь интернет.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !isOwner) return;
    if (!confirm(`Удалить сообщество «${community.name}»? Это действие нельзя отменить.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}?module=community`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
          "X-User-Name": encodeURIComponent(user.name),
        },
        body: JSON.stringify({ action: "delete", community_id: community.id }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.ok) {
        onDeleted();
      } else {
        alert(data.error === "only creator can delete" ? "Удалить может только создатель" : "Не удалось удалить");
      }
    } catch (e) {
      console.error("[CommunitySettings] delete failed", e);
      alert("Не удалось удалить. Проверь интернет.");
    } finally {
      setDeleting(false);
    }
  };

  const displayImg = imgPreview || img;

  return (
    <div className="h-full bg-black flex flex-col overflow-hidden">
      <SettingsHeader isOwner={isOwner} saving={saving} onBack={onBack} onSave={handleSave} />

      <SettingsForm
        community={community}
        isOwner={isOwner}
        name={name}
        setName={setName}
        description={description}
        setDescription={setDescription}
        type={type}
        setType={setType}
        category={category}
        setCategory={setCategory}
        displayImg={displayImg}
        fileRef={fileRef}
        onPickImage={handlePickImage}
        onImageChange={handleImageChange}
        linkCopied={linkCopied}
        onShareLink={shareLink}
        onCopyLink={copyLink}
        onShowInvite={() => setShowInvite(true)}
        pendingCount={pendingCount}
        onShowRequests={() => setShowRequests(true)}
        deleting={deleting}
        onDelete={handleDelete}
      />

      {showInvite && (
        <InviteModal
          contacts={contacts}
          contactsLoading={contactsLoading}
          selectedIds={selectedIds}
          inviteSearch={inviteSearch}
          setInviteSearch={setInviteSearch}
          toggleSelect={toggleSelect}
          onClose={() => {
            setShowInvite(false);
            setSelectedIds([]);
            setInviteSearch("");
          }}
          onInvite={handleInvite}
          inviting={inviting}
        />
      )}

      {showRequests && (
        <RequestsModal
          requests={requests}
          requestsLoading={requestsLoading}
          onClose={() => setShowRequests(false)}
          onDecide={decideRequest}
        />
      )}
    </div>
  );
};

export default CommunitySettingsScreen;
