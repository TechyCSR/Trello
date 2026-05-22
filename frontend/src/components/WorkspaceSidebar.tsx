import { Bell, Inbox, Lightbulb, Plus, Zap } from "lucide-react";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/useAppStore";
import type { BoardDetail } from "@/types";

export function WorkspaceSidebar({ board }: { board: BoardDetail }) {
  const { createCard, currentUser } = useAppStore();
  const [title, setTitle] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const firstList = board.lists[0];
    if (!firstList || !title.trim()) return;
    await createCard(firstList.id, title.trim());
    setTitle("");
  }

  const myCards = board.lists.flatMap((list) => list.cards).filter((card) => card.members.some((member) => member.id === currentUser?.id));

  return (
    <aside className="sticky top-16 flex max-h-[calc(100vh-72px)] flex-col gap-4 overflow-y-auto rounded-lg border border-border bg-white p-4 shadow-sm lg:w-72 lg:shrink-0">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-teal-50 text-teal-800">
          <Inbox className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold">Inbox</h2>
          <p className="text-xs text-muted-foreground">Quick capture for this board</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-2">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add card to first list" />
        <Button className="w-full" type="submit">
          <Plus className="h-4 w-4" />
          Quick add
        </Button>
      </form>

      <section className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Bell className="h-4 w-4 text-teal-700" />
          My tasks
        </div>
        <div className="space-y-2">
          {myCards.slice(0, 5).map((card) => (
            <div key={card.id} className="rounded-md border border-border bg-slate-50 p-2 text-sm">
              <div className="line-clamp-2 font-medium">{card.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{card.due_date ? new Date(card.due_date).toLocaleDateString() : "No due date"}</div>
            </div>
          ))}
          {!myCards.length && <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">No assigned cards yet.</div>}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Zap className="h-4 w-4 text-teal-700" />
          Shortcuts
        </div>
        {["Share board", "Copy public link", "Review archived cards"].map((item) => (
          <button key={item} className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition hover:bg-slate-100">
            {item}
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </section>
    </aside>
  );
}
