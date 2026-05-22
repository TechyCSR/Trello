import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function positionBetween(before?: number, after?: number) {
  if (before === undefined && after === undefined) return 1024;
  if (before === undefined) return after! / 2;
  if (after === undefined) return before + 1024;
  return before + (after - before) / 2;
}
