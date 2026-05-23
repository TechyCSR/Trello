import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { ArrowLeft, Filter, Loader2, Plus, Search, Share2, Users } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { BoardListColumn } from "@/components/BoardListColumn";
import { CardDialog } from "@/components/CardDialog";
import { CardFace } from "@/components/KanbanCard";
import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { findUserBySlug, toUserSlug } from "@/lib/userSlug";
import { useAppStore } from "@/store/useAppStore";
import type { BoardList, Card } from "@/types";

type DragState =
  | { type: "card"; card: Card }
  | { type: "list"; list: BoardList }
  | null;

export function BoardWorkspacePage() {
  const { boardId, username = "" } = useParams();
  const navigate = useNavigate();
  const {
    users,
    currentUser,
    activeBoard,
    isLoadingBoard,
    error,
    filters,
    fetchBoard,
    createList,
    updateBoard,
    setFilters,
    moveCard,
    reorderLists,
    setCurrentUser,
  } = useAppStore();
  const [listTitle, setListTitle] = useState("");
  const [boardTitle, setBoardTitle] = useState("");
  const [activeDrag, setActiveDrag] = useState<DragState>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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
    if (boardId) void fetchBoard(Number(boardId));
  }, [boardId, fetchBoard]);

  useEffect(() => {
    if (activeBoard) setBoardTitle(activeBoard.title);
  }, [activeBoard?.id, activeBoard?.title]);

  const filteredLists = useMemo(() => {
    if (!activeBoard) return [];
    const now = new Date();
    const week = new Date(now);
    week.setDate(now.getDate() + 7);
    return activeBoard.lists.map((list) => ({
      ...list,
      cards: list.cards.filter((card) => {
        const matchesQuery = card.title.toLowerCase().includes(filters.cardQuery.toLowerCase());
        const matchesLabel = !filters.labelId || card.labels.some((label) => label.id === filters.labelId);
        const matchesMember = !filters.memberId || card.members.some((member) => member.id === filters.memberId);
        const due = card.due_date ? new Date(card.due_date) : null;
        const matchesDue =
          filters.due === "all" ||
          (filters.due === "overdue" && due !== null && due < now) ||
          (filters.due === "week" && due !== null && due <= week);
        return matchesQuery && matchesLabel && matchesMember && matchesDue;
      }),
    }));
  }, [activeBoard, filters]);

  async function submitList(event: FormEvent) {
    event.preventDefault();
    if (!listTitle.trim()) return;
    await createList(listTitle.trim());
    setListTitle("");
  }

  async function commitBoardTitle() {
    if (activeBoard && boardTitle.trim() && boardTitle.trim() !== activeBoard.title) {
      await updateBoard(activeBoard.id, { title: boardTitle.trim() });
    }
  }

  function onDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.type === "card") setActiveDrag({ type: "card", card: data.card });
    if (data?.type === "list") setActiveDrag({ type: "list", list: data.list });
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDrag(null);
    if (!over || !activeBoard) return;
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
      const list = filteredLists.find((item) => item.id === targetListId);
      targetIndex = Math.max(0, list?.cards.findIndex((card) => card.id === overCard.id) ?? 0);
    }
    if (overData?.type === "list" || overData?.type === "list-drop") {
      const list = overData.list as BoardList;
      targetListId = list.id;
      targetIndex = list.cards.length;
    }
    if (targetListId) {
      await moveCard(cardId, targetListId, targetIndex);
    }
  }

  if (isLoadingBoard || !activeBoard) {
    return (
      <main className="grid min-h-[calc(100vh-56px)] place-items-center">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-3 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
          Loading board
        </div>
      </main>
    );
  }

  const routeUserSlug = currentUser ? toUserSlug(currentUser.name) : username;

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-4">
      {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-border bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back to boards">
            <Link to={`/${routeUserSlug}/boards`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <Input
              className="h-8 border-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
              value={boardTitle}
              onChange={(event) => setBoardTitle(event.target.value)}
              onBlur={commitBoardTitle}
              onKeyDown={(event) => event.key === "Enter" && void commitBoardTitle()}
            />
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge className={activeBoard.is_public ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-700"}>
                {activeBoard.is_public ? "Public" : "Private"}
              </Badge>
              <Badge className="gap-1">
                <Users className="h-3 w-3" />
                {activeBoard.members.length} members
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => void navigator.clipboard?.writeText(window.location.href)}>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button variant="secondary" onClick={() => void updateBoard(activeBoard.id, { is_public: !activeBoard.is_public })}>
            {activeBoard.is_public ? "Make private" : "Make public"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <WorkspaceSidebar board={activeBoard} />
        <section className="min-w-0">
          <div className="mb-3 grid gap-2 rounded-lg border border-border bg-white p-3 shadow-sm xl:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search cards" value={filters.cardQuery} onChange={(event) => setFilters({ cardQuery: event.target.value })} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select className="h-9 rounded-md border border-border bg-white px-2 text-sm" value={filters.labelId ?? ""} onChange={(event) => setFilters({ labelId: event.target.value ? Number(event.target.value) : null })}>
                <option value="">All labels</option>
                {activeBoard.labels.map((label) => (
                  <option key={label.id} value={label.id}>
                    {label.name}
                  </option>
                ))}
              </select>
              <select className="h-9 rounded-md border border-border bg-white px-2 text-sm" value={filters.memberId ?? ""} onChange={(event) => setFilters({ memberId: event.target.value ? Number(event.target.value) : null })}>
                <option value="">All members</option>
                {activeBoard.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <select className="h-9 rounded-md border border-border bg-white px-2 text-sm" value={filters.due} onChange={(event) => setFilters({ due: event.target.value as "all" | "overdue" | "week" })}>
                <option value="all">Any due date</option>
                <option value="overdue">Overdue</option>
                <option value="week">Due this week</option>
              </select>
            </div>
            <form onSubmit={submitList} className="flex gap-2">
              <Input value={listTitle} onChange={(event) => setListTitle(event.target.value)} placeholder="New list" />
              <Button type="submit" size="icon" aria-label="Create list">
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="kanban-scroll flex min-h-[calc(100vh-210px)] gap-3 overflow-x-auto pb-4">
              <SortableContext items={filteredLists.map((list) => `list-${list.id}`)} strategy={horizontalListSortingStrategy}>
                {filteredLists.map((list) => (
                  <BoardListColumn key={list.id} list={list} cards={list.cards} />
                ))}
              </SortableContext>
            </div>
            <DragOverlay>
              {activeDrag?.type === "card" ? (
                <div className="w-[260px] rotate-2 rounded-md border border-border bg-white p-3 shadow-board">
                  <CardFace card={activeDrag.card} compact />
                </div>
              ) : null}
              {activeDrag?.type === "list" ? <div className="w-[272px] rounded-lg border border-border bg-slate-100 p-3 shadow-board">{activeDrag.list.title}</div> : null}
            </DragOverlay>
          </DndContext>
        </section>
      </div>
      <CardDialog />
    </main>
  );
}
