import { LayoutDashboard, PanelsTopLeft, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { Link, NavLink } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";

export function Navbar() {
  const { users, currentUser, fetchUsers, setCurrentUser } = useAppStore();

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/86 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-teal-700 text-white shadow-sm">
            <PanelsTopLeft className="h-5 w-5" />
          </span>
          <span>Flowboard</span>
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink to="/boards">
            {({ isActive }) => (
              <Button variant={isActive ? "secondary" : "ghost"} size="sm">
                <LayoutDashboard className="h-4 w-4" />
                Boards
              </Button>
            )}
          </NavLink>
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-md border border-border bg-slate-50 px-2 py-1 text-xs text-muted-foreground md:flex">
            <Sparkles className="h-3.5 w-3.5 text-teal-700" />
            Simulated collaboration
          </div>
          <select
            className="h-9 rounded-md border border-border bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={currentUser?.id ?? ""}
            onChange={(event) => setCurrentUser(Number(event.target.value))}
            aria-label="Current user"
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
