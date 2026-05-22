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

export function BoardListColumn({ list, cards }: { list: BoardList; cards: Card[] }) {
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
        "flex max-h-[calc(100vh-180px)] w-[272px] shrink-0 flex-col rounded-lg border border-border bg-slate-100 shadow-sm",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex items-center justify-between gap-2 p-3" {...attributes} {...listeners}>
        {editing ? (
          <Input
            value={listTitle}
            onChange={(event) => setListTitle(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => event.key === "Enter" && void commitTitle()}
            autoFocus
          />
        ) : (
          <button className="truncate text-left text-sm font-semibold" onClick={() => setEditing(true)}>
            {list.title}
          </button>
        )}
        <div className="flex items-center">
          <Button variant="ghost" size="icon" aria-label="Delete list" onClick={() => void deleteList(list.id)}>
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <div ref={setDropRef} className="kanban-scroll flex-1 space-y-2 overflow-y-auto px-2 pb-2">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard key={card.id} card={card} />
          ))}
        </SortableContext>
        {!cards.length && <div className="rounded-md border border-dashed border-slate-300 p-3 text-center text-sm text-muted-foreground">Drop cards here</div>}
      </div>
      <form onSubmit={submit} className="border-t border-border p-2">
        <div className="flex gap-2">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a card" />
          <Button type="submit" size="icon" aria-label="Add card">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </section>
  );
}
