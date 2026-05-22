import { Lock, MoreHorizontal, Trash2, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BoardSummary } from "@/types";

const boardColors: Record<string, string> = {
  teal: "from-teal-700 to-cyan-700",
  indigo: "from-indigo-700 to-slate-800",
  sky: "from-sky-700 to-teal-700",
  slate: "from-slate-800 to-slate-600",
};

export function BoardCard({ board, onDelete }: { board: BoardSummary; onDelete: (id: number) => void }) {
  return (
    <article className="group overflow-hidden rounded-lg border border-border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-card">
      <Link to={`/boards/${board.id}`} className={`block h-28 bg-gradient-to-br ${boardColors[board.color] ?? boardColors.sky} p-4 text-white`}>
        <div className="flex items-start justify-between">
          <h2 className="line-clamp-2 text-lg font-semibold">{board.title}</h2>
          <MoreHorizontal className="h-5 w-5 opacity-80" />
        </div>
        <p className="mt-2 line-clamp-2 max-w-sm text-sm text-white/80">{board.description ?? "No description yet"}</p>
      </Link>
      <div className="p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge className={board.is_public ? "border-teal-200 bg-teal-50 text-teal-800" : "border-slate-200 bg-slate-100 text-slate-700"}>
            {board.is_public ? "Public" : "Private"}
          </Badge>
          <Badge>{board.list_count} lists</Badge>
          <Badge>{board.card_count} cards</Badge>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {board.is_public ? <Users className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {board.members.length} members
          </div>
          <Button variant="ghost" size="icon" aria-label="Delete board" onClick={() => onDelete(board.id)}>
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </div>
    </article>
  );
}
