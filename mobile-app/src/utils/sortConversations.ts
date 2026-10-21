export function sortConversations<T extends { last_message_at?: string | null; last_message_id?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    (Date.parse(b.last_message_at || "") || 0) - (Date.parse(a.last_message_at || "") || 0) ||
    (b.last_message_id || 0) - (a.last_message_id || 0),
  );
}
