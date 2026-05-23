import { Bell, CircleHelp, Megaphone, PanelsTopLeft, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { resolveAvatarUrl } from "@/lib/avatar";
import { toUserSlug } from "@/lib/userSlug";
import { useAppStore } from "@/store/useAppStore";

export function Navbar() {
  const { users, currentUser, filters, fetchUsers, setCurrentUser, setFilters } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const currentUserSlug = currentUser ? toUserSlug(currentUser.name) : "user";
  const avatarUrl = useMemo(() => (currentUser ? resolveAvatarUrl(currentUser) : resolveAvatarUrl({ id: 0, name: "User", avatar: "U", created_at: "" })), [currentUser]);

  function goBoards() {
    navigate(`/${currentUserSlug}/boards`);
  }

  function handleSwitch(userId: number) {
    const user = users.find((item) => item.id === userId);
    if (!user) return;
    setCurrentUser(userId);
    setSwitchOpen(false);
    setMenuOpen(false);
    navigate(`/${toUserSlug(user.name)}/boards`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#1b1f2a]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1700px] items-center gap-3 px-4">
        <Link to={currentUser ? `/${currentUserSlug}/boards` : "/"} className="flex items-center gap-2 font-semibold text-white">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-blue-600 text-white shadow-sm">
            <PanelsTopLeft className="h-4 w-4" />
          </span>
          <span className="text-xl">Trello</span>
        </Link>

        <div className="relative ml-4 hidden flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            className="h-10 border-white/20 bg-[#222734] pl-9 text-slate-100 placeholder:text-slate-400"
            placeholder="Search"
            value={filters.boardQuery}
            onChange={(event) => setFilters({ boardQuery: event.target.value })}
          />
        </div>

        <Button className="bg-blue-600 text-white hover:bg-blue-500" onClick={goBoards}>
          Create
        </Button>

        <div className="ml-auto flex items-center gap-2 text-slate-300">
          <button className="grid h-8 w-8 place-items-center rounded-md transition hover:bg-white/10" aria-label="Announcements">
            <Megaphone className="h-4 w-4" />
          </button>
          <button className="grid h-8 w-8 place-items-center rounded-md transition hover:bg-white/10" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </button>
          <button className="grid h-8 w-8 place-items-center rounded-md transition hover:bg-white/10" aria-label="Help">
            <CircleHelp className="h-4 w-4" />
          </button>
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
