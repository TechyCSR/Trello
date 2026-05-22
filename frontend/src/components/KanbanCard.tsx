import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, CheckSquare, MessageSquare } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { Card } from "@/types";

export function KanbanCard({ card, compact = false }: { card: Card; compact?: boolean }) {
  const setSelectedCard = useAppStore((state) => state.setSelectedCard);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card-${card.id}`,
    data: { type: "card", card },
  });
  const checklistTotal = card.checklists.reduce((sum, checklist) => sum + checklist.items.length, 0);
  const checklistDone = card.checklists.reduce((sum, checklist) => sum + checklist.items.filter((item) => item.is_done).length, 0);

  return (
    <button
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "w-full rounded-md border border-border bg-white p-3 text-left shadow-sm transition hover:border-teal-300 hover:shadow-card",
        isDragging && "opacity-40",
      )}
      onClick={() => setSelectedCard(card)}
      {...attributes}
      {...listeners}
    >
      <div className="mb-2 flex flex-wrap gap-1">
        {card.labels.map((label) => (
          <span key={label.id} className="h-2 w-12 rounded-full" style={{ backgroundColor: label.color }} />
        ))}
      </div>
      <div className="line-clamp-3 text-sm font-medium text-slate-900">{card.title}</div>
      {!compact && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {card.due_date && (
            <Badge className="gap-1 bg-slate-50">
              <CalendarClock className="h-3 w-3" />
              {new Date(card.due_date).toLocaleDateString()}
            </Badge>
          )}
          {checklistTotal > 0 && (
            <Badge className="gap-1 bg-slate-50">
              <CheckSquare className="h-3 w-3" />
              {checklistDone}/{checklistTotal}
            </Badge>
          )}
          {card.description && <MessageSquare className="h-4 w-4" />}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex -space-x-1">
          {card.members.slice(0, 4).map((member) => (
            <span key={member.id} className="grid h-6 w-6 place-items-center rounded-full border border-white bg-slate-800 text-[10px] font-semibold text-white">
              {member.avatar}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
