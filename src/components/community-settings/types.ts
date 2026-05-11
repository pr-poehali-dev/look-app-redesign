export interface ContactUser {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
}

export interface JoinRequest {
  id: number;
  user_id: string;
  user_name: string;
  avatar: string;
  created_at: string | null;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  type: "open" | "closed";
  category: string;
  img: string;
  members: number;
  joined: boolean;
  is_admin?: boolean;
  creator_id?: string;
}

export const API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";
export const CATEGORIES = ["Фото", "Путешествия", "Спорт", "Игры", "Еда", "Музыка", "Другое"];
