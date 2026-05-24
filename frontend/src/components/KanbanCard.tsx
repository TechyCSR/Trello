import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, CheckCircle2, CheckSquare, Circle, MessageSquare } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";

import { Badge } from "@/components/ui/badge";
import { resolveAvatarUrl } from "@/lib/avatar";
import { findCoverColor } from "@/lib/cardCovers";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { Card } from "@/types";

export function CardCoverBanner({ card, height = "h-20" }: { card: Card; height?: string }) {
  if (card.cover_image_url) {
    return (
      <div
        className={`${height} w-full overflow-hidden rounded-lg bg-cover bg-center shadow-[0_8px_18px_-12px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]`}
        style={{ backgroundImage: `url(${card.cover_image_url})` }}
      />
    );
  }
  const color = findCoverColor(card.cover_color);
  if (!color) return null;
  return (
    <div
      className={`${height} w-full overflow-hidden rounded-lg ${color.className} shadow-[0_8px_18px_-12px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.18)]`}
    />
  );
}

export function CardFace({ card, compact = false, isDone = false }: { card: Card; compact?: boolean; isDone?: boolean }) {
  const checklistTotal = card.checklists.reduce((sum, checklist) => sum + checklist.items.length, 0);
  const checklistDone = card.checklists.reduce((sum, checklist) => sum + checklist.items.filter((item) => item.is_done).length, 0);

  return (
    <>
      {(card.cover_image_url || card.cover_color) && (
        <div className="mb-2">
          <CardCoverBanner card={card} />
        </div>
      )}
      <div className="mb-2 flex flex-wrap gap-1">
        {card.labels.map((label) => (
          <span key={label.id} className="h-2 w-12 rounded-full" style={{ backgroundColor: label.color }} />
        ))}
      </div>
      <div className={cn("whitespace-pre-wrap break-words text-sm font-medium", isDone ? "text-slate-500 line-through" : "text-slate-100")}>{card.title}</div>
      {!compact && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
          {card.due_date && (
            <Badge className="gap-1 border-white/20 bg-white/10 text-slate-100">
              <CalendarClock className="h-3 w-3" />
              {new Date(card.due_date).toLocaleDateString()}
            </Badge>
          )}
          {checklistTotal > 0 && (
            <Badge className="gap-1 border-white/20 bg-white/10 text-slate-100">
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
            <img
              key={member.id}
              src={resolveAvatarUrl(member)}
              alt={member.name}
              className="h-6 w-6 rounded-full border border-white bg-slate-800 object-cover"
            />
          ))}
        </div>
      </div>
    </>
  );
}

export function KanbanCard({
  card,
  compact = false,
  isDone = false,
  onToggleDone,
}: {
  card: Card;
  compact?: boolean;
  isDone?: boolean;
  onToggleDone?: () => void;
}) {
  const setSelectedCard = useAppStore((state) => state.setSelectedCard);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card-${card.id}`,
    data: { type: "card", card },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative w-full rounded-xl border border-white/10 bg-[#1f2736] text-left shadow-sm transition hover:border-white/35 hover:shadow-card",
        isDragging && "opacity-40",
      )}
      {...attributes}
      {...listeners}
    >
      {onToggleDone && (
        <button
          type="button"
          className="absolute left-2 top-2 z-10 rounded-full p-0.5 text-slate-400 opacity-0 transition hover:text-emerald-300 group-hover:opacity-100"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onToggleDone(); }}
          aria-label={isDone ? "Mark as incomplete" : "Mark as complete"}
        >
          {isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Circle className="h-4 w-4" />}
        </button>
      )}
      <button
        type="button"
        className={cn("w-full p-3 text-left", onToggleDone && "pl-8")}
        onClick={() => setSelectedCard(card)}
      >
        <CardFace card={card} compact={compact} isDone={isDone} />
      </button>
    </div>
  );
}
