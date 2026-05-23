import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  Bell,
  CheckCircle2,
  Circle,
  Ellipsis,
  Filter,
  Inbox,
  LayoutPanelLeft,
  Loader2,
  PanelLeftClose,
  PanelRightClose,
  Plus,
  Search,
  SquarePen,
  Share2,
  Star,
  SwitchCamera,
  Users,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { BoardListColumn } from "@/components/BoardListColumn";
import { CardDialog } from "@/components/CardDialog";
import { CardFace } from "@/components/KanbanCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { findUserBySlug, toUserSlug } from "@/lib/userSlug";
import { useAppStore } from "@/store/useAppStore";
import type { BoardList, Card } from "@/types";

type DragState =
  | { type: "card"; card: Card }
  | { type: "list"; list: BoardList }
  | null;

const PANEL_MIN = 20;
const PANEL_MAX = 55;
const PANEL_KEY = "flowboard:workspace:leftPanelWidth";
const SHOW_INBOX_KEY = "flowboard:workspace:showInbox";
const SHOW_BOARD_KEY = "flowboard:workspace:showBoard";

function readBoolStorage(key: string, fallback: boolean) {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === "true";
}

function readNumberStorage(key: string, fallback: number) {
  const raw = Number(localStorage.getItem(key));
  if (Number.isNaN(raw)) return fallback;
  return Math.max(PANEL_MIN, Math.min(PANEL_MAX, raw));
}

const LIST_ACCENTS = ["bg-[#4e2a6f]", "bg-[#614700]", "bg-[#123d77]", "bg-[#1c2d0b]", "bg-[#6e224f]", "bg-[#2f3550]"];

function InboxCardRow({
  card,
  isDone,
  isEditing,
  editingTitle,
  onEditTitleChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onToggleDone,
  onOpenDetails,
  isSaving,
}: {
  card: Card;
  isDone: boolean;
  isEditing: boolean;
  editingTitle: string;
  onEditTitleChange: (value: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onToggleDone: () => void;
  onOpenDetails: () => void;
  isSaving: boolean;
}) {
  const sortable = useSortable({
    id: `card-${card.id}`,
    data: { type: "card", card },
  });

  return (
    <div
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }}
      className={`rounded-xl border border-white/15 bg-[#222733] p-3 shadow-sm transition hover:border-white/35 ${
        sortable.isDragging ? "opacity-40" : ""
      }`}
      {...sortable.attributes}
      {...sortable.listeners}
    >
      {isEditing ? (
        <div className="space-y-2">
          <Input
            value={editingTitle}
            onChange={(event) => onEditTitleChange(event.target.value)}
            className="h-10 border-blue-300/70 bg-[#1f2330] text-slate-100"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !isSaving) onSaveEdit();
              if (event.key === "Escape") onCancelEdit();
            }}
            autoFocus
            disabled={isSaving}
          />
          <div className="flex items-center gap-2">
            <Button type="button" className="h-8 bg-blue-500 px-3 text-slate-100 hover:bg-blue-400" onClick={onSaveEdit} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
            <Button type="button" variant="ghost" className="h-8 px-2 text-slate-200 hover:bg-white/10" onClick={onCancelEdit} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="shrink-0 text-slate-300 hover:text-emerald-300"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onToggleDone();
            }}
            aria-label={isDone ? "Mark as incomplete" : "Mark as complete"}
          >
            {isDone ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <Circle className="h-5 w-5" />}
          </button>
          <button
            type="button"
            className={`min-w-0 flex-1 truncate text-left text-2xl ${
              isDone ? "text-slate-400 line-through" : "text-slate-100"
            }`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onOpenDetails();
            }}
          >
            {card.title}
          </button>
          <button
            type="button"
            className="shrink-0 rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-slate-100"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onStartEdit();
            }}
            aria-label="Edit inbox card"
          >
            <SquarePen className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function BoardWorkspacePage() {
  const { boardId, username = "" } = useParams();
  const navigate = useNavigate();
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const isResizingRef = useRef(false);
  const {
    users,
    currentUser,
    boards,
    activeBoard,
    isLoadingBoard,
    error,
    filters,
    starredBoardIds,
    fetchBoards,
    fetchBoard,
    createList,
    createCard,
    updateBoard,
    setFilters,
    moveCard,
    reorderLists,
    setCurrentUser,
    setSelectedCard,
    toggleStarredBoard,
    updateCard,
  } = useAppStore();
  const [listTitle, setListTitle] = useState("");
  const [inboxCardTitle, setInboxCardTitle] = useState("");
  const [boardTitle, setBoardTitle] = useState("");
  const [inboxTitle, setInboxTitle] = useState("");
  const [boardSectionTitle, setBoardSectionTitle] = useState("");
  const [activeDrag, setActiveDrag] = useState<DragState>(null);
  const [isBoardSwitchOpen, setIsBoardSwitchOpen] = useState(false);
  const [showInbox, setShowInbox] = useState(() => readBoolStorage(SHOW_INBOX_KEY, true));
  const [showBoard, setShowBoard] = useState(() => readBoolStorage(SHOW_BOARD_KEY, true));
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => readNumberStorage(PANEL_KEY, 33));
  const [inboxDoneIds, setInboxDoneIds] = useState<number[]>([]);
  const [editingInboxCardId, setEditingInboxCardId] = useState<number | null>(null);
  const [editingInboxTitle, setEditingInboxTitle] = useState("");
  const [isCreatingInboxCard, setIsCreatingInboxCard] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [savingInboxCardId, setSavingInboxCardId] = useState<number | null>(null);
  const [isSavingBoardTitle, setIsSavingBoardTitle] = useState(false);
  const [isSavingInboxTitle, setIsSavingInboxTitle] = useState(false);
  const [isSavingBoardSectionTitle, setIsSavingBoardSectionTitle] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const inboxDrop = useDroppable({
    id: "inbox-drop",
    data: { type: "inbox-drop", listId: activeBoard?.lists?.[0]?.id ?? null },
  });

  useEffect(() => {
    if (!users.length || !username) return;
    const matched = findUserBySlug(users, username);
    if (matched && currentUser?.id !== matched.id) {
      setCurrentUser(matched.id);
      return;
    }
    if (!matched && currentUser) {
      navigate(`/${toUserSlug(currentUser.name)}/boards`, { replace: true });
    }
  }, [users, username, currentUser, setCurrentUser, navigate]);

  useEffect(() => {
    if (boardId) void fetchBoard(boardId);
  }, [boardId, fetchBoard]);

  useEffect(() => {
    if (currentUser) void fetchBoards();
  }, [currentUser, fetchBoards]);

  useEffect(() => {
    if (!activeBoard) return;
    setBoardTitle(activeBoard.title);
    setInboxTitle(activeBoard.inbox_title || "Inbox");
    setBoardSectionTitle(activeBoard.board_section_title || "Board");
    const raw = localStorage.getItem(`flowboard:inboxDone:${activeBoard.id}`);
    if (!raw) {
      setInboxDoneIds([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setInboxDoneIds(Array.isArray(parsed) ? parsed.filter((item) => Number.isInteger(item)) : []);
    } catch {
      setInboxDoneIds([]);
    }
  }, [activeBoard?.id, activeBoard?.title, activeBoard?.inbox_title, activeBoard?.board_section_title]);

  useEffect(() => {
    localStorage.setItem(SHOW_INBOX_KEY, String(showInbox));
  }, [showInbox]);

  useEffect(() => {
    localStorage.setItem(SHOW_BOARD_KEY, String(showBoard));
  }, [showBoard]);

  useEffect(() => {
    localStorage.setItem(PANEL_KEY, String(leftPanelWidth));
  }, [leftPanelWidth]);
  useEffect(() => {
    if (!activeBoard) return;
    localStorage.setItem(`flowboard:inboxDone:${activeBoard.id}`, JSON.stringify(inboxDoneIds));
  }, [activeBoard?.id, inboxDoneIds]);

  useEffect(() => {
    function onMove(event: MouseEvent) {
      if (!isResizingRef.current || !workspaceRef.current) return;
      const rect = workspaceRef.current.getBoundingClientRect();
      const next = ((event.clientX - rect.left) / rect.width) * 100;
      setLeftPanelWidth(Math.max(PANEL_MIN, Math.min(PANEL_MAX, next)));
    }
    function onUp() {
      isResizingRef.current = false;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const routeUserSlug = currentUser ? toUserSlug(currentUser.name) : username;
  const isStarred = activeBoard ? starredBoardIds.includes(activeBoard.id) : false;
  const inboxList = activeBoard?.lists.find((list) => list.is_inbox) ?? activeBoard?.lists?.[0] ?? null;
  const boardLists = useMemo(
    () => (activeBoard && inboxList ? activeBoard.lists.filter((list) => list.id !== inboxList.id) : activeBoard?.lists ?? []),
    [activeBoard, inboxList],
  );

  const matchesCardFilters = (card: Card) => {
    const now = new Date();
    const week = new Date(now);
    week.setDate(now.getDate() + 7);
    const matchesQuery = card.title.toLowerCase().includes(filters.cardQuery.toLowerCase());
    const matchesLabel = !filters.labelId || card.labels.some((label) => label.id === filters.labelId);
    const matchesMember = !filters.memberId || card.members.some((member) => member.id === filters.memberId);
    const due = card.due_date ? new Date(card.due_date) : null;
    const matchesDue =
      filters.due === "all" ||
      (filters.due === "overdue" && due !== null && due < now) ||
      (filters.due === "week" && due !== null && due <= week);
    return matchesQuery && matchesLabel && matchesMember && matchesDue;
  };

  const filteredInboxCards = useMemo(() => (inboxList ? inboxList.cards.filter(matchesCardFilters) : []), [inboxList, filters]);
  const filteredBoardLists = useMemo(
    () =>
      boardLists.map((list) => ({
        ...list,
        cards: list.cards.filter(matchesCardFilters),
      })),
    [boardLists, filters],
  );

  async function submitList(event: FormEvent) {
    event.preventDefault();
    if (!listTitle.trim() || isCreatingList) return;
    setIsCreatingList(true);
    try {
      await createList(listTitle.trim());
      setListTitle("");
    } finally {
      setIsCreatingList(false);
    }
  }

  async function submitInboxCard(event: FormEvent) {
    event.preventDefault();
    if (!inboxCardTitle.trim() || isCreatingInboxCard) return;
    setIsCreatingInboxCard(true);
    try {
      if (!inboxList) {
        const createdInbox = await createList(inboxTitle.trim() || "Inbox", true);
        if (!createdInbox) return;
        await createCard(createdInbox.id, inboxCardTitle.trim());
        setInboxCardTitle("");
        return;
      }
      await createCard(inboxList.id, inboxCardTitle.trim());
      setInboxCardTitle("");
    } finally {
      setIsCreatingInboxCard(false);
    }
  }

  async function saveInboxCardTitle(cardId: number) {
    if (savingInboxCardId === cardId) return;
    const next = editingInboxTitle.trim();
    if (!next) {
      setEditingInboxCardId(null);
      setEditingInboxTitle("");
      return;
    }
    setSavingInboxCardId(cardId);
    try {
      await updateCard(cardId, { title: next });
      setEditingInboxCardId(null);
      setEditingInboxTitle("");
    } finally {
      setSavingInboxCardId(null);
    }
  }

  function toggleInboxDone(cardId: number) {
    setInboxDoneIds((current) =>
      current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId],
    );
  }

  async function commitBoardTitle() {
    if (activeBoard && boardTitle.trim() && boardTitle.trim() !== activeBoard.title) {
      if (isSavingBoardTitle) return;
      setIsSavingBoardTitle(true);
      try {
        await updateBoard(activeBoard.id, { title: boardTitle.trim() });
      } finally {
        setIsSavingBoardTitle(false);
      }
    }
  }

  async function commitInboxTitle() {
    if (activeBoard && inboxTitle.trim() && inboxTitle.trim() !== activeBoard.inbox_title) {
      if (isSavingInboxTitle) return;
      setIsSavingInboxTitle(true);
      try {
        await updateBoard(activeBoard.id, { inbox_title: inboxTitle.trim() });
      } finally {
        setIsSavingInboxTitle(false);
      }
    }
  }

  async function commitBoardSectionTitle() {
    if (activeBoard && boardSectionTitle.trim() && boardSectionTitle.trim() !== activeBoard.board_section_title) {
      if (isSavingBoardSectionTitle) return;
      setIsSavingBoardSectionTitle(true);
      try {
        await updateBoard(activeBoard.id, { board_section_title: boardSectionTitle.trim() });
      } finally {
        setIsSavingBoardSectionTitle(false);
      }
    }
  }

  function toggleInbox() {
    if (showInbox && !showBoard) return;
    setShowInbox((value) => !value);
  }

  function toggleBoard() {
    if (showBoard && !showInbox) return;
    setShowBoard((value) => !value);
  }

  function onDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.type === "card") setActiveDrag({ type: "card", card: data.card });
    if (data?.type === "list") setActiveDrag({ type: "list", list: data.list });
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDrag(null);
    if (!over || !activeBoard || !inboxList) return;
    const activeData = active.data.current;
    const overData = over.data.current;
    if (activeData?.type === "list" && overData?.type === "list") {
      await reorderLists(Number(String(active.id).replace("list-", "")), Number(String(over.id).replace("list-", "")));
      return;
    }
    if (activeData?.type !== "card") return;
    const cardId = Number(String(active.id).replace("card-", ""));
    let targetListId: number | null = null;
    let targetIndex = 0;

    if (overData?.type === "card") {
      const overCard = overData.card as Card;
      targetListId = overCard.list_id;
      const parent = activeBoard.lists.find((list) => list.id === targetListId);
      targetIndex = Math.max(0, parent?.cards.findIndex((card) => card.id === overCard.id) ?? 0);
    }
    if (overData?.type === "list" || overData?.type === "list-drop") {
      const list = overData.list as BoardList;
      targetListId = list.id;
      const parent = activeBoard.lists.find((item) => item.id === list.id);
      targetIndex = parent?.cards.length ?? list.cards.length;
    }
    if (overData?.type === "inbox-drop") {
      targetListId = inboxList.id;
      targetIndex = inboxList.cards.length;
    }
    if (targetListId) {
      await moveCard(cardId, targetListId, targetIndex);
    }
  }

  if (isLoadingBoard || !activeBoard) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#211d2c]">
        <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-slate-100 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-sky-300" />
          Loading board
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_18%_0%,_#2a2459_0%,_#4f2f77_34%,_#7e4686_66%,_#93548b_100%)] px-4 pb-20 pt-4">
      {error && <div className="mb-3 rounded-md border border-red-300/50 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</div>}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div
          ref={workspaceRef}
          className="relative flex min-h-[calc(100vh-220px)] gap-3"
        >
        <section
          className={`flex min-h-full flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0f2a57]/95 text-slate-100 shadow-2xl transition-all duration-300 ${showInbox ? "opacity-100" : "pointer-events-none w-0 opacity-0"}`}
          style={showInbox && showBoard ? { width: `${leftPanelWidth}%` } : showInbox ? { width: "100%" } : undefined}
        >
          {showInbox && (
            <>
              <header className="sticky top-0 z-20 border-b border-white/15 bg-[#102b59] px-4 py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Inbox className="h-5 w-5 text-sky-200" />
                    <Input
                      className="h-8 border-transparent bg-transparent px-0 text-3xl font-semibold text-slate-100 shadow-none focus-visible:ring-0"
                      value={inboxTitle}
                      onChange={(event) => setInboxTitle(event.target.value)}
                      onBlur={commitInboxTitle}
                      onKeyDown={(event) => event.key === "Enter" && void commitInboxTitle()}
                      disabled={isSavingInboxTitle}
                    />
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-100 hover:bg-white/10" onClick={toggleInbox} aria-label="Hide inbox section">
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </div>
                <form onSubmit={submitInboxCard} className="rounded-xl bg-black/25 p-2">
                  <Input
                    value={inboxCardTitle}
                    onChange={(event) => setInboxCardTitle(event.target.value)}
                    placeholder="Enter a title"
                    className="h-11 rounded-lg border-blue-300/70 bg-[#1f2330] text-lg text-slate-100 placeholder:text-slate-300"
                    disabled={isCreatingInboxCard}
                  />
                  {inboxCardTitle.trim().length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <Button type="submit" className="h-9 bg-blue-500 px-4 text-slate-100 hover:bg-blue-400" disabled={isCreatingInboxCard}>
                        {isCreatingInboxCard ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add card"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 px-3 text-base text-slate-200 hover:bg-white/10"
                        onClick={() => setInboxCardTitle("")}
                        disabled={isCreatingInboxCard}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </form>
              </header>
              <div ref={inboxDrop.setNodeRef} className="kanban-scroll flex-1 space-y-2 overflow-y-auto p-3">
                <SortableContext items={filteredInboxCards.map((card) => `card-${card.id}`)} strategy={verticalListSortingStrategy}>
                  {filteredInboxCards.map((card) => {
                    const isDone = inboxDoneIds.includes(card.id);
                    return (
                      <InboxCardRow
                        key={card.id}
                        card={card}
                        isDone={isDone}
                        isEditing={editingInboxCardId === card.id}
                        editingTitle={editingInboxTitle}
                        onEditTitleChange={setEditingInboxTitle}
                        onStartEdit={() => {
                          setEditingInboxCardId(card.id);
                          setEditingInboxTitle(card.title);
                        }}
                        onSaveEdit={() => void saveInboxCardTitle(card.id)}
                        onCancelEdit={() => {
                          setEditingInboxCardId(null);
                          setEditingInboxTitle("");
                        }}
                        onToggleDone={() => toggleInboxDone(card.id)}
                        onOpenDetails={() => setSelectedCard(card)}
                        isSaving={savingInboxCardId === card.id}
                      />
                    );
                  })}
                </SortableContext>
                {!filteredInboxCards.length && <div className="rounded-xl border border-dashed border-white/30 bg-black/20 p-4 text-center text-sm text-slate-300">Drop cards here</div>}
              </div>
              <div className="border-t border-white/15 p-3">
                <div className="flex items-center justify-between rounded-full border border-white/15 bg-black/20 px-3 py-2 text-sm text-slate-300">
                  <span>Consolidate your to-dos</span>
                  <div className="flex items-center gap-1 text-slate-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-300" />
                    <span className="h-2 w-2 rounded-full bg-amber-300" />
                    <span className="h-2 w-2 rounded-full bg-cyan-300" />
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {showInbox && showBoard && (
          <button
            className="hidden w-2 shrink-0 cursor-col-resize rounded-full bg-white/30 transition hover:bg-white/55 lg:block"
            aria-label="Resize panels"
            onMouseDown={() => {
              isResizingRef.current = true;
            }}
          />
        )}

        <section className={`flex min-h-full min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#51306f]/90 text-slate-100 shadow-2xl transition-all duration-300 ${showBoard ? "opacity-100" : "pointer-events-none w-0 opacity-0"}`}>
          {showBoard && (
            <>
              <header className="sticky top-0 z-20 border-b border-white/15 bg-[#563777] px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Input
                      className="h-8 border-transparent bg-transparent px-0 text-2xl font-semibold text-slate-100 shadow-none focus-visible:ring-0"
                      value={boardTitle}
                      onChange={(event) => setBoardTitle(event.target.value)}
                      onBlur={commitBoardTitle}
                      onKeyDown={(event) => event.key === "Enter" && void commitBoardTitle()}
                      disabled={isSavingBoardTitle}
                    />
                    <Input
                      className="h-8 w-40 border-white/20 bg-black/20 text-sm text-slate-100 placeholder:text-slate-300"
                      value={boardSectionTitle}
                      onChange={(event) => setBoardSectionTitle(event.target.value)}
                      onBlur={commitBoardSectionTitle}
                      onKeyDown={(event) => event.key === "Enter" && void commitBoardSectionTitle()}
                      disabled={isSavingBoardSectionTitle}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative hidden sm:block">
                      <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-slate-300" />
                      <Input
                        className="h-8 w-56 border-white/20 bg-black/20 pl-8 text-slate-100 placeholder:text-slate-300"
                        placeholder="Search cards"
                        value={filters.cardQuery}
                        onChange={(event) => setFilters({ cardQuery: event.target.value })}
                      />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-100 hover:bg-white/10" onClick={toggleBoard} aria-label="Hide board section">
                      <PanelRightClose className="h-4 w-4" />
                    </Button>
                    <Badge className={activeBoard.is_public ? "border-emerald-300/40 bg-emerald-500/20 text-emerald-100" : "border-slate-200/30 bg-white/10 text-slate-100"}>
                      {activeBoard.is_public ? "Public" : "Private"}
                    </Badge>
                    <Badge className="gap-1 border-white/25 bg-white/10 text-slate-100">
                      <Users className="h-3 w-3" />
                      {activeBoard.members.length}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-200 hover:bg-white/15" onClick={() => toggleStarredBoard(activeBoard.id)} aria-label="Toggle favorite board">
                      <Star className={`h-4 w-4 ${isStarred ? "fill-yellow-300 text-yellow-300" : ""}`} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-200 hover:bg-white/15" aria-label="Filter board">
                      <Filter className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-200 hover:bg-white/15" aria-label="Notifications">
                      <Bell className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" className="h-9 border border-white/20 bg-white/10 text-slate-100 hover:bg-white/20" onClick={() => void navigator.clipboard?.writeText(window.location.href)}>
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-200 hover:bg-white/15" aria-label="More board options">
                      <Ellipsis className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select className="h-8 rounded-md border border-white/25 bg-black/20 px-2 text-sm text-slate-100" value={filters.labelId ?? ""} onChange={(event) => setFilters({ labelId: event.target.value ? Number(event.target.value) : null })}>
                    <option value="">All labels</option>
                    {activeBoard.labels.map((label) => (
                      <option key={label.id} value={label.id} className="text-slate-900">
                        {label.name}
                      </option>
                    ))}
                  </select>
                  <select className="h-8 rounded-md border border-white/25 bg-black/20 px-2 text-sm text-slate-100" value={filters.memberId ?? ""} onChange={(event) => setFilters({ memberId: event.target.value ? Number(event.target.value) : null })}>
                    <option value="">All members</option>
                    {activeBoard.members.map((member) => (
                      <option key={member.id} value={member.id} className="text-slate-900">
                        {member.name}
                      </option>
                    ))}
                  </select>
                  <select className="h-8 rounded-md border border-white/25 bg-black/20 px-2 text-sm text-slate-100" value={filters.due} onChange={(event) => setFilters({ due: event.target.value as "all" | "overdue" | "week" })}>
                    <option value="all">Any due date</option>
                    <option value="overdue">Overdue</option>
                    <option value="week">Due this week</option>
                  </select>
                  <form onSubmit={submitList} className="ml-auto flex gap-2">
                    <Input
                      value={listTitle}
                      onChange={(event) => setListTitle(event.target.value)}
                      placeholder="New list"
                      className="h-8 border-white/20 bg-black/20 text-slate-100 placeholder:text-slate-300"
                      disabled={isCreatingList}
                    />
                    <Button type="submit" size="icon" className="h-8 w-8 bg-white/20 text-slate-100 hover:bg-white/30" aria-label="Create list" disabled={isCreatingList}>
                      {isCreatingList ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </form>
                </div>
              </header>

              <div className="kanban-scroll flex min-h-[calc(100vh-305px)] gap-3 overflow-x-auto p-3">
                <SortableContext items={filteredBoardLists.map((list) => `list-${list.id}`)} strategy={horizontalListSortingStrategy}>
                  {filteredBoardLists.map((list, index) => (
                    <BoardListColumn key={list.id} list={list} cards={list.cards} accentClass={LIST_ACCENTS[index % LIST_ACCENTS.length]} />
                  ))}
                </SortableContext>
              </div>
            </>
          )}
        </section>
        </div>
        <DragOverlay>
          {activeDrag?.type === "card" ? (
            <div className="w-[260px] rotate-2 rounded-xl border border-white/20 bg-[#1f2736] p-3 shadow-2xl">
              <CardFace card={activeDrag.card} compact />
            </div>
          ) : null}
          {activeDrag?.type === "list" ? <div className="w-[272px] rounded-2xl border border-white/20 bg-[#3f2559] p-3 text-slate-100 shadow-2xl">{activeDrag.list.title}</div> : null}
        </DragOverlay>
      </DndContext>

      <div className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-2xl border border-white/15 bg-[#11151f]/85 p-2 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Button variant="ghost" className={`h-10 rounded-xl px-4 text-base ${showInbox ? "bg-blue-500/25 text-blue-100" : "text-slate-200 hover:bg-white/10"}`} onClick={toggleInbox}>
            <Inbox className="h-4 w-4" />
            Inbox
          </Button>
          <Button variant="ghost" className={`h-10 rounded-xl px-4 text-base ${showBoard ? "bg-blue-500/25 text-blue-100" : "text-slate-200 hover:bg-white/10"}`} onClick={toggleBoard}>
            <LayoutPanelLeft className="h-4 w-4" />
            Board
          </Button>
          <Button variant="ghost" className="h-10 rounded-xl px-4 text-base text-slate-200 hover:bg-white/10" onClick={() => setIsBoardSwitchOpen(true)}>
            <SwitchCamera className="h-4 w-4" />
            Switch Boards
          </Button>
        </div>
      </div>

      <Dialog open={isBoardSwitchOpen} onOpenChange={setIsBoardSwitchOpen}>
        <DialogContent className="max-w-lg border-white/20 bg-[#1f2331] text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl">Switch Boards</DialogTitle>
          </DialogHeader>
          <div className="kanban-scroll max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {boards.map((board) => (
              <button
                key={board.id}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  board.id === activeBoard.id
                    ? "border-blue-300/40 bg-blue-500/20"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
                onClick={() => {
                  setIsBoardSwitchOpen(false);
                  navigate(`/${routeUserSlug}/boards/${board.board_code}`);
                }}
              >
                <div className="text-base font-semibold">{board.title}</div>
                <div className="mt-1 text-xs text-slate-300">{board.list_count} lists | {board.card_count} cards</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <CardDialog />
    </main>
  );
}
