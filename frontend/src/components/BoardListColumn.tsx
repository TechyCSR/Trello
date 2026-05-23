import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Loader2, MoreHorizontal, Plus, Trash2, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { KanbanCard } from "@/components/KanbanCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { BoardList, Card } from "@/types";

export function BoardListColumn({
  list,
  cards,
  accentClass = "bg-[#163e7a]",
}: {
  list: BoardList;
  cards: Card[];
  accentClass?: string;
}) {
  const { createCard, deleteList, updateList } = useAppStore();
  const [title, setTitle] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [editing, setEditing] = useState(false);
  const [listTitle, setListTitle] = useState(list.title);
  const cardIds = useMemo(() => cards.map((card) => `card-${card.id}`), [cards]);
  const { setNodeRef: setDropRef } = useDroppable({
    id: `list-drop-${list.id}`,
    data: { type: "list-drop", list },
  });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `list-${list.id}`,
    data: { type: "list", list },
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || isCreatingCard) return;
    setIsCreatingCard(true);
    try {
      await createCard(list.id, title.trim());
      setTitle("");
      setIsComposerOpen(false);
    } finally {
      setIsCreatingCard(false);
    }
  }

  async function commitTitle() {
    if (listTitle.trim() && listTitle.trim() !== list.title) {
      await updateList(list.id, listTitle.trim());
    }
    setEditing(false);
  }

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex max-h-[calc(100vh-240px)] w-[272px] shrink-0 flex-col rounded-2xl border border-white/10 text-slate-100 shadow-xl",
        accentClass,
        isDragging && "opacity-50 ring-2 ring-white/35",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-3" {...attributes} {...listeners}>
        {editing ? (
          <Input
            value={listTitle}
            onChange={(event) => setListTitle(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => event.key === "Enter" && void commitTitle()}
            autoFocus
            className="h-8 border-white/20 bg-black/20 text-sm text-slate-100 placeholder:text-slate-300"
          />
        ) : (
          <button className="truncate text-left text-lg font-semibold leading-none" onClick={() => setEditing(true)}>
            {list.title}
          </button>
        )}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Delete list" className="h-7 w-7 text-slate-200 hover:bg-white/10 hover:text-red-200" onClick={() => void deleteList(list.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="List options" className="h-7 w-7 text-slate-200 hover:bg-white/10">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div ref={setDropRef} className="kanban-scroll flex-1 space-y-2 overflow-y-auto px-2 pb-2 pt-2">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard key={card.id} card={card} />
          ))}
        </SortableContext>
        {!cards.length && <div className="rounded-xl border border-dashed border-white/30 bg-black/15 p-3 text-center text-sm text-slate-200">Drop cards here</div>}
      </div>
      <div className="border-t border-white/10 p-2">
        {isComposerOpen ? (
          <form onSubmit={submit} className="space-y-2">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter a title..."
              className="h-10 border-blue-300/80 bg-[#1f2330] text-slate-100 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-300"
              disabled={isCreatingCard}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button type="submit" className="h-9 bg-blue-500 px-3 text-slate-100 hover:bg-blue-400" disabled={isCreatingCard}>
                {isCreatingCard ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add card"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-slate-300 hover:bg-white/10 hover:text-slate-100"
                onClick={() => {
                  setIsComposerOpen(false);
                  setTitle("");
                }}
                disabled={isCreatingCard}
                aria-label="Cancel card creation"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="flex h-10 w-full items-center gap-2 rounded-xl px-2 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            onClick={() => setIsComposerOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add a card
          </button>
        )}
      </div>
    </section>
  );
}
