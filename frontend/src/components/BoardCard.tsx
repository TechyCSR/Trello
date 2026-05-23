import { Lock, Star, Trash2, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BoardSummary } from "@/types";

const boardColors: Record<string, string> = {
  teal: "from-indigo-500 to-pink-500",
  indigo: "from-violet-500 to-fuchsia-500",
  sky: "from-indigo-500 to-purple-500",
  slate: "from-slate-600 to-slate-700",
};

export function BoardCard({
  board,
  username,
  isStarred,
  onToggleStar,
  onDelete,
}: {
  board: BoardSummary;
  username: string;
  isStarred: boolean;
  onToggleStar: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <article className="group overflow-hidden rounded-lg border border-white/10 bg-[#1f222a] shadow-sm transition hover:-translate-y-0.5 hover:border-white/20">
      <Link to={`/${username}/boards/${board.id}`} className={`block h-32 bg-gradient-to-br ${boardColors[board.color] ?? boardColors.sky} p-4 text-white`}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="line-clamp-2 text-base font-semibold">{board.title}</h2>
          <span
            role="button"
            tabIndex={0}
            aria-label={isStarred ? "Unstar board" : "Star board"}
            onClick={(event) => {
              event.preventDefault();
              onToggleStar(board.id);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onToggleStar(board.id);
              }
            }}
            className="rounded-md p-1.5 text-white/90 transition hover:bg-black/15"
          >
            <Star className={`h-4 w-4 ${isStarred ? "fill-yellow-300 text-yellow-300" : ""}`} />
          </span>
        </div>
        <p className="mt-2 line-clamp-2 max-w-sm text-sm text-white/90">{board.description ?? "No description yet"}</p>
      </Link>
      <div className="p-3">
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge className={board.is_public ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-200" : "border-slate-300/25 bg-slate-700/30 text-slate-200"}>
            {board.is_public ? "Public" : "Private"}
          </Badge>
          <Badge className="border-white/15 bg-white/5 text-slate-200">{board.list_count} lists</Badge>
          <Badge className="border-white/15 bg-white/5 text-slate-200">{board.card_count} cards</Badge>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            {board.is_public ? <Users className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {board.members.length} members
          </div>
          <Button variant="ghost" size="icon" aria-label="Delete board" className="text-slate-300 hover:bg-red-500/15 hover:text-red-300" onClick={() => onDelete(board.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}
