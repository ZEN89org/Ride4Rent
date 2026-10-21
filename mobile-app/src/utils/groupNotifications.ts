import type { AppNotification } from "@/services/notificationService";

export function groupNotifications(items: AppNotification[]): AppNotification[] {
  const groups = new Map<string, AppNotification>();
  for (const item of [...items].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))) {
    const key = item.title.trim().toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.group_ids!.push(item.id);
      existing.group_count!++;
      existing.is_read = existing.is_read && item.is_read;
    } else {
      groups.set(key, { ...item, group_ids: [item.id], group_count: 1 });
    }
  }
  return [...groups.values()];
}
