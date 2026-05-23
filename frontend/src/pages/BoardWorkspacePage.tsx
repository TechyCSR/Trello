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
  CheckCircle2,
  Circle,
  Inbox,
  LayoutPanelLeft,
  Loader2,
  PanelLeftClose,
  Plus,
  SquarePen,
  SwitchCamera,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { BoardListColumn } from "@/components/BoardListColumn";
import { CardDialog } from "@/components/CardDialog";
import { CardFace } from "@/components/KanbanCard";
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
            className={`min-w-0 flex-1 cursor-grab truncate text-left text-2xl active:cursor-grabbing ${
              isDone ? "text-slate-400 line-through" : "text-slate-100"
            }`}
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
    fetchBoards,
    fetchBoard,
    createList,
    createCard,
    updateBoard,
    moveCard,
    reorderLists,
    setCurrentUser,
    setSelectedCard,
    updateCard,
  } = useAppStore();
  const [listTitle, setListTitle] = useState("");
  const [inboxCardTitle, setInboxCardTitle] = useState("");
  const [boardTitle, setBoardTitle] = useState("");
  const [inboxTitle, setInboxTitle] = useState("");
  const [isEditingBoardTitle, setIsEditingBoardTitle] = useState(false);
  const [isListComposerOpen, setIsListComposerOpen] = useState(false);
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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const inboxList = activeBoard?.lists.find((list) => list.is_inbox) ?? activeBoard?.lists?.[0] ?? null;
  const inboxDrop = useDroppable({
    id: "inbox-drop",
    data: { type: "inbox-drop", listId: inboxList?.id ?? null },
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
    setIsEditingBoardTitle(false);
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
  }, [activeBoard?.id, activeBoard?.title, activeBoard?.inbox_title]);

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
  const boardLists = useMemo(
    () => (activeBoard && inboxList ? activeBoard.lists.filter((list) => list.id !== inboxList.id) : activeBoard?.lists ?? []),
    [activeBoard, inboxList],
  );

  const filteredInboxCards = useMemo(() => inboxList?.cards ?? [], [inboxList]);
  const filteredBoardLists = useMemo(
    () =>
      boardLists.map((list) => ({
        ...list,
        cards: list.cards,
      })),
    [boardLists],
  );

  async function submitList(event: FormEvent) {
    event.preventDefault();
    if (!listTitle.trim() || isCreatingList) return;
    setIsCreatingList(true);
    try {
      await createList(listTitle.trim());
      setListTitle("");
      setIsListComposerOpen(false);
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
        setIsEditingBoardTitle(false);
      }
      return;
    }
    setBoardTitle(activeBoard?.title ?? boardTitle);
    setIsEditingBoardTitle(false);
  }

  function cancelBoardTitleEdit() {
    setBoardTitle(activeBoard?.title ?? boardTitle);
    setIsEditingBoardTitle(false);
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
      <main className="grid min-h-[calc(100vh-56px)] place-items-center bg-[#211d2c]">
        <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-slate-100 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-sky-300" />
          Loading board
        </div>
      </main>
    );
  }

  return (
    <main className="h-[calc(100vh-56px)] overflow-hidden bg-[radial-gradient(circle_at_18%_0%,_#2a2459_0%,_#4f2f77_34%,_#7e4686_66%,_#93548b_100%)] p-4">
      {error && <div className="absolute left-4 right-4 top-16 z-50 rounded-md border border-red-300/50 bg-red-500/20 px-3 py-2 text-sm text-red-100 shadow-xl backdrop-blur">{error}</div>}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div
          ref={workspaceRef}
          className="relative flex h-full gap-3"
        >
        <section
          className={`flex h-full flex-col overflow-hidden rounded-3xl border border-white/20 bg-[#0f2a57]/95 text-slate-100 shadow-[0_18px_45px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-black/20 transition-all duration-300 ${showInbox ? "opacity-100" : "pointer-events-none w-0 opacity-0"}`}
          style={showInbox && showBoard ? { width: `${leftPanelWidth}%` } : showInbox ? { width: "100%" } : undefined}
        >
          {showInbox && (
            <>
              <header className="sticky top-0 z-20 border-b border-white/15 bg-[#102b59] px-4 py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Inbox className="h-5 w-5 text-sky-200" />
                    <h2 className="truncate text-2xl font-semibold text-slate-100">{inboxTitle || "Inbox"}</h2>
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
            className="group hidden w-3 shrink-0 cursor-col-resize rounded-full border border-white/15 bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_12px_28px_rgba(0,0,0,0.25)] transition hover:bg-white/40 lg:grid lg:place-items-center"
            aria-label="Resize panels"
            onMouseDown={() => {
              isResizingRef.current = true;
            }}
          >
            <span className="h-24 w-1 rounded-full bg-white/45 transition group-hover:bg-white/70" />
          </button>
        )}

        <section className={`flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/20 bg-[#51306f]/90 text-slate-100 shadow-[0_18px_45px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-black/20 transition-all duration-300 ${showBoard ? "opacity-100" : "pointer-events-none w-0 opacity-0"}`}>
          {showBoard && (
            <>
              <header className="sticky top-0 z-20 border-b border-white/15 bg-[#563777] px-4 py-3">
                {isEditingBoardTitle ? (
                  <div className="flex max-w-md items-center gap-2">
                    <Input
                      className="h-11 min-w-28 max-w-[min(520px,70vw)] rounded-lg border-blue-300/80 bg-[#1f2330] px-3 text-2xl font-semibold text-slate-100 shadow-none placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-blue-300"
                      style={{ width: `${Math.min(Math.max(boardTitle.length + 2, 8), 32)}ch` }}
                      value={boardTitle}
                      onChange={(event) => setBoardTitle(event.target.value)}
                      onBlur={commitBoardTitle}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void commitBoardTitle();
                        if (event.key === "Escape") cancelBoardTitleEdit();
                      }}
                      disabled={isSavingBoardTitle}
                      autoFocus
                    />
                    {isSavingBoardTitle && <Loader2 className="h-5 w-5 shrink-0 animate-spin text-blue-200" />}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="min-h-11 max-w-md truncate rounded-lg px-3 text-left text-2xl font-semibold text-slate-100 transition hover:bg-black/15"
                    onDoubleClick={() => setIsEditingBoardTitle(true)}
                    aria-label="Edit board name"
                  >
                    {activeBoard.title}
                  </button>
                )}
              </header>

              <div className="kanban-scroll flex flex-1 items-start gap-4 overflow-x-auto overflow-y-auto p-4 pb-24">
                <SortableContext items={filteredBoardLists.map((list) => `list-${list.id}`)} strategy={horizontalListSortingStrategy}>
                  {filteredBoardLists.map((list, index) => (
                    <BoardListColumn key={list.id} list={list} cards={list.cards} accentClass={LIST_ACCENTS[index % LIST_ACCENTS.length]} />
                  ))}
                </SortableContext>
                <div className="w-[320px] shrink-0">
                  {isListComposerOpen ? (
                    <form onSubmit={submitList} className="rounded-2xl bg-[#111806] p-3 shadow-xl">
                      <Input
                        value={listTitle}
                        onChange={(event) => setListTitle(event.target.value)}
                        placeholder="Enter list name..."
                        className="h-10 border-blue-300/80 bg-[#1f2330] text-slate-100 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-300"
                        disabled={isCreatingList}
                        autoFocus
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <Button type="submit" className="h-10 bg-blue-500 px-4 text-slate-100 hover:bg-blue-400" disabled={isCreatingList}>
                          {isCreatingList ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add list"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-slate-300 hover:bg-white/10 hover:text-slate-100"
                          onClick={() => {
                            setIsListComposerOpen(false);
                            setListTitle("");
                          }}
                          disabled={isCreatingList}
                          aria-label="Cancel list creation"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="flex h-14 w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/20 px-4 text-left text-lg font-semibold text-slate-100 shadow-xl transition hover:bg-white/25"
                      onClick={() => setIsListComposerOpen(true)}
                    >
                      <Plus className="h-5 w-5" />
                      Add another list
                    </button>
                  )}
                </div>
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
