import { Clock3, Star } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { BoardCard } from "@/components/BoardCard";
import { CreateBoardDialog } from "@/components/CreateBoardDialog";
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
    setCurrentUser,
    fetchBoards,
    deleteBoard,
    toggleStarredBoard,
    setCreateBoardModalOpen,
  } = useAppStore();

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

  return (
    <main className="min-h-[calc(100vh-56px)] bg-[radial-gradient(circle_at_top,_#22283a_0%,_#181b24_55%,_#13161f_100%)] text-slate-100">
      <CreateBoardDialog />
      <div className="mx-auto w-full max-w-[1480px] px-3 py-5 sm:px-8 sm:py-8 lg:px-14">

        {starredBoards.length > 0 && (
          <section className="mx-auto mb-8 max-w-[1160px] sm:mb-12">
            <div className="mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-300" />
              <h2 className="text-xl font-semibold sm:text-2xl">Starred boards</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 sm:flex sm:flex-wrap sm:justify-start">
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

        {recentBoards.length > 0 && (
          <section className="mx-auto mb-8 max-w-[1160px] sm:mb-12">
            <div className="mb-4 flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-slate-300" />
              <h2 className="text-xl font-semibold sm:text-2xl">Recently viewed</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 sm:flex sm:flex-wrap sm:justify-start">
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

        <section className="mx-auto max-w-[1160px]">
          <div className="mb-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-200 sm:text-2xl">Your workspaces</h2>
              <p className="text-sm text-slate-400">Trello Workspace</p>
            </div>
          </div>

          {isLoadingBoards ? (
            <div className="rounded-lg border border-white/10 bg-[#1e222d] p-6 text-slate-300">Loading boards...</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 sm:flex sm:flex-wrap sm:justify-start">
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
                onClick={() => setCreateBoardModalOpen(true)}
                className="grid h-[150px] w-full place-items-center rounded-lg border border-white/10 bg-[#2a2d36] text-base font-medium text-slate-300 transition hover:border-white/20 hover:bg-[#323540] sm:h-[170px] sm:w-[248px] sm:text-lg"
              >
                Create new board
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
