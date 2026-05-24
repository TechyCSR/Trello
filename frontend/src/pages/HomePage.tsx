import { ArrowRight, CheckSquare, GripVertical, KanbanSquare, Layers, MoveRight, PanelsTopLeft, Search, Shield, Sparkles, Users, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { resolveAvatarUrl } from "@/lib/avatar";
import { toUserSlug } from "@/lib/userSlug";
import { useAppStore } from "@/store/useAppStore";

/* ─── 3D Tilt Hook ─── */
function useTilt(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function handleMove(e: MouseEvent) {
      const rect = el!.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el!.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale3d(1.02,1.02,1.02)`;
    }
    function handleLeave() {
      el!.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)";
    }
    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, [ref]);
}

/* ─── Features data ─── */
const features = [
  { icon: KanbanSquare, title: "Kanban Boards", desc: "Organize work into boards, lists, and cards with intuitive drag-and-drop." },
  { icon: GripVertical, title: "Drag & Drop", desc: "Seamlessly reorder cards and lists with real-time optimistic updates." },
  { icon: Users, title: "Team Collaboration", desc: "Assign members, leave comments, and track activity across your team." },
  { icon: CheckSquare, title: "Checklists", desc: "Break tasks into subtasks with progress tracking on every card." },
  { icon: Search, title: "Search & Filters", desc: "Find any card instantly with filters by label, member, or due date." },
  { icon: Shield, title: "Board Visibility", desc: "Control access with public, private, and share-link permissions." },
  { icon: Layers, title: "Labels & Covers", desc: "Color-code cards with labels and add visual covers for quick scanning." },
  { icon: Zap, title: "Real-time Updates", desc: "Changes save instantly — no refresh needed, no data loss." },
];

export function HomePage() {
  const navigate = useNavigate();
  const { users, currentUser, fetchUsers, setCurrentUser } = useAppStore();
  const [step, setStep] = useState<"landing" | "select">("landing");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  useTilt(heroRef);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId],
  );

  const handleStart = useCallback(() => {
    if (currentUser) {
      navigate(`/${toUserSlug(currentUser.name)}/boards`);
    } else {
      setStep("select");
    }
  }, [currentUser, navigate, users]);

  const handleSelectUser = useCallback((userId: number) => {
    setSelectedUserId(userId);
  }, []);

  const handleGo = useCallback(() => {
    if (!selectedUserId) return;
    setCurrentUser(selectedUserId);
    const user = users.find((u) => u.id === selectedUserId);
    if (user) {
      navigate(`/${toUserSlug(user.name)}/boards`);
    }
  }, [selectedUserId, setCurrentUser, users, navigate]);

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════ */
  return (
    <main className="min-h-screen bg-[#1a1d27] text-slate-100 selection:bg-blue-500/30">
      {/* ─── Navbar-like top bar (minimal, no full navbar) ─── */}
      {!currentUser && (
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/5 bg-[#1a1d27]/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20">
                <PanelsTopLeft className="h-4 w-4 text-white" />
              </span>
              <span className="text-lg font-semibold tracking-tight text-white">Trello</span>
            </div>
          </div>
        </header>
      )}

      <div className={currentUser ? "" : "pt-14"}>
        {step === "landing" && (
          <>
            {/* ─── Hero Section ─── */}
            <section className="relative overflow-hidden">
              {/* Subtle gradient orbs */}
              <div className="pointer-events-none absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
              <div className="pointer-events-none absolute -right-40 top-40 h-[400px] w-[400px] rounded-full bg-indigo-500/8 blur-[100px]" />

              <div className="mx-auto grid max-w-7xl gap-12 px-6 pb-24 pt-20 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:pt-28">
                {/* Left — Copy */}
                <div className="max-w-lg">
                  <p className="mb-4 text-sm font-medium uppercase tracking-wider text-blue-400">Project management</p>
                  <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
                    Trello brings all your tasks, teammates, and tools together
                  </h1>
                  <p className="mt-5 text-lg leading-relaxed text-slate-400">
                    Keep everything in the same place — even if your team isn't. A fast, visual Kanban workspace
                    for boards, lists, cards, and real-time collaboration.
                  </p>
                  <Button
                    size="lg"
                    className="mt-8 bg-gradient-to-r from-blue-600 to-blue-500 px-8 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:shadow-blue-600/40 hover:brightness-110"
                    onClick={handleStart}
                  >
                    Let's Start
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>

                {/* Right — 3D Hero Card */}
                <div className="flex items-center justify-center">
                  <div
                    ref={heroRef}
                    className="w-full max-w-[520px] rounded-2xl border border-white/10 bg-[#22262f] p-1 shadow-2xl shadow-black/40 transition-transform duration-200 ease-out"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    {/* Board header */}
                    <div className="rounded-t-xl bg-gradient-to-r from-[#2c3140] to-[#1e2230] px-5 py-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-blue-500" />
                          <span className="text-sm font-semibold text-white">Sprint Board</span>
                        </div>
                        <div className="flex -space-x-1.5">
                          {["TC", "AX", "KR"].map((initials) => (
                            <span key={initials} className="grid h-6 w-6 place-items-center rounded-full border-2 border-[#2c3140] bg-slate-600 text-[9px] font-bold text-white">
                              {initials}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Lists */}
                    <div className="flex gap-3 overflow-hidden rounded-b-xl bg-[#1e2230] p-4">
                      {[
                        { title: "To Do", cards: ["Research API design", "Setup CI pipeline"] },
                        { title: "In Progress", cards: ["Build card drag", "Style board layout", "Add filters"] },
                        { title: "Done", cards: ["User auth flow", "DB migrations"] },
                      ].map((list) => (
                        <div key={list.title} className="w-40 shrink-0 rounded-lg bg-[#282d3a] p-2.5">
                          <div className="mb-2 text-xs font-semibold text-slate-300">{list.title}</div>
                          <div className="space-y-1.5">
                            {list.cards.map((card) => (
                              <div key={card} className="rounded-md bg-[#1a1d27] p-2 text-[11px] leading-snug text-slate-300 shadow-sm">
                                <div className="mb-1 h-1 w-8 rounded-full bg-blue-500/60" />
                                {card}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ─── Features Section ─── */}
            <section className="border-t border-white/5 bg-[#15171f]">
              <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
                <div className="mb-14 text-center">
                  <p className="mb-2 text-sm font-medium uppercase tracking-wider text-blue-400">Everything you need</p>
                  <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    Powerful features, minimal interface
                  </h2>
                  <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400">
                    Built for speed and simplicity. Every feature is designed to keep you focused on what matters.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {features.map((f) => (
                    <div key={f.title} className="group rounded-xl border border-white/5 bg-[#1e2130]/60 p-5 transition hover:border-white/10 hover:bg-[#1e2130]">
                      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 transition group-hover:bg-blue-500/20">
                        <f.icon className="h-5 w-5" />
                      </div>
                      <h3 className="mb-1.5 text-sm font-semibold text-white">{f.title}</h3>
                      <p className="text-xs leading-relaxed text-slate-400">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ─── Footer ─── */}
            <footer className="border-t border-white/5 bg-[#1a1d27] py-8">
              <div className="mx-auto max-w-7xl px-6 text-center text-sm text-slate-500">
                Built with React, FastAPI, and PostgreSQL &middot; Trello Clone
              </div>
            </footer>
          </>
        )}

        {step === "select" && (
          /* ─── User Selection Screen ─── */
          <section className="relative flex min-h-[calc(100vh-56px)] items-center justify-center overflow-hidden">
            {/* Background orbs */}
            <div className="pointer-events-none absolute left-1/4 top-1/4 h-[400px] w-[400px] rounded-full bg-blue-600/8 blur-[100px]" />
            <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-indigo-500/6 blur-[80px]" />

            <div className="relative z-10 w-full max-w-lg px-6 py-16 text-center">
              <Sparkles className="mx-auto mb-4 h-8 w-8 text-blue-400" />
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Who's working today?
              </h2>
              <p className="mt-2 text-sm text-slate-400">Choose your profile to continue</p>

              {/* User grid */}
              <div className="mx-auto mt-10 flex flex-wrap items-center justify-center gap-5">
                {users.map((user) => {
                  const isSelected = selectedUserId === user.id;
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user.id)}
                      className={`group flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all duration-200 ${
                        isSelected
                          ? "border-blue-500/60 bg-blue-500/10 shadow-lg shadow-blue-500/10 scale-105"
                          : "border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/5"
                      }`}
                    >
                      <img
                        src={resolveAvatarUrl(user)}
                        alt={user.name}
                        className={`h-16 w-16 rounded-full border-2 object-cover transition-all duration-200 ${
                          isSelected ? "border-blue-400 shadow-md shadow-blue-500/20" : "border-white/15 group-hover:border-white/30"
                        }`}
                      />
                      <span className={`text-xs font-medium transition ${isSelected ? "text-blue-300" : "text-slate-400 group-hover:text-slate-200"}`}>
                        {user.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* CTA */}
              <Button
                size="lg"
                disabled={!selectedUserId}
                className="mt-10 bg-gradient-to-r from-blue-600 to-blue-500 px-8 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:shadow-blue-600/40 hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
                onClick={handleGo}
              >
                Let's Create Board
                <MoveRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
