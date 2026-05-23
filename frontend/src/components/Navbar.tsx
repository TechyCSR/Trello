import { PanelsTopLeft, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { resolveAvatarUrl } from "@/lib/avatar";
import { toUserSlug } from "@/lib/userSlug";
import { useAppStore } from "@/store/useAppStore";
import type { BoardSummary } from "@/types";

export function Navbar() {
  const { users, currentUser, fetchUsers, setCurrentUser, setCreateBoardModalOpen } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BoardSummary[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const currentUserSlug = currentUser ? toUserSlug(currentUser.name) : "user";
  const avatarUrl = useMemo(() => (currentUser ? resolveAvatarUrl(currentUser) : resolveAvatarUrl({ id: 0, name: "User", avatar: "U", created_at: "" })), [currentUser]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }
    const handle = window.setTimeout(async () => {
      try {
        const { data } = await api.get<BoardSummary[]>("/boards", { params: { q: trimmed } });
        setSearchResults(data.slice(0, 8));
        setIsSearchOpen(true);
      } catch {
        setSearchResults([]);
        setIsSearchOpen(false);
      }
    }, 150);
    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  function openCreateBoard() {
    navigate(`/${currentUserSlug}/boards`);
    setCreateBoardModalOpen(true);
  }

  function handleSwitch(userId: number) {
    const user = users.find((item) => item.id === userId);
    if (!user) return;
    setCurrentUser(userId);
    setSwitchOpen(false);
    setMenuOpen(false);
    navigate(`/${toUserSlug(user.name)}/boards`);
  }

  function openBoard(boardCode: string) {
    setIsSearchOpen(false);
    setSearchQuery("");
    navigate(`/${currentUserSlug}/boards/${boardCode}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#1b1f2a]/95 backdrop-blur">
      <div className="mx-auto grid h-14 w-full max-w-[1700px] grid-cols-[auto_1fr_auto] items-center gap-3 px-4">
        <Link to={currentUser ? `/${currentUserSlug}/boards` : "/"} className="flex items-center gap-2 font-semibold text-white">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-blue-600 text-white shadow-sm">
            <PanelsTopLeft className="h-4 w-4" />
          </span>
          <span className="text-xl">Trello</span>
        </Link>

        <div className="relative mx-auto hidden w-full max-w-[760px] md:block">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            className="h-10 border-white/20 bg-[#222734] pl-9 text-slate-100 placeholder:text-slate-400"
            placeholder="Search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setIsSearchOpen(true);
            }}
            onBlur={() => window.setTimeout(() => setIsSearchOpen(false), 120)}
          />
          {isSearchOpen && (
            <div className="absolute left-0 right-0 top-12 rounded-md border border-white/15 bg-[#202433] p-1 shadow-xl">
              {searchResults.length > 0 ? (
                searchResults.map((board) => (
                  <button
                    key={board.id}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
                    onMouseDown={() => openBoard(board.board_code)}
                  >
                    {board.title}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-slate-400">No matching boards</div>
              )}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 text-slate-300">
          <Button className="bg-blue-600 text-white hover:bg-blue-500" onClick={openCreateBoard}>
            Create
          </Button>
          <div className="relative">
            <button
              className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-white/25 bg-slate-700"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Open profile menu"
            >
              <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 w-52 rounded-md border border-white/15 bg-[#262b38] p-1 shadow-xl">
                <button
                  className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
                  onClick={() => setSwitchOpen(true)}
                >
                  Switch account
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={switchOpen} onOpenChange={setSwitchOpen}>
        <DialogContent className="max-w-md border-white/15 bg-[#1e2330] text-slate-100">
          <DialogHeader>
            <DialogTitle>Switch account</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {users.map((user) => (
              <button
                key={user.id}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition ${currentUser?.id === user.id ? "border-blue-400/60 bg-blue-500/20 text-blue-100" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                onClick={() => handleSwitch(user.id)}
              >
                <span className="flex items-center gap-2">
                  <img src={resolveAvatarUrl(user)} alt={user.name} className="h-7 w-7 rounded-full border border-white/20 object-cover" />
                  <span>{user.name}</span>
                </span>
                <span className="text-xs text-slate-300">{currentUser?.id === user.id ? "Current" : "Switch"}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
