import { Lock, Star, Trash2, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BoardSummary } from "@/types";

const boardBackgrounds: Record<string, { className?: string; imageUrl?: string }> = {
  teal: { className: "from-cyan-600 to-teal-500" },
  indigo: { className: "from-violet-500 to-fuchsia-500" },
  sky: { className: "from-indigo-500 to-purple-500" },
  slate: { className: "from-slate-600 to-slate-700" },
  blue: { className: "from-blue-700 to-blue-500" },
  purple: { className: "from-violet-600 to-fuchsia-500" },
  "photo-dawn": {
    imageUrl:
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=60",
  },
  "photo-cosmos": {
    imageUrl:
      "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=800&q=60",
  },
  "photo-ocean": {
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=60",
  },
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
  const background = boardBackgrounds[board.color] ?? boardBackgrounds.sky;

  return (
    <article className="group w-full overflow-hidden rounded-lg border border-white/10 bg-[#1f222a] shadow-sm transition hover:-translate-y-0.5 hover:border-white/20 sm:w-[248px]">
      <Link
        to={`/${username}/boards/${board.id}`}
        className={`block h-20 p-3 text-white ${background.imageUrl ? "" : `bg-gradient-to-br ${background.className}`}`}
        style={
          background.imageUrl
            ? {
                backgroundImage: `linear-gradient(rgba(15,20,30,.2), rgba(15,20,30,.35)), url(${background.imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="line-clamp-2 text-sm font-semibold">{board.title}</h2>
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
        <p className="mt-1 line-clamp-1 max-w-sm text-xs text-white/90">{board.description ?? "No description yet"}</p>
      </Link>
      <div className="p-2.5">
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          <Badge className={board.is_public ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-200" : "border-slate-300/25 bg-slate-700/30 text-slate-200"}>
            {board.is_public ? "Public" : "Private"}
          </Badge>
          <Badge className="border-white/15 bg-white/5 text-slate-200">{board.list_count} lists</Badge>
          <Badge className="border-white/15 bg-white/5 text-slate-200">{board.card_count} cards</Badge>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            {board.is_public ? <Users className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {board.members.length} members
          </div>
          <Button variant="ghost" size="icon" aria-label="Delete board" className="h-8 w-8 text-slate-300 hover:bg-red-500/15 hover:text-red-300" onClick={() => onDelete(board.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}
