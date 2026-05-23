export type CoverColor = {
  id: string;
  label: string;
  className: string;
  hex: string;
};

export const COVER_COLORS: CoverColor[] = [
  { id: "emerald", label: "Emerald", className: "bg-gradient-to-br from-emerald-600 to-emerald-400", hex: "#10b981" },
  { id: "amber", label: "Amber", className: "bg-gradient-to-br from-amber-600 to-amber-400", hex: "#f59e0b" },
  { id: "orange", label: "Orange", className: "bg-gradient-to-br from-orange-600 to-orange-400", hex: "#f97316" },
  { id: "red", label: "Red", className: "bg-gradient-to-br from-red-600 to-red-400", hex: "#ef4444" },
  { id: "purple", label: "Purple", className: "bg-gradient-to-br from-purple-600 to-fuchsia-500", hex: "#a855f7" },
  { id: "blue", label: "Blue", className: "bg-gradient-to-br from-blue-700 to-blue-500", hex: "#3b82f6" },
  { id: "teal", label: "Teal", className: "bg-gradient-to-br from-cyan-600 to-teal-500", hex: "#14b8a6" },
  { id: "lime", label: "Lime", className: "bg-gradient-to-br from-lime-600 to-lime-400", hex: "#84cc16" },
  { id: "pink", label: "Pink", className: "bg-gradient-to-br from-pink-600 to-pink-400", hex: "#ec4899" },
  { id: "slate", label: "Slate", className: "bg-gradient-to-br from-slate-600 to-slate-500", hex: "#64748b" },
];

export const COVER_PHOTOS: { id: string; url: string }[] = [
  { id: "trees", url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=70" },
  { id: "dunes", url: "https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=1200&q=70" },
  { id: "moon", url: "https://images.unsplash.com/photo-1532693322450-2cb5c511067d?auto=format&fit=crop&w=1200&q=70" },
  { id: "ocean", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=70" },
  { id: "mountain", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=70" },
  { id: "cosmos", url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1200&q=70" },
];

export function findCoverColor(id: string | null | undefined): CoverColor | undefined {
  if (!id) return undefined;
  return COVER_COLORS.find((color) => color.id === id);
}

export function hasCover(card: { cover_color?: string | null; cover_image_url?: string | null }): boolean {
  return Boolean(card.cover_image_url) || Boolean(card.cover_color);
}
