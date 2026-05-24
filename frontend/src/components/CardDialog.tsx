import {
  Archive,
  CalendarClock,
  CheckSquare,
  Image,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CardCoverPicker } from "@/components/CardCoverPicker";
import { resolveAvatarUrl } from "@/lib/avatar";
import { findCoverColor, hasCover } from "@/lib/cardCovers";
import { useAppStore } from "@/store/useAppStore";
import type { Card, Checklist, Label } from "@/types";

const LABEL_COLORS = ["#60a5fa", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6", "#f97316", "#e879f9"];

function nextChecklistPosition(checklist: Checklist | undefined) {
  if (!checklist?.items.length) return 1024;
  return Math.max(...checklist.items.map((item) => item.position)) + 1024;
}

function activityText(activity: Card["activities"][number]) {
  if (activity.action === "comment") return activity.detail ?? "commented on this card";
  return activity.detail ?? activity.action;
}

function displayTime(value: string) {
  return new Date(value).toLocaleString();
}

export function CardDialog() {
  const {
    activeBoard,
    selectedCard,
    setSelectedCard,
    updateCard,
    deleteCard,
    createLabel,
    addCardComment,
  } = useAppStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [labelIds, setLabelIds] = useState<number[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState(LABEL_COLORS[0]);
  const [commentText, setCommentText] = useState("");
  const [savingAction, setSavingAction] = useState<Set<string>>(new Set());
  const [isLabelCreatorOpen, setIsLabelCreatorOpen] = useState(false);
  const [isCoverPickerOpen, setIsCoverPickerOpen] = useState(false);
  const checklistSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!selectedCard) return;
    setTitle(selectedCard.title);
    setDescription(selectedCard.description ?? "");
    setDueDate(selectedCard.due_date ? selectedCard.due_date.slice(0, 10) : "");
    setLabelIds(selectedCard.labels.map((label) => label.id));
    setChecklists(selectedCard.checklists);
    setNewChecklistItem("");
    setCommentText("");
    setSavingAction(new Set());
    setIsLabelCreatorOpen(false);
    setIsCoverPickerOpen(false);
    // Reset local form only when a different card is opened to avoid clobbering in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCard?.id]);

  // Keep label/checklist selections in sync with server-side updates without resetting text edits.
  useEffect(() => {
    if (!selectedCard) return;
    setLabelIds(selectedCard.labels.map((label) => label.id));
    setChecklists(selectedCard.checklists);
  }, [selectedCard?.labels, selectedCard?.checklists]);

  const listTitle = useMemo(() => {
    if (!activeBoard || !selectedCard) return "";
    return activeBoard.lists.find((list) => list.id === selectedCard.list_id)?.title ?? "Card";
  }, [activeBoard, selectedCard]);

  const selectedLabels = useMemo(() => {
    if (!activeBoard) return [];
    return activeBoard.labels.filter((label) => labelIds.includes(label.id));
  }, [activeBoard, labelIds]);

  const firstChecklist = checklists[0];
  const checklistTotal = firstChecklist?.items.length ?? 0;
  const checklistDone = firstChecklist?.items.filter((item) => item.is_done).length ?? 0;
  const progress = checklistTotal ? Math.round((checklistDone / checklistTotal) * 100) : 0;
  const isSaving = (action: string) => savingAction.has(action);
  const isBusy = savingAction.size > 0;

  if (!activeBoard || !selectedCard) return null;

  async function persistPatch(payload: Parameters<typeof updateCard>[1], action: string) {
    setSavingAction((prev) => { const next = new Set(prev); next.add(action); return next; });
    try {
      await updateCard(selectedCard!.id, payload);
    } finally {
      setSavingAction((prev) => { const next = new Set(prev); next.delete(action); return next; });
    }
  }

  async function saveCard(event?: FormEvent) {
    event?.preventDefault();
    if (!title.trim()) return;
    await persistPatch(
      {
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        due_date: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : null,
        label_ids: labelIds,
        checklists,
      },
      "save",
    );
  }

  async function createAndAssignLabel() {
    const name = labelName.trim();
    if (!name) return;
    setSavingAction((prev) => { const next = new Set(prev); next.add("label"); return next; });
    try {
      const label = await createLabel(activeBoard!.id, name, labelColor);
      if (!label) return;
      const next = [...labelIds, label.id];
      setLabelIds(next);
      setLabelName("");
      setIsLabelCreatorOpen(false);
      await updateCard(selectedCard!.id, { label_ids: next });
    } finally {
      setSavingAction((prev) => { const next = new Set(prev); next.delete("label"); return next; });
    }
  }

  async function toggleLabel(label: Label) {
    const next = labelIds.includes(label.id) ? labelIds.filter((id) => id !== label.id) : [...labelIds, label.id];
    setLabelIds(next);
    await persistPatch({ label_ids: next }, "label");
  }

  async function createChecklist() {
    if (checklists.length) return;
    const next = [{ id: -Date.now(), title: "Checklist", items: [] }];
    setChecklists(next);
    await persistPatch({ checklists: next }, "checklist");
  }

  async function addChecklistItem() {
    const value = newChecklistItem.trim();
    if (!value || isBusy) return;
    const base = firstChecklist ?? { id: -Date.now(), title: "Checklist", items: [] };
    const next = [
      {
        ...base,
        items: [
          ...base.items,
          {
            id: -Date.now(),
            title: value,
            is_done: false,
            position: nextChecklistPosition(base),
          },
        ],
      },
      ...checklists.slice(1),
    ];
    setChecklists(next);
    setNewChecklistItem("");
    await persistPatch({ checklists: next }, "checklist");
  }

  async function toggleChecklistItem(itemId: number) {
    const next = checklists.map((checklist) => ({
      ...checklist,
      items: checklist.items.map((item) => (item.id === itemId ? { ...item, is_done: !item.is_done } : item)),
    }));
    setChecklists(next);
    await persistPatch({ checklists: next }, "checklist");
  }

  async function removeChecklistItem(itemId: number) {
    const next = checklists.map((checklist) => ({
      ...checklist,
      items: checklist.items.filter((item) => item.id !== itemId),
    }));
    setChecklists(next);
    await persistPatch({ checklists: next }, "checklist");
  }

  async function submitComment() {
    const detail = commentText.trim();
    if (!detail) return;
    setSavingAction((prev) => { const next = new Set(prev); next.add("comment"); return next; });
    try {
      await addCardComment(selectedCard!.id, detail);
      setCommentText("");
    } finally {
      setSavingAction((prev) => { const next = new Set(prev); next.delete("comment"); return next; });
    }
  }

  async function archiveCard() {
    await persistPatch({ archived: true }, "archive");
    setSelectedCard(null);
  }

  async function removeCard() {
    setSavingAction((prev) => { const next = new Set(prev); next.add("delete"); return next; });
    try {
      await deleteCard(selectedCard!.id);
    } finally {
      setSavingAction((prev) => { const next = new Set(prev); next.delete("delete"); return next; });
    }
  }

  return (
    <Dialog
      open={Boolean(selectedCard)}
      onOpenChange={(open) => {
        if (open) return;
        const nextTitle = title.trim();
        const nextDesc = description.trim() ? description.trim() : null;
        const titleChanged = nextTitle && nextTitle !== selectedCard?.title;
        const descChanged = (selectedCard?.description ?? null) !== nextDesc;
        if (titleChanged || descChanged) {
          void persistPatch(
            {
              ...(titleChanged ? { title: nextTitle } : {}),
              ...(descChanged ? { description: nextDesc } : {}),
            },
            "save",
          );
        }
        setSelectedCard(null);
      }}
    >
      <DialogContent className="flex max-h-[86vh] w-[min(1180px,calc(100vw-32px))] flex-col overflow-hidden border-white/10 bg-[#202226] p-0 text-slate-100 shadow-2xl">
        <div className="relative shrink-0">
          {selectedCard.cover_image_url ? (
            <div
              className="h-40 w-full bg-cover bg-center"
              style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.45) 100%), url(${selectedCard.cover_image_url})` }}
            />
          ) : findCoverColor(selectedCard.cover_color) ? (
            <div className={`h-32 w-full ${findCoverColor(selectedCard.cover_color)!.className}`} />
          ) : (
            <div className="h-12 w-full bg-[#17191d]" />
          )}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-6 py-4">
            <Badge className="pointer-events-auto border-white/15 bg-black/40 text-yellow-100 backdrop-blur">{listTitle}</Badge>
            <div className="mr-8 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="pointer-events-auto h-8 gap-1.5 border-white/15 bg-black/40 px-2.5 text-slate-100 backdrop-blur hover:bg-black/60"
                onClick={() => setIsCoverPickerOpen((open) => !open)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Cover
              </Button>
            </div>
          </div>
          {isCoverPickerOpen && (
            <div className="kanban-scroll absolute right-6 top-full z-30 mt-2 max-h-[70vh] w-[320px] overflow-y-auto">
              <CardCoverPicker
                coverColor={selectedCard.cover_color}
                coverImageUrl={selectedCard.cover_image_url}
                onChange={(patch) => void persistPatch(patch, "cover")}
                onClose={() => setIsCoverPickerOpen(false)}
              />
            </div>
          )}
        </div>

        <form onSubmit={saveCard} className="kanban-scroll grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[1fr_430px]">
          <section className="space-y-6 border-white/10 p-6 lg:border-r">
            <div className="flex items-start gap-3">
              <CheckSquare className="mt-2 h-6 w-6 shrink-0 text-slate-300" />
              <div className="min-w-0 flex-1">
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-auto border-transparent bg-transparent px-0 py-1 text-3xl font-bold text-slate-100 shadow-none placeholder:text-slate-500 focus-visible:ring-0"
                  placeholder="Card title"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void persistPatch({ title: title.trim() }, "title"); } }}
                />
                {title.trim() !== selectedCard.title && title.trim() && (
                  <div className="mt-1 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 bg-blue-500 px-3 text-xs text-slate-100 hover:bg-blue-400"
                      disabled={isSaving("title")}
                      onClick={() => void persistPatch({ title: title.trim() }, "title")}
                    >
                      {isSaving("title") ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-3 text-xs text-slate-400 hover:bg-white/10"
                      onClick={() => setTitle(selectedCard.title)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="ml-9 flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" onClick={() => setIsLabelCreatorOpen((value) => !value)}>
                <Tag className="h-4 w-4" />
                Labels
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                onClick={() => {
                  if (firstChecklist) {
                    checklistSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  } else {
                    void createChecklist();
                    requestAnimationFrame(() => checklistSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
                  }
                }}
              >
                {isSaving("checklist") ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
                Checklist
              </Button>
              <Button type="button" variant="outline" className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" onClick={() => setIsCoverPickerOpen((open) => !open)}>
                <Image className="h-4 w-4" />
                {hasCover(selectedCard) ? "Change cover" : "Cover"}
              </Button>
            </div>

            <section className="grid gap-3">
              <div className="flex items-center gap-3 text-lg font-semibold text-slate-200">
                <Tag className="h-5 w-5 text-slate-300" />
                Labels
              </div>
              <div className="ml-8 flex flex-wrap items-center gap-2">
                {selectedLabels.map((label) => (
                  <button
                    key={label.id}
                    type="button"
                    className="h-10 min-w-16 rounded-md border border-white/15 px-3 text-sm font-semibold text-white shadow-sm"
                    style={{ backgroundColor: label.color }}
                    onClick={() => void toggleLabel(label)}
                  >
                    {label.name}
                  </button>
                ))}
              </div>
              {isLabelCreatorOpen && (
                <div className="ml-8 grid max-w-md gap-3 rounded-xl border border-white/10 bg-black/15 p-3">
                  <Input
                    value={labelName}
                    onChange={(event) => setLabelName(event.target.value)}
                    placeholder="Label name"
                    className="border-white/15 bg-[#17191d] text-slate-100"
                    disabled={isSaving("label")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void createAndAssignLabel();
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    {LABEL_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`h-8 w-12 rounded-md border ${labelColor === color ? "border-white" : "border-white/10"}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setLabelColor(color)}
                        aria-label={`Use ${color}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" className="bg-blue-500 text-slate-100 hover:bg-blue-400" disabled={isSaving("label") || !labelName.trim()} onClick={() => void createAndAssignLabel()}>
                      {isSaving("label") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Create label
                    </Button>
                    <Button type="button" variant="ghost" className="text-slate-300 hover:bg-white/10" onClick={() => setIsLabelCreatorOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              {activeBoard.labels.length > 0 && (
                <div className="ml-8 flex flex-wrap gap-2">
                  {activeBoard.labels.map((label) => (
                    <button
                      key={label.id}
                      type="button"
                      className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                        labelIds.includes(label.id) ? "border-white/30 bg-white/15 text-white" : "border-white/10 bg-black/15 text-slate-300 hover:bg-white/10"
                      }`}
                      onClick={() => void toggleLabel(label)}
                    >
                      <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: label.color }} />
                      {label.name}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="grid gap-3">
              <div className="flex items-center gap-3 text-lg font-semibold text-slate-200">
                <CalendarClock className="h-5 w-5 text-slate-300" />
                Due date
              </div>
              <Input
                type="date"
                value={dueDate}
                onChange={(event) => {
                  const next = event.target.value;
                  setDueDate(next);
                  void persistPatch({ due_date: next ? new Date(`${next}T12:00:00`).toISOString() : null }, "due");
                }}
                style={{ colorScheme: "dark" }}
                className="ml-8 h-10 max-w-xs border-white/15 bg-[#22252b] text-slate-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200"
                disabled={isSaving("due")}
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
                className="ml-8 mr-2 block min-h-24 max-w-[calc(100%-2.5rem)] resize-y border-white/15 bg-black/15 text-slate-100 placeholder:text-slate-400"
              />
              {description !== (selectedCard.description ?? "") && (
                <div className="ml-8 flex gap-2">
                  <Button
                    type="button"
                    className="bg-blue-500 text-slate-100 hover:bg-blue-400"
                    disabled={isSaving("description")}
                    onClick={() => {
                      const next = description.trim() ? description.trim() : null;
                      if ((selectedCard?.description ?? null) !== next) {
                        void persistPatch({ description: next }, "description");
                      }
                    }}
                  >
                    {isSaving("description") ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                    onClick={() => setDescription(selectedCard.description ?? "")}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </section>

            <section ref={checklistSectionRef} className="grid gap-3 scroll-mt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-lg font-semibold text-slate-200">
                  <CheckSquare className="h-5 w-5 text-slate-300" />
                  {firstChecklist?.title ?? "Checklist"}
                </div>
                {checklistTotal > 0 && <Badge className="bg-white/10 text-slate-100">{progress}%</Badge>}
              </div>
              <div className="ml-8">
                <div className="mb-3 h-2 rounded-full bg-black/25">
                  <div className="h-2 rounded-full bg-lime-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="space-y-2">
                  {firstChecklist?.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 rounded-lg bg-black/15 px-3 py-2">
                      <input type="checkbox" checked={item.is_done} onChange={() => void toggleChecklistItem(item.id)} />
                      <span className={`flex-1 text-sm ${item.is_done ? "text-slate-500 line-through" : "text-slate-200"}`}>{item.title}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:bg-white/10" onClick={() => void removeChecklistItem(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Input
                    value={newChecklistItem}
                    onChange={(event) => setNewChecklistItem(event.target.value)}
                    placeholder="Add checklist item"
                    className="border-white/15 bg-black/20 text-slate-100"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void addChecklistItem();
                      }
                    }}
                  />
                  <Button type="button" className="bg-blue-500 text-slate-100 hover:bg-blue-400" disabled={isSaving("checklist") || !newChecklistItem.trim()} onClick={() => void addChecklistItem()}>
                    {isSaving("checklist") ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                  </Button>
                </div>
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
            <div className="flex gap-2">
              <Input
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Write a comment..."
                className="border-white/10 bg-[#22252b] text-slate-100 placeholder:text-slate-400"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void submitComment();
                  }
                }}
              />
              <Button type="button" className="bg-blue-500 text-slate-100 hover:bg-blue-400" disabled={isSaving("comment") || !commentText.trim()} onClick={() => void submitComment()}>
                {isSaving("comment") ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
              </Button>
            </div>
            <div className="kanban-scroll max-h-[46vh] space-y-4 overflow-y-auto pr-1">
              {selectedCard.activities.length ? (
                selectedCard.activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3 text-sm text-slate-300">
                    <img
                      src={activity.user ? resolveAvatarUrl(activity.user) : resolveAvatarUrl({ id: 0, name: "User", avatar: "U", created_at: "" })}
                      alt={activity.user?.name ?? "User"}
                      className="h-9 w-9 shrink-0 rounded-full border border-blue-300/40 bg-slate-800 object-cover"
                    />
                    <p className="min-w-0 leading-5">
                      <span className="font-semibold text-slate-100">{activity.user?.name ?? "User"}</span>{" "}
                      <span className="break-words">{activityText(activity)}</span>
                      <br />
                      <span className="text-blue-300">{displayTime(activity.created_at)}</span>
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-400">No activity yet.</div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-white/10 pt-5">
              <Button type="button" variant="outline" className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" onClick={archiveCard} disabled={isSaving("archive")}>
                {isSaving("archive") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                Archive
              </Button>
              <Button type="button" variant="destructive" onClick={removeCard} disabled={isSaving("delete")}>
                {isSaving("delete") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </Button>
            </div>
          </aside>
        </form>
      </DialogContent>
    </Dialog>
  );
}
