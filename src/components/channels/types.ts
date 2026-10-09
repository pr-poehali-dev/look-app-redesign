export interface Channel {
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
  kind?: string;
}
