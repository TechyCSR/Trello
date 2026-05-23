import type { User } from "@/types";

export function resolveAvatarUrl(user: User): string {
  const avatar = user.avatar?.trim() ?? "";
  if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
    return avatar;
  }
  const seed = avatar || user.name || "User";
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}
