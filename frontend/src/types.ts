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

export type Card = {
  id: number;
  list_id: number;
  title: string;
  description: string | null;
  position: number;
  due_date: string | null;
  archived: boolean;
  created_by_id: number | null;
  created_at: string;
  updated_at: string;
  labels: Label[];
  members: User[];
  checklists: Checklist[];
};

export type BoardList = {
  id: number;
  board_id: number;
  title: string;
  position: number;
  cards: Card[];
};

export type BoardSummary = {
  id: number;
  title: string;
  description: string | null;
  color: string;
  is_public: boolean;
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
