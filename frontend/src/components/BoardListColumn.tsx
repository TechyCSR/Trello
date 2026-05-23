import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
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
    if (!title.trim()) return;
    await createCard(list.id, title.trim());
    setTitle("");
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
      <form onSubmit={submit} className="border-t border-white/10 p-2">
        <div className="flex items-center gap-2">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add a card"
            className="h-9 border-white/20 bg-black/20 text-slate-100 placeholder:text-slate-300"
          />
          <Button type="submit" size="icon" aria-label="Add card" className="h-9 w-9 bg-white/15 text-slate-100 hover:bg-white/25">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </section>
  );
}
