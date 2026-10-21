import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Animated, FlatList, Image, PanResponder, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/hooks/useAuth";
import OperatorShell from "@/features/operator/components/navigation/OperatorShell";
import { useAppToast } from "@/context/ToastContext";
import { useConversations } from "@/hooks/useConversations";
import { archiveConversation, deleteConversation, restoreConversation, type ConversationItem } from "@/services/messageService";
import { resolveImageUrl } from "@/services/api";
import ScreenContainer from "./ScreenContainer";
import { receiptHeading } from "@/utils/chatPayment";

function preview(message: string) {
  const clean = message.replace(/^\[REPLY:[\s\S]*?\]\s*/i, "").trim();
  if (clean.startsWith("[CALL:")) return /"type"\s*:\s*"missed"/.test(clean) ? "Missed call" : "Voice call";
  if (clean.includes("PAYMENT RECEIPT")) {
    const status = clean.match(/^Status:\s*(.+)$/mi)?.[1];
    return receiptHeading({ type: clean.startsWith("REFUND") ? "refund" : "reservation", status });
  }
  return clean || "Photo message";
}

function ConversationRow({ item, archived, open, busy, onOpen, onPress, onProfile, onArchive, onDelete }: {
  item: ConversationItem; archived: boolean; open: boolean; busy: boolean; onOpen: (value: boolean) => void;
  onPress: () => void; onProfile: () => void; onArchive: () => void; onDelete: () => void;
}) {
  const [x] = useState(() => new Animated.Value(0));
  const move = useCallback((opened: boolean) => Animated.spring(x, { toValue: opened ? -144 : 0, useNativeDriver: true, bounciness: 0 }).start(), [x]);
  useEffect(() => { move(open); }, [open, move]);
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => !busy && Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderMove: (_, gesture) => x.setValue(Math.max(-144, Math.min(0, (open ? -144 : 0) + gesture.dx))),
    onPanResponderRelease: (_, gesture) => { const next = open ? gesture.dx < 50 : gesture.dx < -45; move(next); onOpen(next); },
    onPanResponderTerminate: () => { move(false); onOpen(false); },
  }), [open, busy, x, onOpen, move]);
  const name = item.business_name || item.name || "User";
  const photo = resolveImageUrl(item.profile_photo);
  return <View style={[styles.swipeRoot, item.role !== "operator" && { marginBottom: Spacing.sm }]}>
    <Animated.View style={[styles.swipeActions, { opacity: x.interpolate({ inputRange: [-144, -1, 0], outputRange: [1, 1, 0], extrapolate: "clamp" }) }]} pointerEvents={open ? "auto" : "none"}>
      <TouchableOpacity disabled={busy} accessibilityLabel={archived ? `Restore ${name}` : `Archive ${name}`} style={styles.archiveAction} onPress={onArchive}><Ionicons name={archived ? "arrow-undo-outline" : "archive-outline"} size={20} color={Colors.dark} /><Text style={styles.actionLabel}>{archived ? "Restore" : "Archive"}</Text></TouchableOpacity>
      <TouchableOpacity disabled={busy} accessibilityLabel={`Delete conversation with ${name}`} style={styles.deleteAction} onPress={onDelete}><Ionicons name="trash-outline" size={20} color={Colors.white} /><Text style={[styles.actionLabel, { color: Colors.white }]}>Delete</Text></TouchableOpacity>
    </Animated.View>
    <Animated.View style={[styles.foreground, { transform: [{ translateX: x }] }]} {...pan.panHandlers}>
      <TouchableOpacity style={[styles.row, item.role !== "operator" && styles.operatorCard]} disabled={busy} onPress={() => open ? onOpen(false) : onPress()}>
        <TouchableOpacity style={{ position: "relative" }} accessibilityRole="button" accessibilityLabel={`View ${name}'s profile`} onPress={event => { event.stopPropagation(); onProfile(); }}>
          {photo ? <Image source={{ uri: photo }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.initial}>{name.charAt(0).toUpperCase()}</Text></View>}
          {item.unread_count > 0 && <View style={styles.unreadDot} />}
        </TouchableOpacity>
        <View style={styles.copy}><View style={styles.nameRow}><Text numberOfLines={1} style={styles.name}>{name}</Text><Text style={styles.time}>{item.last_time}</Text></View><Text numberOfLines={1} style={[styles.preview, item.unread_count > 0 && styles.unread]}>{preview(item.last_message || "")}</Text></View>

      </TouchableOpacity>
    </Animated.View>
  </View>;
}

export default function ConversationListScreen({ operator = false, archived = false }: { operator?: boolean; archived?: boolean }) {
  const { isGuest } = useAuth();
  const { showModal, showSuccess, showError } = useAppToast();
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => { const timer = setTimeout(() => setSearchQuery(search.trim()), 250); return () => clearTimeout(timer); }, [search]);
  const { conversations, setConversations, loading, refreshing, refresh, mutate, hasMore, loadingMore, loadMore, archivedCount } = useConversations(archived, searchQuery);
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const all = conversations.filter(item => operator ? item.role !== "operator" : item.role === "operator");
  const query = search.trim().toLowerCase();
  const visible = all.filter(item => Boolean(item.archived) === archived && `${item.name} ${item.business_name || ""} ${item.last_message}`.toLowerCase().includes(query));
  const profile = (item: ConversationItem) => router.push((operator ? `/renter/${item.user_id}` : `/operator/${item.user_id}`) as any);
  const openThread = (item: ConversationItem) => {
    setConversations(previous => previous.map(thread => thread.user_id === item.user_id ? { ...thread, unread_count: 0 } : thread));
    router.push({ pathname: "/chat/[id]", params: { id: String(item.user_id), name: item.business_name || item.name } });
  };
  const changeFolder = async (item: ConversationItem) => {
    if (busyId !== null) return;
    setBusyId(item.user_id); setOpenRow(null);
    try {
      await mutate(() => archived ? restoreConversation(item.user_id) : archiveConversation(item.user_id), previous => previous.map(thread => thread.user_id === item.user_id ? { ...thread, archived: !archived } : thread));
      showSuccess(archived ? "Conversation Restored" : "Conversation Archived", archived ? "Moved to your inbox." : "Available in Archived Chats.");
    } catch { showError("Unable to update chat", "Please try again."); }
    finally { setBusyId(null); }
  };
  const remove = (item: ConversationItem) => {
    setOpenRow(null);
    showModal("Remove Conversation?", "This removes the conversation from your list. Its history and payment receipts are retained, and the other person’s chat is unchanged.", [
      { text: "Keep Conversation", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        setBusyId(item.user_id);
        try { await mutate(() => deleteConversation(item.user_id), previous => previous.filter(thread => thread.user_id !== item.user_id)); showSuccess("Conversation Removed", "It may reappear when a new message is sent."); }
        catch { showError("Unable to remove chat", "Please try again."); }
        finally { setBusyId(null); }
      } },
    ], "confirm");
  };
  const content = <View style={styles.container}>
    <View style={styles.header}>
      {archived && <TouchableOpacity accessibilityLabel="Back to chats" style={styles.headerButton} onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={Colors.dark} /></TouchableOpacity>}
      <View style={{ flex: 1 }}><Text style={styles.title}>{archived ? "Archived Chats" : operator ? "Customer Inquiries" : "Messages"}</Text><Text style={styles.subtitle}>{archived ? "Restore a conversation whenever you need it" : operator ? "Direct communications with interested renters" : "Direct host & operator communications"}</Text></View>

    </View>
    {!isGuest && <View style={styles.search}><Ionicons name="search-outline" size={19} color={Colors.secondary} /><TextInput style={styles.searchInput} placeholder={operator ? "Search renters..." : "Search operators..."} value={search} onChangeText={setSearch} autoCorrect={false} /></View>}
    {!archived && !isGuest && <View style={styles.archiveRow}><TouchableOpacity accessibilityLabel={`Archived chats, ${archivedCount} conversations`} style={styles.archiveLink} onPress={() => router.push("/chat-archive")}><Ionicons name="archive-outline" size={18} color={Colors.secondary} /><Text style={styles.archiveLinkText}>Archived chats{archivedCount ? ` (${archivedCount})` : ""}</Text><Ionicons name="chevron-forward" size={16} color={Colors.secondary} /></TouchableOpacity></View>}
    <FlatList onEndReached={() => { if (hasMore && !loadingMore) loadMore(); }} onEndReachedThreshold={0.4} ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 16 }} color={Colors.dark} /> : null} data={isGuest ? [] : visible} keyExtractor={item => String(item.user_id)} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" onScrollBeginDrag={() => setOpenRow(null)} refreshControl={!isGuest ? <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[Colors.primary]} /> : undefined} renderItem={({ item }) => <ConversationRow item={item} archived={archived} open={openRow === item.user_id} busy={busyId !== null} onOpen={value => setOpenRow(value ? item.user_id : null)} onPress={() => openThread(item)} onProfile={() => profile(item)} onArchive={() => { void changeFolder(item); }} onDelete={() => remove(item)} />} ListEmptyComponent={<View style={styles.empty}><Ionicons name={archived ? "archive-outline" : "chatbubbles-outline"} size={34} color={Colors.dark} /><Text style={styles.emptyTitle}>{isGuest ? "Sign in to chat" : loading ? "Loading conversations…" : query ? "No matches found" : archived ? "No archived chats" : "No conversations yet"}</Text><Text style={styles.subtitle}>{isGuest ? "Connect with operators after signing in." : archived ? "Archived conversations will appear here." : "Swipe left on a conversation to archive or remove it."}</Text>{isGuest && <TouchableOpacity style={styles.signIn} onPress={() => router.push("/auth")}><Text style={styles.actionLabel}>Sign In</Text></TouchableOpacity>}</View>} />
  </View>;
  return operator ? <OperatorShell activeRoute="chats">{content}</OperatorShell> : <ScreenContainer>{content}</ScreenContainer>;
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, backgroundColor: Colors.white },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: Spacing.sm },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize.heading, letterSpacing: -0.5, color: Colors.dark },
  subtitle: { fontFamily: FontFamily.regular, fontSize: FontSize.small, lineHeight: 21, color: Colors.secondary, marginTop: 2 },
  archiveRow: { alignItems: "flex-end", marginBottom: 8 },
  archiveLink: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 44 },
  archiveLinkText: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.secondary },
  headerButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" },
  archiveBadge: { position: "absolute", right: -3, top: -3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  archiveCount: { fontFamily: FontFamily.semiBold, fontSize: 9, color: Colors.dark },
  search: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, backgroundColor: Colors.inputBackground, borderRadius: 24, marginBottom: Spacing.md },
  searchInput: { minHeight: 44, flex: 1, minWidth: 0, fontFamily: FontFamily.regular, fontSize: 14, color: Colors.dark },
  swipeRoot: { overflow: "hidden", borderRadius: 16, marginBottom: 0 },
  swipeActions: { position: "absolute", top: 0, right: 0, bottom: 0, flexDirection: "row", width: 144 },
  archiveAction: { width: 72, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", gap: 6 },
  deleteAction: { width: 72, backgroundColor: "#B91C1C", alignItems: "center", justifyContent: "center", gap: 6 },
  actionLabel: { fontFamily: FontFamily.semiBold, fontSize: 11, color: Colors.dark },
  foreground: { backgroundColor: Colors.white },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.logoBackground },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  initial: { fontFamily: FontFamily.semiBold, fontSize: 19, color: Colors.dark },
  copy: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  name: { flex: 1, fontFamily: FontFamily.bold, fontSize: 15, color: Colors.dark },
  time: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.secondary },
  preview: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18, color: Colors.secondary },
  unread: { fontFamily: FontFamily.semiBold, color: Colors.dark },
  unreadDot: { position: "absolute", top: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary, borderWidth: 2, borderColor: Colors.white },
  operatorCard: { padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: 16 },
  empty: { paddingVertical: 44, alignItems: "center", gap: 12 },
  emptyTitle: { fontFamily: FontFamily.semiBold, fontSize: 16, color: Colors.dark },
  signIn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 14 },
});
