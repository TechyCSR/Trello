import { Filter, Loader2, Plus, Search } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { BoardCard } from "@/components/BoardCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/useAppStore";
import type { VisibilityFilter } from "@/types";

export function BoardsPage() {
  const { boards, filters, isLoadingBoards, error, fetchBoards, createBoard, deleteBoard, setFilters } = useAppStore();
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    void fetchBoards();
  }, [fetchBoards, filters.boardQuery, filters.boardVisibility]);

  const stats = useMemo(
    () => ({
      public: boards.filter((board) => board.is_public).length,
      private: boards.filter((board) => !board.is_public).length,
    }),
    [boards],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    await createBoard(title.trim(), isPublic);
    setTitle("");
  }

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Boards</h1>
          <p className="mt-1 text-sm text-muted-foreground">Fast dashboard for public and private Kanban spaces.</p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-2 rounded-lg border border-border bg-white p-3 shadow-sm sm:flex-row">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="New board name" />
          <label className="flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm">
            <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
            Public
          </label>
          <Button type="submit">
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </form>
      </div>

      <section className="mb-6 grid gap-3 rounded-lg border border-border bg-white p-3 shadow-sm md:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search boards"
            value={filters.boardQuery}
            onChange={(event) => setFilters({ boardQuery: event.target.value })}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(["all", "public", "private"] as VisibilityFilter[]).map((visibility) => (
            <Button
              key={visibility}
              variant={filters.boardVisibility === visibility ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilters({ boardVisibility: visibility })}
            >
              {visibility}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{stats.public} public</span>
          <span>·</span>
          <span>{stats.private} private</span>
        </div>
      </section>

      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {isLoadingBoards ? (
        <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-border bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {boards.map((board) => (
            <BoardCard key={board.id} board={board} onDelete={deleteBoard} />
          ))}
        </div>
      )}
    </main>
  );
}
