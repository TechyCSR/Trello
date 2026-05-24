export type BoardBackgroundOption = {
  id: string;
  label: string;
  kind: "image" | "color";
  className?: string;
  imageUrl?: string;
};

export const BOARD_BACKGROUNDS: BoardBackgroundOption[] = [
  {
    id: "photo-dawn",
    label: "Dawn trees",
    kind: "image",
    imageUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=70",
  },
  {
    id: "photo-cosmos",
    label: "Cosmos",
    kind: "image",
    imageUrl: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1600&q=70",
  },
  {
    id: "photo-ocean",
    label: "Ocean",
    kind: "image",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=70",
  },
  { id: "blue", label: "Blue", kind: "color", className: "from-blue-700 to-blue-500" },
  { id: "teal", label: "Teal", kind: "color", className: "from-cyan-600 to-teal-500" },
  { id: "purple", label: "Purple", kind: "color", className: "from-violet-600 to-fuchsia-500" },
  { id: "indigo", label: "Indigo", kind: "color", className: "from-violet-500 to-fuchsia-500" },
  { id: "sky", label: "Sky", kind: "color", className: "from-indigo-500 to-purple-500" },
  { id: "slate", label: "Slate", kind: "color", className: "from-slate-600 to-slate-700" },
];

export function getBoardBackground(colorId: string | null | undefined): BoardBackgroundOption {
  return BOARD_BACKGROUNDS.find((option) => option.id === colorId) ?? BOARD_BACKGROUNDS[4];
}
