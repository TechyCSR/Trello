import { Archive, Check, ChevronRight, Copy, Image, Loader2, Mail, Palette, RotateCcw, Settings, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BOARD_BACKGROUNDS } from "@/lib/boardBackgrounds";
import { useAppStore } from "@/store/useAppStore";
import type { Card } from "@/types";

type Panel = "main" | "description" | "archived" | "background";

export function BoardSettingsPanel({ onClose }: { onClose: () => void }) {
  const { activeBoard, updateBoard, archivedCards, archivedCardsBoardId, fetchArchivedCards, unarchiveCard } = useAppStore();
  const [panel, setPanel] = useState<Panel>("main");
  const [description, setDescription] = useState(activeBoard?.description ?? "");
  const [isSavingDesc, setIsSavingDesc] = useState(false);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [isSavingBg, setIsSavingBg] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const backgroundRequestRef = useRef(0);

  // Use cached archived cards instantly; only show loading on first fetch for this board.
  useEffect(() => {
    if (panel === "archived" && activeBoard) {
      if (archivedCardsBoardId === activeBoard.id) return;
      setIsLoadingArchived(true);
      void fetchArchivedCards(activeBoard.id).finally(() => setIsLoadingArchived(false));
    }
  }, [panel, activeBoard, archivedCardsBoardId, fetchArchivedCards]);

  if (!activeBoard) return null;

  async function saveDescription() {
    if (!activeBoard) return;
    setPanel("main");
    setIsSavingDesc(true);
    try {
      await updateBoard(activeBoard.id, { description: description.trim() || null });
    } finally {
      setIsSavingDesc(false);
    }
  }

  function restoreCard(cardId: number) {
    setRestoringId(cardId);
    // Optimistic - unarchiveCard removes from archivedCards and adds to board immediately
    void unarchiveCard(cardId).finally(() => {
      setRestoringId(null);
    });
  }

  function changeBackground(colorId: string) {
    if (!activeBoard) return;
    const requestId = ++backgroundRequestRef.current;
    setIsSavingBg(true);
    void updateBoard(activeBoard.id, { color: colorId }).finally(() => {
      if (requestId === backgroundRequestRef.current) setIsSavingBg(false);
    });
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-none border-0 bg-[#0f2a57]/95 text-slate-100 shadow-none ring-0 transition-all duration-300 md:rounded-3xl md:border md:border-white/20 md:shadow-[0_18px_45px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.12)] md:ring-1 md:ring-black/20">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/15 bg-[#102b59] px-4 py-4">
        <div className="flex items-center gap-2">
          {panel !== "main" && (
            <button
              type="button"
              className="rounded-md p-1 text-slate-300 hover:bg-white/10 hover:text-white"
              onClick={() => setPanel("main")}
              aria-label="Back"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </button>
          )}
          <Settings className="h-5 w-5 text-sky-200" />
          <h2 className="text-xl font-semibold text-slate-100">
            {panel === "main" && "Board Settings"}
            {panel === "description" && "Description"}
            {panel === "archived" && "Archived Cards"}
            {panel === "background" && "Background"}
          </h2>
        </div>
        <button
          type="button"
          className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
          onClick={onClose}
          aria-label="Close settings"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* Main menu */}
      {panel === "main" && (
        <div className="kanban-scroll flex-1 space-y-2 overflow-y-auto p-3">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:bg-white/10"
            onClick={() => { setDescription(activeBoard.description ?? ""); setPanel("description"); }}
          >
            <div className="flex items-center gap-3">
              <Palette className="h-4 w-4 text-blue-300" />
              <div>
                <div className="font-semibold">Description</div>
                <div className="mt-0.5 text-xs text-slate-400 line-clamp-1">{activeBoard.description || "Add a description…"}</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </button>

          <button
            type="button"
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:bg-white/10"
            onClick={() => setPanel("archived")}
          >
            <div className="flex items-center gap-3">
              <Archive className="h-4 w-4 text-amber-300" />
              <div>
                <div className="font-semibold">Archived Cards</div>
                <div className="mt-0.5 text-xs text-slate-400">Restore previously archived cards</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </button>

          <button
            type="button"
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:bg-white/10"
            onClick={() => setPanel("background")}
          >
            <div className="flex items-center gap-3">
              <Image className="h-4 w-4 text-emerald-300" />
              <div>
                <div className="font-semibold">Change Background</div>
                <div className="mt-0.5 text-xs text-slate-400">Photos and colors</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </button>

          {/* Email to Board */}
          {activeBoard.email_address && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="mb-2 flex items-center gap-3">
                <Mail className="h-4 w-4 text-violet-300" />
                <div className="font-semibold text-sm">Email to Board</div>
              </div>
              <p className="mb-2 text-xs text-slate-400">
                Forward emails to this address and they will appear as cards in the Inbox.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-black/30 px-3 py-2 text-xs text-sky-200 select-all">
                  {activeBoard.email_address}
                </code>
                <button
                  type="button"
                  className="shrink-0 rounded-lg bg-white/10 p-2 text-slate-300 transition hover:bg-white/20 hover:text-white"
                  onClick={() => {
                    void navigator.clipboard.writeText(activeBoard.email_address!).then(() => {
                      setEmailCopied(true);
                      setTimeout(() => setEmailCopied(false), 2000);
                    });
                  }}
                  title="Copy email address"
                >
                  {emailCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              {emailCopied && (
                <p className="mt-1.5 text-xs text-emerald-400">Copied to clipboard!</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Description sub-panel */}
      {panel === "description" && (
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <p className="text-xs text-slate-400">This description appears under the board title on the boards page.</p>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description for this board…"
            className="min-h-36 resize-y border-white/15 bg-black/20 text-slate-100 placeholder:text-slate-500"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              className="bg-blue-500 text-slate-100 hover:bg-blue-400"
              disabled={isSavingDesc}
              onClick={() => void saveDescription()}
            >
              {isSavingDesc ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
            <Button variant="ghost" className="text-slate-300 hover:bg-white/10" onClick={() => setPanel("main")}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Archived cards sub-panel */}
      {panel === "archived" && (
        <div className="kanban-scroll flex-1 space-y-2 overflow-y-auto p-3">
          {isLoadingArchived ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-blue-300" />
            </div>
          ) : archivedCards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/20 p-6 text-center text-sm text-slate-400">
              No archived cards
            </div>
          ) : (
            archivedCards.map((card) => (
              <div key={card.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                <Archive className="h-4 w-4 shrink-0 text-amber-300" />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{card.title}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 shrink-0 gap-1 px-2 text-xs text-emerald-300 hover:bg-white/10"
                  disabled={restoringId === card.id}
                  onClick={() => void restoreCard(card.id)}
                >
                  {restoringId === card.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3 w-3" />
                  )}
                  Restore
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Background sub-panel */}
      {panel === "background" && (
        <div className="kanban-scroll flex-1 space-y-4 overflow-y-auto p-4">
          {isSavingBg && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </div>
          )}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Photos</p>
            <div className="grid grid-cols-2 gap-2">
              {BOARD_BACKGROUNDS.filter((bg) => bg.kind === "image").map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => void changeBackground(bg.id)}
                  className={`relative h-16 overflow-hidden rounded-xl border-2 transition ${
                    activeBoard.color === bg.id ? "border-blue-400" : "border-white/10 hover:border-white/30"
                  }`}
                  title={bg.label}
                >
                  <img src={bg.imageUrl} alt={bg.label} className="h-full w-full object-cover" />
                  {activeBoard.color === bg.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-semibold text-white">Active</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Colors</p>
            <div className="grid grid-cols-3 gap-2">
              {BOARD_BACKGROUNDS.filter((bg) => bg.kind === "color").map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => void changeBackground(bg.id)}
                  className={`h-12 overflow-hidden rounded-xl border-2 bg-gradient-to-br transition ${bg.className ?? ""} ${
                    activeBoard.color === bg.id ? "border-blue-400" : "border-white/10 hover:border-white/30"
                  }`}
                  title={bg.label}
                >
                  {activeBoard.color === bg.id && (
                    <span className="flex h-full items-center justify-center text-xs font-semibold text-white">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
