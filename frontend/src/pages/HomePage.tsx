import { ArrowRight, CheckCircle2, Clock3, LockKeyhole, MoveRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { toUserSlug } from "@/lib/userSlug";
import { useAppStore } from "@/store/useAppStore";

export function HomePage() {
  const { currentUser } = useAppStore();
  const boardsPath = `/${toUserSlug(currentUser?.name ?? "techycsr")}/boards`;

  return (
    <main>
      <section className="relative min-h-[calc(100vh-56px)] overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#eef8f7_58%,#ffffff_100%)]">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-4 pb-16 pt-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:pt-20">
          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white px-3 py-1 text-sm text-teal-800 shadow-sm">
              <CheckCircle2 className="h-4 w-4" />
              Trello-inspired project flow
            </div>
            <h1 className="text-4xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-5xl">
              Flowboard
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              A fast Kanban workspace for boards, lists, cards, drag-and-drop planning, and simulated team collaboration.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="default">
                <Link to={boardsPath}>
                  Open Boards
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={boardsPath}>
                  View workspace
                  <MoveRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["Live cards", "Optimistic movement"],
                ["Fast boards", "Search and filters"],
                ["Private links", "Member validation"],
              ].map(([title, body]) => (
                <div key={title} className="rounded-lg border border-border bg-white/80 p-3 shadow-sm">
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{body}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative min-h-[420px]">
            <div className="absolute inset-0 rounded-[28px] border border-teal-100 bg-white shadow-board" />
            <div className="absolute inset-4 overflow-hidden rounded-2xl border border-border bg-slate-100">
              <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3">
                <div>
                  <div className="text-sm font-semibold">Product Launch Sprint</div>
                  <div className="text-xs text-muted-foreground">8 members · public</div>
                </div>
                <LockKeyhole className="h-4 w-4 text-teal-700" />
              </div>
              <div className="flex gap-4 overflow-hidden p-4">
                {[
                  ["Inbox", ["Collect launch risks", "Add integration notes"]],
                  ["In Progress", ["Wire optimistic move API", "Card modal polish", "Due-date filters"]],
                  ["Review", ["QA mobile scrolling", "Check board permissions"]],
                ].map(([list, cards]) => (
                  <div key={list as string} className="w-64 shrink-0 rounded-lg border border-border bg-slate-50 p-3">
                    <div className="mb-3 flex items-center justify-between text-sm font-semibold">
                      {list}
                      <Clock3 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      {(cards as string[]).map((card, index) => (
                        <div key={card} className="rounded-md border border-border bg-white p-3 text-sm shadow-sm">
                          <div className="mb-2 h-1.5 w-16 rounded-full bg-teal-500" />
                          {card}
                          <div className="mt-3 flex -space-x-1">
                            {[0, 1, 2].slice(0, index + 1).map((item) => (
                              <span key={item} className="grid h-6 w-6 place-items-center rounded-full border border-white bg-slate-800 text-[10px] text-white">
                                {["TC", "AX", "SR"][item]}
                              </span>
                            ))}
                          </div>
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
    </main>
  );
}
