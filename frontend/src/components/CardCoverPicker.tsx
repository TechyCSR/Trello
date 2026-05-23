import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { COVER_COLORS, COVER_PHOTOS, findCoverColor } from "@/lib/cardCovers";

type CardCoverPickerProps = {
  coverColor: string | null;
  coverImageUrl: string | null;
  onChange: (patch: { cover_color: string | null; cover_image_url: string | null }) => void;
  onClose: () => void;
};

export function CardCoverPicker({ coverColor, coverImageUrl, onChange, onClose }: CardCoverPickerProps) {
  const selectedColor = findCoverColor(coverColor);

  function pickColor(id: string) {
    onChange({ cover_color: id, cover_image_url: null });
  }

  function pickPhoto(url: string) {
    onChange({ cover_color: null, cover_image_url: url });
  }

  function clearCover() {
    onChange({ cover_color: null, cover_image_url: null });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#1f232b] p-4 text-slate-100 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.65)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-base font-semibold">Cover</div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
          aria-label="Close cover picker"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">Preview</div>
      <div className="mb-4 overflow-hidden rounded-xl border border-white/10">
        {coverImageUrl ? (
          <div className="h-24 w-full bg-cover bg-center" style={{ backgroundImage: `url(${coverImageUrl})` }} />
        ) : selectedColor ? (
          <div className={`h-24 w-full ${selectedColor.className}`} />
        ) : (
          <div className="grid h-24 w-full place-items-center bg-black/30 text-xs text-slate-500">No cover</div>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        className="mb-4 w-full justify-center border-white/15 bg-white/5 text-slate-100 hover:bg-white/10"
        onClick={clearCover}
      >
        Remove cover
      </Button>

      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Colors</div>
      <div className="mb-4 grid grid-cols-5 gap-2">
        {COVER_COLORS.map((color) => {
          const selected = coverColor === color.id && !coverImageUrl;
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => pickColor(color.id)}
              title={color.label}
              className={`relative h-9 overflow-hidden rounded-lg border transition ${
                selected ? "border-blue-400 ring-2 ring-blue-400/50" : "border-white/10 hover:border-white/30"
              }`}
            >
              <span className={`block h-full w-full ${color.className}`} />
              {selected && (
                <span className="absolute inset-0 grid place-items-center bg-black/25">
                  <Check className="h-4 w-4 text-white" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Photos</div>
      <div className="grid grid-cols-3 gap-2">
        {COVER_PHOTOS.map((photo) => {
          const selected = coverImageUrl === photo.url;
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => pickPhoto(photo.url)}
              className={`relative h-16 overflow-hidden rounded-lg border transition ${
                selected ? "border-blue-400 ring-2 ring-blue-400/50" : "border-white/10 hover:border-white/30"
              }`}
            >
              <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${photo.url})` }} />
              {selected && (
                <span className="absolute inset-0 grid place-items-center bg-black/35">
                  <Check className="h-4 w-4 text-white" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
