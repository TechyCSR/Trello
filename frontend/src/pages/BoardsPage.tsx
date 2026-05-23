import { Clock3, LayoutGrid, Settings, Star, Users } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { BoardCard } from "@/components/BoardCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { findUserBySlug, toUserSlug } from "@/lib/userSlug";
import { useAppStore } from "@/store/useAppStore";

export function BoardsPage() {
  const { username = "" } = useParams();
  const navigate = useNavigate();
  const {
    users,
    currentUser,
    boards,
    starredBoardIds,
    recentBoardIds,
    filters,
    isLoadingBoards,
    error,
    setCurrentUser,
    setFilters,
    fetchBoards,
    createBoard,
    deleteBoard,
    toggleStarredBoard,
  } = useAppStore();
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);

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
    if (!currentUser) return;
    const handle = window.setTimeout(() => {
      void fetchBoards();
    }, 180);
    return () => window.clearTimeout(handle);
  }, [fetchBoards, currentUser, filters.boardQuery, filters.boardVisibility]);

  const routeUserSlug = currentUser ? toUserSlug(currentUser.name) : username;

  const recentBoards = useMemo(() => {
    const map = new Map(boards.map((board) => [board.id, board]));
    return recentBoardIds.map((id) => map.get(id)).filter((board): board is typeof boards[number] => Boolean(board));
  }, [boards, recentBoardIds]);

  const starredBoards = useMemo(
    () => boards.filter((board) => starredBoardIds.includes(board.id)),
    [boards, starredBoardIds],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    await createBoard(title.trim(), isPublic);
    setTitle("");
  }

  return (
    <main className="min-h-[calc(100vh-56px)] bg-[radial-gradient(circle_at_top,_#22283a_0%,_#181b24_55%,_#13161f_100%)] text-slate-100">
      <div className="mx-auto max-w-[1520px] px-5 py-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Input
            className="w-full max-w-md border-white/20 bg-[#232838] text-slate-100 placeholder:text-slate-400"
            placeholder="Search boards"
            value={filters.boardQuery}
            onChange={(event) => setFilters({ boardQuery: event.target.value })}
          />
          <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
            <Input
              className="w-52 border-white/20 bg-[#232838] text-slate-100 placeholder:text-slate-400"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="New board name"
            />
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
              Public
            </label>
            <Button className="bg-blue-600 text-white hover:bg-blue-500" type="submit">
              Create
            </Button>
          </form>
        </div>

        {error && <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}

        {recentBoards.length > 0 && (
          <section className="mb-10">
            <div className="mb-3 flex items-center gap-2 text-3xl font-semibold">
              <Clock3 className="h-6 w-6 text-slate-300" />
              <h2 className="text-4xl font-semibold leading-tight tracking-normal sm:text-3xl">Recently viewed</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recentBoards.map((board) => (
                <BoardCard
                  key={board.id}
                  board={board}
                  username={routeUserSlug}
                  isStarred={starredBoardIds.includes(board.id)}
                  onToggleStar={toggleStarredBoard}
                  onDelete={deleteBoard}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-slate-200">Your workspaces</h2>
              <p className="text-sm text-slate-400">Trello Workspace</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm text-slate-100">
                <LayoutGrid className="h-4 w-4" />
                Boards
              </button>
              <button className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm text-slate-100">
                <Users className="h-4 w-4" />
                Members
              </button>
              <button className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm text-slate-100">
                <Settings className="h-4 w-4" />
                Settings
              </button>
            </div>
          </div>

          {isLoadingBoards ? (
            <div className="rounded-lg border border-white/10 bg-[#1e222d] p-6 text-slate-300">Loading boards...</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {boards.map((board) => (
                <BoardCard
                  key={board.id}
                  board={board}
                  username={routeUserSlug}
                  isStarred={starredBoardIds.includes(board.id)}
                  onToggleStar={toggleStarredBoard}
                  onDelete={deleteBoard}
                />
              ))}
              <button
                onClick={() => void createBoard(`New board ${boards.length + 1}`, true)}
                className="grid h-[238px] place-items-center rounded-lg border border-white/10 bg-[#2a2d36] text-2xl font-medium text-slate-300 transition hover:border-white/20 hover:bg-[#323540]"
              >
                Create new board
              </button>
            </div>
          )}
        </section>

        {starredBoards.length > 0 && (
          <section className="mt-10">
            <div className="mb-3 flex items-center gap-2 text-xl font-semibold">
              <Star className="h-5 w-5 text-yellow-300" />
              Starred boards
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {starredBoards.map((board) => (
                <BoardCard
                  key={board.id}
                  board={board}
                  username={routeUserSlug}
                  isStarred={starredBoardIds.includes(board.id)}
                  onToggleStar={toggleStarredBoard}
                  onDelete={deleteBoard}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
