import { CalendarClock, CheckSquare, Tag, Trash2, UserPlus } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/store/useAppStore";

export function CardDialog() {
  const { activeBoard, selectedCard, setSelectedCard, updateCard, deleteCard } = useAppStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [labelIds, setLabelIds] = useState<number[]>([]);
  const [memberIds, setMemberIds] = useState<number[]>([]);

  useEffect(() => {
    if (!selectedCard) return;
    setTitle(selectedCard.title);
    setDescription(selectedCard.description ?? "");
    setDueDate(selectedCard.due_date ? selectedCard.due_date.slice(0, 10) : "");
    setLabelIds(selectedCard.labels.map((label) => label.id));
    setMemberIds(selectedCard.members.map((member) => member.id));
  }, [selectedCard]);

  const checklist = selectedCard?.checklists[0];
  const progress = useMemo(() => {
    if (!checklist?.items.length) return 0;
    return Math.round((checklist.items.filter((item) => item.is_done).length / checklist.items.length) * 100);
  }, [checklist]);

  if (!activeBoard || !selectedCard) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    await updateCard(selectedCard!.id, {
      title,
      description,
      due_date: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : null,
      label_ids: labelIds,
      member_ids: memberIds,
    });
  }

  function toggleLabel(id: number) {
    setLabelIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleMember(id: number) {
    setMemberIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <Dialog open={Boolean(selectedCard)} onOpenChange={(open) => !open && setSelectedCard(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Card details</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-5">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add context, decisions, or links" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Tag className="h-4 w-4 text-teal-700" />
                Labels
              </div>
              <div className="flex flex-wrap gap-2">
                {activeBoard.labels.map((label) => (
                  <button
                    key={label.id}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${labelIds.includes(label.id) ? "border-slate-900 bg-slate-900 text-white" : "border-border bg-white"}`}
                    onClick={() => toggleLabel(label.id)}
                  >
                    <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
                    {label.name}
                  </button>
                ))}
              </div>
            </section>
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <UserPlus className="h-4 w-4 text-teal-700" />
                Members
              </div>
              <div className="flex flex-wrap gap-2">
                {activeBoard.members.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${memberIds.includes(member.id) ? "border-teal-700 bg-teal-50 text-teal-900" : "border-border bg-white"}`}
                    onClick={() => toggleMember(member.id)}
                  >
                    {member.avatar} {member.name}
                  </button>
                ))}
              </div>
            </section>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              <span className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-teal-700" />
                Due date
              </span>
              <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </label>
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckSquare className="h-4 w-4 text-teal-700" />
                Checklist
              </div>
              {checklist ? (
                <div className="rounded-md border border-border p-3">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span>{checklist.title}</span>
                    <Badge>{progress}%</Badge>
                  </div>
                  <div className="mb-3 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="space-y-2">
                    {checklist.items.map((item) => (
                      <label key={item.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={item.is_done} readOnly />
                        {item.title}
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">No checklist yet.</div>
              )}
            </section>
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
            <Button type="button" variant="destructive" onClick={() => void deleteCard(selectedCard.id)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
