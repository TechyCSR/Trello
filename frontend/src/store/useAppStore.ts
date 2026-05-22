import { create } from "zustand";

import { api, setApiUser } from "@/lib/api";
import { positionBetween } from "@/lib/utils";
import type { BoardDetail, BoardList, BoardSummary, Card, User, VisibilityFilter } from "@/types";

type Filters = {
  boardQuery: string;
  boardVisibility: VisibilityFilter;
  cardQuery: string;
  labelId: number | null;
  memberId: number | null;
  due: "all" | "overdue" | "week";
};

type AppState = {
  users: User[];
  currentUser: User | null;
  boards: BoardSummary[];
  activeBoard: BoardDetail | null;
  selectedCard: Card | null;
  isLoadingBoards: boolean;
  isLoadingBoard: boolean;
  error: string | null;
  filters: Filters;
  fetchUsers: () => Promise<void>;
  setCurrentUser: (userId: number) => void;
  fetchBoards: () => Promise<void>;
  fetchBoard: (boardId: number) => Promise<void>;
  createBoard: (title: string, isPublic: boolean) => Promise<void>;
  updateBoard: (boardId: number, payload: Partial<BoardSummary> & { member_ids?: number[] }) => Promise<void>;
  deleteBoard: (boardId: number) => Promise<void>;
  createList: (title: string) => Promise<void>;
  updateList: (listId: number, title: string) => Promise<void>;
  deleteList: (listId: number) => Promise<void>;
  reorderLists: (activeId: number, overId: number) => Promise<void>;
  createCard: (listId: number, title: string) => Promise<void>;
  updateCard: (cardId: number, payload: Partial<Card> & { label_ids?: number[]; member_ids?: number[] }) => Promise<void>;
  deleteCard: (cardId: number) => Promise<void>;
  moveCard: (cardId: number, targetListId: number, targetIndex: number) => Promise<void>;
  setSelectedCard: (card: Card | null) => void;
  setFilters: (filters: Partial<Filters>) => void;
};

const storedUserId = Number(localStorage.getItem("flowboard:userId")) || null;
setApiUser(storedUserId);

function sortLists(lists: BoardList[]) {
  return [...lists]
    .sort((a, b) => a.position - b.position)
    .map((list) => ({ ...list, cards: [...list.cards].sort((a, b) => a.position - b.position) }));
}

function replaceCard(board: BoardDetail, card: Card) {
  return {
    ...board,
    lists: board.lists.map((list) => ({
      ...list,
      cards: list.id === card.list_id ? [...list.cards.filter((item) => item.id !== card.id), card].sort((a, b) => a.position - b.position) : list.cards.filter((item) => item.id !== card.id),
    })),
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  users: [],
  currentUser: null,
  boards: [],
  activeBoard: null,
  selectedCard: null,
  isLoadingBoards: false,
  isLoadingBoard: false,
  error: null,
  filters: {
    boardQuery: "",
    boardVisibility: "all",
    cardQuery: "",
    labelId: null,
    memberId: null,
    due: "all",
  },

  async fetchUsers() {
    const { data } = await api.get<User[]>("/users");
    const preferred = data.find((user) => user.id === storedUserId) ?? data[0] ?? null;
    if (preferred) {
      setApiUser(preferred.id);
      localStorage.setItem("flowboard:userId", String(preferred.id));
    }
    set({ users: data, currentUser: preferred });
  },

  setCurrentUser(userId) {
    const user = get().users.find((item) => item.id === userId) ?? null;
    setApiUser(userId);
    localStorage.setItem("flowboard:userId", String(userId));
    set({ currentUser: user, activeBoard: null, selectedCard: null });
    void get().fetchBoards();
  },

  async fetchBoards() {
    const { boardQuery, boardVisibility } = get().filters;
    set({ isLoadingBoards: true, error: null });
    try {
      const { data } = await api.get<BoardSummary[]>("/boards", {
        params: { q: boardQuery || undefined, visibility: boardVisibility === "all" ? undefined : boardVisibility },
      });
      set({ boards: data, isLoadingBoards: false });
    } catch (error) {
      set({ error: "Unable to load boards. Start the FastAPI server and try again.", isLoadingBoards: false });
    }
  },

  async fetchBoard(boardId) {
    set({ isLoadingBoard: true, error: null });
    try {
      const { data } = await api.get<BoardDetail>(`/boards/${boardId}`);
      set({ activeBoard: { ...data, lists: sortLists(data.lists) }, isLoadingBoard: false });
    } catch {
      set({ error: "Unable to load this board.", isLoadingBoard: false });
    }
  },

  async createBoard(title, isPublic) {
    const { data } = await api.post<BoardDetail>("/boards", { title, is_public: isPublic, color: isPublic ? "teal" : "slate" });
    set((state) => ({ boards: [data, ...state.boards] }));
  },

  async updateBoard(boardId, payload) {
    const { data } = await api.patch<BoardDetail>(`/boards/${boardId}`, payload);
    set((state) => ({
      activeBoard: state.activeBoard?.id === boardId ? { ...data, lists: sortLists(data.lists) } : state.activeBoard,
      boards: state.boards.map((board) => (board.id === boardId ? data : board)),
    }));
  },

  async deleteBoard(boardId) {
    const snapshot = get().boards;
    set({ boards: snapshot.filter((board) => board.id !== boardId) });
    try {
      await api.delete(`/boards/${boardId}`);
    } catch {
      set({ boards: snapshot, error: "Could not delete board." });
    }
  },

  async createList(title) {
    const board = get().activeBoard;
    if (!board) return;
    const { data } = await api.post<BoardList>("/lists", { board_id: board.id, title });
    set({ activeBoard: { ...board, lists: sortLists([...board.lists, data]) } });
  },

  async updateList(listId, title) {
    const board = get().activeBoard;
    if (!board) return;
    set({ activeBoard: { ...board, lists: board.lists.map((list) => (list.id === listId ? { ...list, title } : list)) } });
    await api.patch(`/lists/${listId}`, { title });
  },

  async deleteList(listId) {
    const board = get().activeBoard;
    if (!board) return;
    set({ activeBoard: { ...board, lists: board.lists.filter((list) => list.id !== listId) } });
    await api.delete(`/lists/${listId}`);
  },

  async reorderLists(activeId, overId) {
    const board = get().activeBoard;
    if (!board || activeId === overId) return;
    const oldIndex = board.lists.findIndex((list) => list.id === activeId);
    const newIndex = board.lists.findIndex((list) => list.id === overId);
    const next = [...board.lists];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    const positioned = next.map((list, index) => ({ ...list, position: (index + 1) * 1024 }));
    set({ activeBoard: { ...board, lists: positioned } });
    await api.patch("/lists/reorder", { board_id: board.id, lists: positioned.map(({ id, position }) => ({ id, position })) });
  },

  async createCard(listId, title) {
    const board = get().activeBoard;
    if (!board) return;
    const { data } = await api.post<Card>("/cards", { list_id: listId, title });
    set({ activeBoard: replaceCard(board, data) });
  },

  async updateCard(cardId, payload) {
    const board = get().activeBoard;
    if (!board) return;
    const { data } = await api.patch<Card>(`/cards/${cardId}`, payload);
    const nextBoard = replaceCard(board, data);
    set({
      activeBoard: nextBoard,
      selectedCard: get().selectedCard?.id === cardId ? data : get().selectedCard,
    });
  },

  async deleteCard(cardId) {
    const board = get().activeBoard;
    if (!board) return;
    set({
      activeBoard: {
        ...board,
        lists: board.lists.map((list) => ({ ...list, cards: list.cards.filter((card) => card.id !== cardId) })),
      },
      selectedCard: null,
    });
    await api.delete(`/cards/${cardId}`);
  },

  async moveCard(cardId, targetListId, targetIndex) {
    const board = get().activeBoard;
    if (!board) return;
    const snapshot = board;
    const sourceList = board.lists.find((list) => list.cards.some((card) => card.id === cardId));
    const targetList = board.lists.find((list) => list.id === targetListId);
    const card = sourceList?.cards.find((item) => item.id === cardId);
    if (!sourceList || !targetList || !card) return;
    const targetCards = targetList.cards.filter((item) => item.id !== cardId);
    const before = targetCards[targetIndex - 1]?.position;
    const after = targetCards[targetIndex]?.position;
    const position = positionBetween(before, after);
    const moved = { ...card, list_id: targetListId, position };
    const lists = board.lists.map((list) => {
      const cards = list.cards.filter((item) => item.id !== cardId);
      if (list.id === targetListId) {
        cards.splice(targetIndex, 0, moved);
      }
      return { ...list, cards };
    });
    set({ activeBoard: { ...board, lists } });
    try {
      const { data } = await api.patch<Card>("/cards/move", { card_id: cardId, target_list_id: targetListId, position });
      set({ activeBoard: replaceCard(get().activeBoard ?? board, data) });
    } catch {
      set({ activeBoard: snapshot, error: "Move failed, restored previous card order." });
    }
  },

  setSelectedCard(card) {
    set({ selectedCard: card });
  },

  setFilters(filters) {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
  },
}));
