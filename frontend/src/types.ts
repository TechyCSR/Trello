export type User = {
  id: number;
  name: string;
  avatar: string;
  created_at: string;
};

export type Label = {
  id: number;
  board_id: number;
  name: string;
  color: string;
};

export type ChecklistItem = {
  id: number;
  title: string;
  is_done: boolean;
  position: number;
};

export type Checklist = {
  id: number;
  title: string;
  items: ChecklistItem[];
};

export type CardActivity = {
  id: number;
  board_id: number;
  card_id: number | null;
  user: User | null;
  action: string;
  detail: string | null;
  created_at: string;
};

export type Card = {
  id: number;
  list_id: number;
  title: string;
  description: string | null;
  position: number;
  due_date: string | null;
  cover_color: string | null;
  cover_image_url: string | null;
  archived: boolean;
  created_by_id: number | null;
  created_at: string;
  updated_at: string;
  labels: Label[];
  members: User[];
  checklists: Checklist[];
  activities: CardActivity[];
};

export type BoardList = {
  id: number;
  board_id: number;
  title: string;
  is_inbox: boolean;
  is_collapsed: boolean;
  position: number;
  cards: Card[];
};

export type BoardSummary = {
  id: number;
  board_code: string;
  title: string;
  inbox_title: string;
  board_section_title: string;
  description: string | null;
  color: string;
  is_public: boolean;
  visibility: string;
  share_enabled: boolean;
  owner_id: number;
  created_at: string;
  updated_at: string;
  members: User[];
  list_count: number;
  card_count: number;
};

export type BoardDetail = BoardSummary & {
  labels: Label[];
  lists: BoardList[];
};

export type VisibilityFilter = "all" | "public" | "private";
