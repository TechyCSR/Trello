import {
  Archive,
  CalendarClock,
  CheckSquare,
  Image,
  Loader2,
  MessageSquare,
  Plus,
  Tag,
  Trash2,
  UserPlus,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/store/useAppStore";
import type { Checklist } from "@/types";

function nextChecklistPosition(checklist: Checklist | undefined) {
  if (!checklist?.items.length) return 1024;
  return Math.max(...checklist.items.map((item) => item.position)) + 1024;
}

export function CardDialog() {
  const { activeBoard, currentUser, selectedCard, setSelectedCard, updateCard, deleteCard } = useAppStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [labelIds, setLabelIds] = useState<number[]>([]);
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => {
    if (!selectedCard) return;
    setTitle(selectedCard.title);
    setDescription(selectedCard.description ?? "");
    setDueDate(selectedCard.due_date ? selectedCard.due_date.slice(0, 10) : "");
    setLabelIds(selectedCard.labels.map((label) => label.id));
    setMemberIds(selectedCard.members.map((member) => member.id));
    setChecklists(selectedCard.checklists);
    setNewChecklistItem("");
  }, [selectedCard]);

  const listTitle = useMemo(() => {
    if (!activeBoard || !selectedCard) return "";
    return activeBoard.lists.find((list) => list.id === selectedCard.list_id)?.title ?? "Card";
  }, [activeBoard, selectedCard]);

  const firstChecklist = checklists[0];
  const checklistTotal = firstChecklist?.items.length ?? 0;
  const checklistDone = firstChecklist?.items.filter((item) => item.is_done).length ?? 0;
  const progress = checklistTotal ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  if (!activeBoard || !selectedCard) return null;

  async function saveCard(event?: FormEvent) {
    event?.preventDefault();
    if (!title.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await updateCard(selectedCard!.id, {
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        due_date: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : null,
        label_ids: labelIds,
        member_ids: memberIds,
        checklists,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function archiveCard() {
    if (isArchiving) return;
    setIsArchiving(true);
    try {
      await updateCard(selectedCard!.id, { archived: true });
      setSelectedCard(null);
    } finally {
      setIsArchiving(false);
    }
  }

  async function removeCard() {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteCard(selectedCard!.id);
    } finally {
      setIsDeleting(false);
    }
  }

  function toggleLabel(id: number) {
    setLabelIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleMember(id: number) {
    setMemberIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function ensureChecklist() {
    setChecklists((current) =>
      current.length
        ? current
        : [
            {
              id: -Date.now(),
              title: "Checklist",
              items: [],
            },
          ],
    );
  }

  function addChecklistItem(event: FormEvent) {
    event.preventDefault();
    const value = newChecklistItem.trim();
    if (!value) return;
    setChecklists((current) => {
      const base = current[0] ?? { id: -Date.now(), title: "Checklist", items: [] };
      const nextItem = {
        id: -Date.now(),
        title: value,
        is_done: false,
        position: nextChecklistPosition(base),
      };
      return [{ ...base, items: [...base.items, nextItem] }, ...current.slice(1)];
    });
    setNewChecklistItem("");
  }

  function toggleChecklistItem(itemId: number) {
    setChecklists((current) =>
      current.map((checklist) => ({
        ...checklist,
        items: checklist.items.map((item) => (item.id === itemId ? { ...item, is_done: !item.is_done } : item)),
      })),
    );
  }

  function removeChecklistItem(itemId: number) {
    setChecklists((current) =>
      current.map((checklist) => ({
        ...checklist,
        items: checklist.items.filter((item) => item.id !== itemId),
      })),
    );
  }

  return (
    <Dialog open={Boolean(selectedCard)} onOpenChange={(open) => !open && setSelectedCard(null)}>
      <DialogContent className="max-h-[86vh] w-[min(1180px,calc(100vw-32px))] overflow-hidden border-white/10 bg-[#202226] p-0 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#17191d] px-6 py-4">
          <Badge className="border-white/10 bg-yellow-500/20 text-yellow-100">{listTitle}</Badge>
          <div className="mr-8 flex items-center gap-2 text-slate-300">
            <Image className="h-4 w-4" />
          </div>
        </div>

        <form onSubmit={saveCard} className="kanban-scroll grid max-h-[calc(86vh-64px)] overflow-y-auto lg:grid-cols-[1fr_430px]">
          <section className="space-y-6 border-white/10 p-6 lg:border-r">
            <div className="flex items-start gap-3">
              <CheckSquare className="mt-2 h-6 w-6 shrink-0 text-slate-300" />
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-auto border-transparent bg-transparent px-0 py-1 text-3xl font-bold text-slate-100 shadow-none placeholder:text-slate-500 focus-visible:ring-0"
                placeholder="Card title"
                disabled={isSaving}
              />
            </div>

            <div className="ml-9 flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" onClick={ensureChecklist}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
              <Button type="button" variant="outline" className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">
                <Tag className="h-4 w-4" />
                Labels
              </Button>
              <Button type="button" variant="outline" className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" onClick={ensureChecklist}>
                <CheckSquare className="h-4 w-4" />
                Checklist
              </Button>
              <Button type="button" variant="outline" className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">
                <UserPlus className="h-4 w-4" />
                Members
              </Button>
            </div>

            <section className="grid gap-3">
              <div className="flex items-center gap-3 text-lg font-semibold text-slate-200">
                <Tag className="h-5 w-5 text-slate-300" />
                Labels
              </div>
              <div className="ml-8 flex flex-wrap gap-2">
                {activeBoard.labels.map((label) => (
                  <button
                    key={label.id}
                    type="button"
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                      labelIds.includes(label.id) ? "border-white/30 bg-white/15 text-white" : "border-white/10 bg-black/15 text-slate-300 hover:bg-white/10"
                    }`}
                    onClick={() => toggleLabel(label.id)}
                  >
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: label.color }} />
                    {label.name}
                  </button>
                ))}
              </div>
            </section>

            <section className="grid gap-3">
              <div className="flex items-center gap-3 text-lg font-semibold text-slate-200">
                <UserPlus className="h-5 w-5 text-slate-300" />
                Members
              </div>
              <div className="ml-8 flex flex-wrap gap-2">
                {activeBoard.members.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                      memberIds.includes(member.id) ? "border-blue-300/50 bg-blue-500/20 text-blue-100" : "border-white/10 bg-black/15 text-slate-300 hover:bg-white/10"
                    }`}
                    onClick={() => toggleMember(member.id)}
                  >
                    {member.avatar} {member.name}
                  </button>
                ))}
              </div>
            </section>

            <section className="grid gap-3">
              <div className="flex items-center gap-3 text-lg font-semibold text-slate-200">
                <CalendarClock className="h-5 w-5 text-slate-300" />
                Due date
              </div>
              <Input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="ml-8 h-10 max-w-xs border-white/15 bg-black/20 text-slate-100"
              />
            </section>

            <section className="grid gap-3">
              <div className="flex items-center gap-3 text-lg font-semibold text-slate-200">
                <MessageSquare className="h-5 w-5 text-slate-300" />
                Description
              </div>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add a more detailed description..."
                className="ml-8 min-h-24 border-white/15 bg-black/15 text-slate-100 placeholder:text-slate-400"
              />
            </section>

            <section className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-lg font-semibold text-slate-200">
                  <CheckSquare className="h-5 w-5 text-slate-300" />
                  Checklist
                </div>
                {checklistTotal > 0 && <Badge className="bg-white/10 text-slate-100">{progress}%</Badge>}
              </div>
              <div className="ml-8">
                <div className="mb-3 h-2 rounded-full bg-black/25">
                  <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="space-y-2">
                  {firstChecklist?.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 rounded-lg bg-black/15 px-3 py-2">
                      <input type="checkbox" checked={item.is_done} onChange={() => toggleChecklistItem(item.id)} />
                      <span className={`flex-1 text-sm ${item.is_done ? "text-slate-500 line-through" : "text-slate-200"}`}>{item.title}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:bg-white/10" onClick={() => removeChecklistItem(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <form onSubmit={addChecklistItem} className="mt-3 flex gap-2">
                  <Input
                    value={newChecklistItem}
                    onChange={(event) => setNewChecklistItem(event.target.value)}
                    placeholder="Add checklist item"
                    className="border-white/15 bg-black/20 text-slate-100"
                  />
                  <Button type="submit" className="bg-blue-500 text-slate-100 hover:bg-blue-400">
                    Add
                  </Button>
                </form>
              </div>
            </section>
          </section>

          <aside className="space-y-5 bg-[#151719] p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-slate-200">
                <MessageSquare className="h-5 w-5" />
                Comments and activity
              </div>
              <Button type="button" variant="outline" className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10">
                Hide details
              </Button>
            </div>
            <Input placeholder="Write a comment..." className="border-white/10 bg-[#22252b] text-slate-100 placeholder:text-slate-400" />
            <div className="flex gap-3 text-sm text-slate-300">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-blue-300/40 bg-slate-800">
                {currentUser?.avatar ?? "U"}
              </span>
              <p>
                <span className="font-semibold text-slate-100">{currentUser?.name ?? "User"}</span> added this card to {listTitle}
                <br />
                <span className="text-blue-300">{new Date(selectedCard.created_at).toLocaleString()}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-white/10 pt-5">
              <Button type="submit" className="bg-blue-500 text-slate-100 hover:bg-blue-400" disabled={isSaving || isDeleting || isArchiving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save changes
              </Button>
              <Button type="button" variant="outline" className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" onClick={archiveCard} disabled={isSaving || isDeleting || isArchiving}>
                {isArchiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                Archive
              </Button>
              <Button type="button" variant="destructive" onClick={removeCard} disabled={isSaving || isDeleting || isArchiving}>
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </Button>
            </div>
          </aside>
        </form>
      </DialogContent>
    </Dialog>
  );
}
