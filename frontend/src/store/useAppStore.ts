import { create } from "zustand";
import axios from "axios";

import { api, setApiUser } from "@/lib/api";
import { positionBetween } from "@/lib/utils";
import { showError, showSuccess } from "@/store/useToastStore";
import type { BoardDetail, BoardList, BoardSummary, Card, Label, User, VisibilityFilter } from "@/types";

function errorDetail(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      const detail = (data as { detail?: unknown }).detail;
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail) && detail.length) {
        const first = detail[0];
        if (first && typeof first === "object" && "msg" in first) return String((first as { msg: unknown }).msg);
      }
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return undefined;
}

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
  starredBoardIds: number[];
  recentBoardIds: number[];
  activeBoard: BoardDetail | null;
  archivedCards: Card[];
  archivedCardsBoardId: number | null;
  selectedCard: Card | null;
  isCreateBoardModalOpen: boolean;
  isLoadingBoards: boolean;
  isLoadingBoard: boolean;
  error: string | null;
  filters: Filters;
  fetchUsers: () => Promise<void>;
  setCurrentUser: (userId: number) => void;
  toggleStarredBoard: (boardId: number) => void;
  recordRecentBoard: (boardId: number) => void;
  fetchBoards: () => Promise<void>;
  fetchBoard: (boardRef: string) => Promise<void>;
  createBoard: (title: string, isPublic: boolean, color?: string) => Promise<void>;
  setCreateBoardModalOpen: (open: boolean) => void;
  updateBoard: (boardId: number, payload: Partial<BoardSummary> & { member_ids?: number[] }) => Promise<void>;
  deleteBoard: (boardId: number) => Promise<void>;
  createList: (title: string, isInbox?: boolean) => Promise<BoardList | null>;
  updateList: (listId: number, payload: { title?: string; is_collapsed?: boolean }) => Promise<void>;
  deleteList: (listId: number) => Promise<void>;
  reorderLists: (activeId: number, overId: number) => Promise<void>;
  createLabel: (boardId: number, name: string, color: string) => Promise<Label | null>;
  createCard: (listId: number, title: string) => Promise<void>;
  updateCard: (cardId: number, payload: Partial<Card> & { label_ids?: number[]; member_ids?: number[] }) => Promise<void>;
  addCardComment: (cardId: number, detail: string) => Promise<void>;
  deleteCard: (cardId: number) => Promise<void>;
  moveCard: (cardId: number, targetListId: number, targetIndex: number) => Promise<void>;
  setSelectedCard: (card: Card | null) => void;
  setFilters: (filters: Partial<Filters>) => void;
  archiveCard: (card: Card) => Promise<void>;
  fetchArchivedCards: (boardId: number, force?: boolean) => Promise<Card[]>;
  unarchiveCard: (cardId: number) => Promise<void>;
};

const storedUserId = Number(localStorage.getItem("flowboard:userId")) || null;
setApiUser(storedUserId);

function userStarredKey(userId: number) {
  return `flowboard:starredBoards:${userId}`;
}
function userRecentKey(userId: number) {
  return `flowboard:recentBoards:${userId}`;
}

function readStarredBoards(userId: number | null): number[] {
  if (!userId) return [];
  const raw = localStorage.getItem(userStarredKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value) => Number.isInteger(value)) : [];
  } catch {
    return [];
  }
}

function writeStarredBoards(userId: number | null, boardIds: number[]) {
  if (!userId) return;
  localStorage.setItem(userStarredKey(userId), JSON.stringify(boardIds));
}
function readRecentBoards(userId: number | null): number[] {
  if (!userId) return [];
  const raw = localStorage.getItem(userRecentKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value) => Number.isInteger(value)) : [];
  } catch {
    return [];
  }
}
function writeRecentBoards(userId: number | null, boardIds: number[]) {
  if (!userId) return;
  localStorage.setItem(userRecentKey(userId), JSON.stringify(boardIds.slice(0, 8)));
}

let boardsController: AbortController | null = null;
let boardController: AbortController | null = null;
let boardsRequestToken = 0;
let boardRequestToken = 0;

function sortLists(lists: BoardList[]) {
  return [...lists]
    .sort((a, b) => a.position - b.position)
    .map((list) => ({ ...list, cards: [...list.cards].sort((a, b) => a.position - b.position) }));
}

function replaceCard(board: BoardDetail, card: Card) {
  if (card.archived) {
    return {
      ...board,
      lists: board.lists.map((list) => ({ ...list, cards: list.cards.filter((item) => item.id !== card.id) })),
    };
  }
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
  starredBoardIds: readStarredBoards(storedUserId),
  recentBoardIds: readRecentBoards(storedUserId),
  activeBoard: null,
  archivedCards: [],
  archivedCardsBoardId: null,
  selectedCard: null,
  isCreateBoardModalOpen: false,
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
    const preferred = data.find((user) => user.id === storedUserId) ?? null;
    if (preferred) {
      setApiUser(preferred.id);
    }
    set({
      users: data,
      currentUser: preferred,
      starredBoardIds: readStarredBoards(preferred?.id ?? null),
      recentBoardIds: readRecentBoards(preferred?.id ?? null),
    });
  },

  setCurrentUser(userId) {
    const user = get().users.find((item) => item.id === userId) ?? null;
    setApiUser(userId);
    localStorage.setItem("flowboard:userId", String(userId));
    set({
      currentUser: user,
      activeBoard: null,
      archivedCards: [],
      archivedCardsBoardId: null,
      selectedCard: null,
      starredBoardIds: readStarredBoards(userId),
      recentBoardIds: readRecentBoards(userId),
    });
    void get().fetchBoards();
  },

  toggleStarredBoard(boardId) {
    const userId = get().currentUser?.id ?? null;
    const exists = get().starredBoardIds.includes(boardId);
    const next = exists ? get().starredBoardIds.filter((id) => id !== boardId) : [...get().starredBoardIds, boardId];
    writeStarredBoards(userId, next);
    set({ starredBoardIds: next });
  },

  recordRecentBoard(boardId) {
    const userId = get().currentUser?.id ?? null;
    const next = [boardId, ...get().recentBoardIds.filter((id) => id !== boardId)].slice(0, 8);
    writeRecentBoards(userId, next);
    set({ recentBoardIds: next });
  },

  async fetchBoards() {
    const { boardQuery, boardVisibility } = get().filters;
    boardsController?.abort();
    boardsController = new AbortController();
    const token = ++boardsRequestToken;
    set((state) => ({ isLoadingBoards: state.boards.length === 0, error: null }));
    try {
      const { data } = await api.get<BoardSummary[]>("/boards", {
        signal: boardsController.signal,
        params: { q: boardQuery || undefined, visibility: boardVisibility === "all" ? undefined : boardVisibility },
      });
      if (token !== boardsRequestToken) return;
      set({ boards: data, isLoadingBoards: false });
    } catch (error) {
      if (axios.isCancel(error)) return;
      if (token !== boardsRequestToken) return;
      set({ error: "Unable to load boards. Start the FastAPI server and try again.", isLoadingBoards: false });
      showError("Unable to load boards", errorDetail(error) ?? "Start the FastAPI server and try again.");
    }
  },

  async fetchBoard(boardRef) {
    boardController?.abort();
    boardController = new AbortController();
    const token = ++boardRequestToken;
    set((state) => ({ isLoadingBoard: !state.activeBoard || state.activeBoard.board_code !== boardRef, error: null }));
    try {
      const { data } = await api.get<BoardDetail>(`/boards/${boardRef}`, { signal: boardController.signal });
      if (token !== boardRequestToken) return;
      get().recordRecentBoard(data.id);
      set({ activeBoard: { ...data, lists: sortLists(data.lists) }, archivedCardsBoardId: null, isLoadingBoard: false });
      // Preload archived cards in background
      void get().fetchArchivedCards(data.id);
    } catch (error) {
      if (axios.isCancel(error)) return;
      if (token !== boardRequestToken) return;
      set({ error: "Unable to load this board.", isLoadingBoard: false });
      showError("Unable to load board", errorDetail(error));
    }
  },

  async createBoard(title, isPublic, color = isPublic ? "teal" : "slate") {
    const { data } = await api.post<BoardDetail>("/boards", { title, is_public: isPublic, color });
    set((state) => ({ boards: [data, ...state.boards] }));
  },

  setCreateBoardModalOpen(open) {
    set({ isCreateBoardModalOpen: open });
  },

  async updateBoard(boardId, payload) {
    // Optimistic update — apply immediately so UI responds instantly
    const snapshot = get().activeBoard;
    set((state) => ({
      activeBoard:
        state.activeBoard?.id === boardId
          ? { ...state.activeBoard, ...payload }
          : state.activeBoard,
      boards: state.boards.map((board) =>
        board.id === boardId ? { ...board, ...payload } : board,
      ),
    }));
    try {
      const { data } = await api.patch<BoardDetail>(`/boards/${boardId}`, payload);
      set((state) => ({
        activeBoard:
          state.activeBoard?.id === boardId
            ? {
                ...data,
                color: "color" in payload && state.activeBoard.color !== payload.color ? state.activeBoard.color : data.color,
                lists: sortLists(state.activeBoard?.lists ?? data.lists),
              }
            : state.activeBoard,
        boards: state.boards.map((board) =>
          board.id === boardId
            ? { ...data, color: "color" in payload && board.color !== payload.color ? board.color : data.color }
            : board,
        ),
      }));
    } catch (error) {
      set((state) => {
        const newerColorExists = "color" in payload && state.activeBoard?.id === boardId && state.activeBoard.color !== payload.color;
        return {
          activeBoard: newerColorExists ? state.activeBoard : snapshot,
          boards: newerColorExists ? state.boards : state.boards.map((board) => (snapshot && board.id === boardId ? { ...board, ...snapshot } : board)),
        };
      });
      showError("Could not update board", errorDetail(error));
    }
  },

  async deleteBoard(boardId) {
    const snapshot = get().boards;
    set({ boards: snapshot.filter((board) => board.id !== boardId) });
    try {
      await api.delete(`/boards/${boardId}`);
    } catch (error) {
      set({ boards: snapshot, error: "Could not delete board." });
      showError("Could not delete board", errorDetail(error));
    }
  },

  async createList(title, isInbox = false) {
    const board = get().activeBoard;
    if (!board) return null;
    const { data } = await api.post<BoardList>("/lists", { board_id: board.id, title, is_inbox: isInbox });
    set({ activeBoard: { ...board, lists: sortLists([...board.lists, data]) } });
    return data;
  },

  async updateList(listId, payload) {
    const board = get().activeBoard;
    if (!board) return;
    const previous = board;
    set({ activeBoard: { ...board, lists: board.lists.map((list) => (list.id === listId ? { ...list, ...payload } : list)) } });
    try {
      const { data } = await api.patch<BoardList>(`/lists/${listId}`, payload);
      const current = get().activeBoard ?? board;
      set({ activeBoard: { ...current, lists: sortLists(current.lists.map((list) => (list.id === listId ? data : list))) } });
    } catch (error) {
      set({ activeBoard: previous, error: "Could not update list." });
      showError("Could not update list", errorDetail(error));
    }
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

  async createLabel(boardId, name, color) {
    const board = get().activeBoard;
    const { data } = await api.post<Label>("/labels", { board_id: boardId, name, color });
    set((state) => ({
      activeBoard: state.activeBoard?.id === boardId ? { ...state.activeBoard, labels: [...state.activeBoard.labels, data] } : state.activeBoard,
    }));
    if (!board) return data;
    return data;
  },

  async createCard(listId, title) {
    const board = get().activeBoard;
    if (!board) return;
    const list = board.lists.find((item) => item.id === listId);
    const maxPosition = list?.cards.length ? Math.max(...list.cards.map((card) => card.position)) : 0;
    const now = new Date().toISOString();
    const tempId = -Date.now();
    const optimisticCard: Card = {
      id: tempId,
      list_id: listId,
      title,
      description: null,
      position: maxPosition + 1024,
      due_date: null,
      cover_color: null,
      cover_image_url: null,
      archived: false,
      created_by_id: get().currentUser?.id ?? null,
      created_at: now,
      updated_at: now,
      labels: [],
      members: [],
      checklists: [],
      activities: [],
    };
    set({ activeBoard: replaceCard(board, optimisticCard) });
    try {
      const { data } = await api.post<Card>("/cards", { list_id: listId, title });
      set((state) => {
        const current = state.activeBoard ?? board;
        return {
          activeBoard: {
            ...current,
            lists: current.lists.map((currentList) => {
              if (currentList.id !== listId) return currentList;
              const cards = [...currentList.cards.filter((card) => card.id !== tempId && card.id !== data.id), data].sort(
                (a, b) => a.position - b.position,
              );
              return { ...currentList, cards };
            }),
          },
        };
      });
    } catch (error) {
      const current = get().activeBoard ?? board;
      set({
        activeBoard: {
          ...current,
          lists: current.lists.map((currentList) => ({
            ...currentList,
            cards: currentList.cards.filter((card) => card.id !== tempId),
          })),
        },
        error: "Could not create card. Please try again.",
      });
      showError("Could not create card", errorDetail(error));
    }
  },

  async updateCard(cardId, payload) {
    const board = get().activeBoard;
    if (!board) return;
    // Optimistic update for snappy UX
    const existing = board.lists.flatMap((list) => list.cards).find((card) => card.id === cardId);
    if (existing) {
      const labels = payload.label_ids
        ? board.labels.filter((label) => payload.label_ids!.includes(label.id))
        : existing.labels;
      const members = payload.member_ids
        ? get().users.filter((user) => payload.member_ids!.includes(user.id))
        : existing.members;
      const optimistic: Card = {
        ...existing,
        ...("title" in payload ? { title: payload.title as string } : {}),
        ...("description" in payload ? { description: payload.description as string | null } : {}),
        ...("due_date" in payload ? { due_date: payload.due_date as string | null } : {}),
        ...("cover_color" in payload ? { cover_color: payload.cover_color as string | null } : {}),
        ...("cover_image_url" in payload ? { cover_image_url: payload.cover_image_url as string | null } : {}),
        ...("archived" in payload ? { archived: payload.archived as boolean } : {}),
        ...("checklists" in payload ? { checklists: payload.checklists as Card["checklists"] } : {}),
        labels,
        members,
      };
      set({
        activeBoard: replaceCard(board, optimistic),
        selectedCard: get().selectedCard?.id === cardId ? optimistic : get().selectedCard,
      });
    }
    try {
      const { data } = await api.patch<Card>(`/cards/${cardId}`, payload);
      const current = get().activeBoard ?? board;
      set({
        activeBoard: replaceCard(current, data),
        selectedCard: get().selectedCard?.id === cardId ? data : get().selectedCard,
      });
    } catch (error) {
      showError("Could not save changes", errorDetail(error));
    }
  },

  async addCardComment(cardId, detail) {
    const board = get().activeBoard;
    if (!board) return;
    const { data } = await api.post<Card>(`/cards/${cardId}/comments`, { detail });
    const nextBoard = replaceCard(get().activeBoard ?? board, data);
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
      // Only apply the server response if the card hasn't been moved again in the meantime.
      // If the card's current list_id or position differs from what we sent, a newer drag has
      // already updated the optimistic state — don't clobber it.
      const current = get().activeBoard;
      if (current) {
        const currentCard = current.lists.flatMap((l) => l.cards).find((c) => c.id === cardId);
        if (!currentCard || (currentCard.list_id === data.list_id && currentCard.position === position)) {
          set({ activeBoard: replaceCard(current, data) });
        }
      }
    } catch (error) {
      set({ activeBoard: snapshot, error: "Move failed, restored previous card order." });
      showError("Move failed", errorDetail(error) ?? "Restored previous card order.");
    }
  },

  setSelectedCard(card) {
    set({ selectedCard: card });
  },

  setFilters(filters) {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
  },

  async archiveCard(card: Card) {
    const board = get().activeBoard;
    if (!board) return;
    const snapshotBoard = board;
    const snapshotArchived = get().archivedCards;
    const archivedCard = { ...card, archived: true };
    set({
      archivedCards: [archivedCard, ...snapshotArchived.filter((c) => c.id !== card.id)],
      archivedCardsBoardId: board.id,
      activeBoard: { ...board, lists: board.lists.map((l) => ({ ...l, cards: l.cards.filter((c) => c.id !== card.id) })) },
      selectedCard: get().selectedCard?.id === card.id ? null : get().selectedCard,
    });
    showSuccess("Card archived", `"${card.title}" moved to archived cards`);
    try {
      const { data } = await api.patch<Card>(`/cards/${card.id}`, { archived: true });
      set((state) => ({
        archivedCards:
          state.archivedCardsBoardId === board.id
            ? [data, ...state.archivedCards.filter((item) => item.id !== data.id)]
            : state.archivedCards,
      }));
    } catch (error) {
      set({
        activeBoard: snapshotBoard,
        archivedCards: snapshotArchived,
        archivedCardsBoardId: board.id,
      });
      showError("Could not archive card", errorDetail(error));
    }
  },

  async fetchArchivedCards(boardId, force = false) {
    if (!force && get().archivedCardsBoardId === boardId) {
      return get().archivedCards;
    }
    try {
      const { data } = await api.get<Card[]>(`/boards/${boardId}/archived-cards`);
      set({ archivedCards: data, archivedCardsBoardId: boardId });
      return data;
    } catch {
      set({ archivedCards: [], archivedCardsBoardId: boardId });
      return [];
    }
  },

  async unarchiveCard(cardId) {
    const board = get().activeBoard;
    if (!board) return;
    // Find the card in archivedCards
    const card = get().archivedCards.find((c) => c.id === cardId);
    if (!card) return;
    // Optimistic update: remove from archivedCards and add to board immediately
    const unarchivedCard = { ...card, archived: false };
    set({
      archivedCards: get().archivedCards.filter((c) => c.id !== cardId),
      archivedCardsBoardId: board.id,
      activeBoard: replaceCard(board, unarchivedCard),
    });
    try {
      const { data } = await api.patch<Card>(`/cards/${cardId}`, { archived: false });
      const current = get().activeBoard;
      if (current) set({ activeBoard: replaceCard(current, data) });
      showSuccess("Card restored", `"${data.title}" returned to the board`);
    } catch (error) {
      // Rollback: add back to archivedCards and remove from board
      set({
        archivedCards: [...get().archivedCards, card],
        archivedCardsBoardId: board.id,
        activeBoard: board,
      });
      showError("Could not restore card", errorDetail(error));
    }
  },
}));
