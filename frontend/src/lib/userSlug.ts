import type { User } from "@/types";

export function toUserSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function findUserBySlug(users: User[], slug: string): User | null {
  return users.find((user) => toUserSlug(user.name) === slug) ?? null;
}
