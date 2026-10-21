type Activity = { id: string; created_at: string; text: string; image_url?: string | null };
const activityByUser = new Map<number, Map<number, Activity>>();

export function recordConversationActivity(userId: number, peerId: number, message: Activity) {
  if (!userId || !peerId || !Number.isFinite(Date.parse(message.created_at))) return;
  const activity = activityByUser.get(userId) ?? new Map<number, Activity>();
  const previous = activity.get(peerId);
  if (!previous || Number(message.id) > Number(previous.id)) activity.set(peerId, message);
  activityByUser.set(userId, activity);
}

export function applyConversationActivity<T extends { user_id: number; last_message_at?: string; last_message_id?: number; last_message: string; last_time: string }>(userId: number, conversations: T[]): T[] {
  return conversations.map((conversation) => {
    const activity = activityByUser.get(userId)?.get(conversation.user_id);
    if (!activity) return conversation;
    const serverId = Number(conversation.last_message_id || 0);
    if (serverId && serverId >= Number(activity.id)) return conversation;
    if (!serverId && (Date.parse(conversation.last_message_at || "") || 0) > Date.parse(activity.created_at)) return conversation;
    const sentAt = new Date(activity.created_at);
    const lastTime = Date.now() - sentAt.getTime() < 86400000
      ? sentAt.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })
      : sentAt.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    return { ...conversation, last_message_at: activity.created_at, last_message_id: Number(activity.id), last_message: activity.text || (activity.image_url ? "Sent a photo" : ""), last_time: lastTime };
  });
}
