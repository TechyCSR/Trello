import { Check, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/useAppStore";

type BackgroundOption = {
  id: string;
  label: string;
  kind: "image" | "color";
  previewClass?: string;
  imageUrl?: string;
};

const backgroundOptions: BackgroundOption[] = [
  {
    id: "photo-dawn",
    label: "Dawn trees",
    kind: "image",
    imageUrl:
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=60",
  },
  {
    id: "photo-cosmos",
    label: "Cosmos",
    kind: "image",
    imageUrl:
      "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=800&q=60",
  },
  {
    id: "photo-ocean",
    label: "Ocean",
    kind: "image",
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=60",
  },
  { id: "blue", label: "Blue", kind: "color", previewClass: "bg-gradient-to-br from-blue-700 to-blue-500" },
  { id: "teal", label: "Teal", kind: "color", previewClass: "bg-gradient-to-br from-cyan-600 to-teal-500" },
  { id: "purple", label: "Purple", kind: "color", previewClass: "bg-gradient-to-br from-violet-600 to-fuchsia-500" },
];

export function CreateBoardDialog() {
  const { isCreateBoardModalOpen, setCreateBoardModalOpen, createBoard } = useAppStore();
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [backgroundId, setBackgroundId] = useState(backgroundOptions[0].id);
  const [isSaving, setIsSaving] = useState(false);

  const selected = useMemo(
    () => backgroundOptions.find((option) => option.id === backgroundId) ?? backgroundOptions[0],
    [backgroundId],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await createBoard(title.trim(), visibility === "public", backgroundId);
      setCreateBoardModalOpen(false);
      setTitle("");
      setVisibility("private");
      setBackgroundId(backgroundOptions[0].id);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={isCreateBoardModalOpen} onOpenChange={setCreateBoardModalOpen}>
      <DialogContent className="max-w-md border-white/15 bg-[#1f2330] text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-semibold">Create board</DialogTitle>
        </DialogHeader>
        <button
          className="absolute right-3 top-3 rounded-md p-1 text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
          onClick={() => setCreateBoardModalOpen(false)}
          aria-label="Close create board dialog"
        >
          <X className="h-5 w-5" />
        </button>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="overflow-hidden rounded-md border border-white/15">
            {selected.kind === "image" ? (
              <div
                className="h-32 w-full bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(rgba(15,20,30,.25), rgba(15,20,30,.25)), url(${selected.imageUrl})`,
                }}
              />
            ) : (
              <div className={`h-32 w-full ${selected.previewClass}`} />
            )}
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-slate-300">Background</div>
            <div className="grid grid-cols-3 gap-2">
              {backgroundOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setBackgroundId(option.id)}
                  className={`relative h-12 overflow-hidden rounded-md border ${backgroundId === option.id ? "border-blue-400" : "border-white/15"}`}
                  title={option.label}
                >
                  {option.kind === "image" ? (
                    <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${option.imageUrl})` }} />
                  ) : (
                    <div className={`h-full w-full ${option.previewClass}`} />
                  )}
                  {backgroundId === option.id && (
                    <span className="absolute inset-0 grid place-items-center bg-black/35">
                      <Check className="h-4 w-4 text-white" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-slate-300">Board title</span>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Games"
              className="border-white/20 bg-[#252b3a] text-slate-100 placeholder:text-slate-400"
            />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-slate-300">Visibility</span>
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as "private" | "public")}
              className="h-10 rounded-md border border-white/20 bg-[#252b3a] px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </label>

          <Button
            type="submit"
            className="h-10 w-full bg-blue-500 text-base text-white hover:bg-blue-400"
            disabled={!title.trim() || isSaving}
          >
            {isSaving ? "Creating..." : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
