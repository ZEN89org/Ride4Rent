import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  PanResponder,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import ScreenContainer from "@/components/common/ScreenContainer";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  archiveConversation,
  ConversationItem,
  deleteConversation,
  getConversations,
  restoreConversation,
} from "@/services/messageService";

const cleanMessagePreview = (msg?: string | null): string => {
  if (!msg) return "No messages yet";

  if (msg.startsWith("[CALL:")) {
    try {
      const jsonStr = msg.slice(6, -1);
      const callData = JSON.parse(jsonStr);
      if (callData.type === "missed") {
        return "📵 Missed Call";
      }
      if (callData.type === "voice") {
        const dur = Number(callData.duration) || 0;
        const mins = Math.floor(dur / 60);
        const secs = dur % 60;
        const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        return `📞 Voice Call (${timeStr})`;
      }
    } catch {
      return "📞 Voice Call";
    }
  }

  const cleaned = msg.replace(/^\[REPLY:[\s\S]*?\]\s*/i, "").trim();
  if (cleaned.includes("EXTENSION PAYMENT RECEIPT")) {
    return "🧾 Extension Receipt Settled";
  }
  if (cleaned.includes("PAYMENT RECEIPT") || cleaned.includes("RESERVATION PAYMENT RECEIPT")) {
    return "🧾 Payment Receipt Settled";
  }
  return cleaned || "Replied to a message";
};

interface SwipeableConversationRowProps {
  item: ConversationItem;
  isArchived: boolean;
  onPress: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

function SwipeableConversationRow({
  item,
  isArchived,
  onPress,
  onArchive,
  onRestore,
  onDelete,
}: SwipeableConversationRowProps) {
  const [translateX] = useState(() => new Animated.Value(0));
  const [isOpen, setIsOpen] = useState(false);
  const actionWidth = 148;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 10 && Math.abs(gesture.dy) < 10,
        onPanResponderMove: (_, gesture) => {
          if (gesture.dx < 0) {
            const nextX = isOpen
              ? Math.max(-actionWidth - 20, -actionWidth + gesture.dx)
              : Math.max(-actionWidth - 20, gesture.dx);
            translateX.setValue(nextX);
          } else if (isOpen && gesture.dx > 0) {
            translateX.setValue(Math.min(0, -actionWidth + gesture.dx));
          }
        },
        onPanResponderRelease: (_, gesture) => {
          const shouldOpen = gesture.dx < -45 || (isOpen && gesture.dx < 35);
          Animated.spring(translateX, {
            toValue: shouldOpen ? -actionWidth : 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
          setIsOpen(shouldOpen);
        },
      }),
    [actionWidth, isOpen, translateX],
  );

  const closeSwipe = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    setIsOpen(false);
  };

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.swipeActions}>
        <TouchableOpacity
          style={[styles.swipeAction, styles.archiveAction]}
          onPress={() => {
            closeSwipe();
            (isArchived ? onRestore : onArchive)();
          }}
          activeOpacity={0.85}
        >
          <Ionicons
            name={isArchived ? "arrow-undo-outline" : "archive-outline"}
            size={18}
            color={Colors.white}
          />
          <Text style={styles.swipeActionText}>{isArchived ? "Restore" : "Archive"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.swipeAction, styles.deleteAction]}
          onPress={() => {
            closeSwipe();
            onDelete();
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.white} />
          <Text style={styles.swipeActionText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[styles.chatRowForeground, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity style={styles.chatCard} activeOpacity={0.7} onPress={onPress}>
          <View style={styles.avatarWrapper}>
            {item.profile_photo ? (
              <Image source={{ uri: item.profile_photo }} style={styles.avatarCircle} />
            ) : (
              <View style={styles.avatarCircle}>
                <Ionicons name="business" size={22} color={Colors.dark} />
              </View>
            )}
            {item.unread_count > 0 && <View style={styles.unreadBadge} />}
          </View>

          <View style={styles.chatInfo}>
            <View style={styles.chatHeaderRow}>
              <Text style={styles.businessName} numberOfLines={1}>
                {item.business_name || item.name}
              </Text>
              <Text style={styles.chatTime}>{item.last_time}</Text>
            </View>
            <Text
              style={[
                styles.lastMessage,
                item.unread_count > 0 && { color: Colors.dark, fontFamily: FontFamily.semiBold },
              ]}
              numberOfLines={1}
            >
              {cleanMessagePreview(item.last_message)}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function Chats() {
  const { isGuest } = useAuth();
  const { showSuccess, showError, showModal } = useAppToast();
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] = useState<"inbox" | "archived">("inbox");
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await getConversations();
      setConversations(data);
    } catch (e) {
      console.log("Error loading conversations:", e);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isGuest) {
      loadConversations();
    }
  }, [isGuest, loadConversations]);

  useFocusEffect(
    useCallback(() => {
      if (!isGuest) {
        loadConversations(true);
      }
    }, [isGuest, loadConversations])
  );

  const allOperatorConversations = conversations.filter(
    (conversation) => conversation.role === "operator",
  );
  const operatorConversations = allOperatorConversations.filter(
    (conversation) => Boolean(conversation.archived) === (activeFolder === "archived"),
  );
  const normalizedSearch = search.trim().toLowerCase();
  const filteredChats = operatorConversations.filter(
    (c) =>
      c.name.toLowerCase().includes(normalizedSearch) ||
      (c.business_name && c.business_name.toLowerCase().includes(normalizedSearch))
  );

  const handleOpenChat = (item: ConversationItem) => {
    setConversations((prev) =>
      prev.map((c) => (c.user_id === item.user_id ? { ...c, unread_count: 0 } : c))
    );
    router.push({
      pathname: `/chat/${item.user_id}`,
      params: {
        name: item.business_name || item.name,
      },
    } as any);
  };

  const handleArchiveConversation = async (item: ConversationItem) => {
    try {
      await archiveConversation(item.user_id);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.user_id === item.user_id
            ? { ...conversation, archived: true }
            : conversation,
        ),
      );
      showSuccess("Conversation Archived", "You can find it in Archived.");
    } catch (error: any) {
      showError("Archive Failed", error.response?.data?.message || "Could not archive this conversation.");
    }
  };

  const handleRestoreConversation = async (item: ConversationItem) => {
    try {
      await restoreConversation(item.user_id);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.user_id === item.user_id
            ? { ...conversation, archived: false }
            : conversation,
        ),
      );
      showSuccess("Conversation Restored", "It is back in your inbox.");
    } catch (error: any) {
      showError("Restore Failed", error.response?.data?.message || "Could not restore this conversation.");
    }
  };

  const handleDeleteConversation = (item: ConversationItem) => {
    const name = item.business_name || item.name;
    showModal(
      "Remove Conversation",
      `Remove your conversation with ${name} from your messages? Its history is kept and may return if you message each other again.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteConversation(item.user_id);
              setConversations((current) =>
                current.filter((conversation) => conversation.user_id !== item.user_id),
              );
              showSuccess("Conversation Removed", "The message history was kept.");
            } catch (error: any) {
              showError("Delete Failed", error.response?.data?.message || "Could not remove this conversation.");
            }
          },
        },
      ],
      "confirm",
    );
  };

  if (isGuest) {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Messages</Text>
            <Text style={styles.subtitle}>Direct host & operator communications</Text>
          </View>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Direct Host Messaging</Text>
            <Text style={styles.emptySubtitle}>
              Sign in to chat directly with verified operators and car rental hosts.
            </Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.subtitle}>Direct host & operator communications</Text>
        </View>

        {allOperatorConversations.length > 0 && (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.secondary} />
            <TextInput
              placeholder="Search operators..."
              placeholderTextColor={Colors.secondary}
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />
          </View>
        )}

        {allOperatorConversations.length > 0 && (
          <View style={styles.folderTabs}>
            {([
              ["inbox", "Inbox"],
              ["archived", "Archived"],
            ] as const).map(([folder, label]) => (
              <TouchableOpacity
                key={folder}
                style={[styles.folderTab, activeFolder === folder && styles.folderTabActive]}
                onPress={() => setActiveFolder(folder)}
                activeOpacity={0.8}
              >
                <Text style={[styles.folderTabText, activeFolder === folder && styles.folderTabTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {allOperatorConversations.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Conversations Yet</Text>
            <Text style={styles.emptySubtitle}>
              Contact a vehicle operator or send an inquiry, and your conversations will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredChats}
            keyExtractor={(item) => String(item.user_id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadConversations();
                }}
                colors={[Colors.primary]}
                />
            }
            renderItem={({ item }) => (
                <SwipeableConversationRow
                  item={item}
                  isArchived={activeFolder === "archived"}
                  onPress={() => handleOpenChat(item)}
                  onArchive={() => handleArchiveConversation(item)}
                  onRestore={() => handleRestoreConversation(item)}
                  onDelete={() => handleDeleteConversation(item)}
                />
            )}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>
                    {normalizedSearch
                      ? "No Operators Found"
                      : activeFolder === "archived"
                        ? "No Archived Conversations"
                        : "No Conversations in Inbox"}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {normalizedSearch
                      ? `No conversations match “${search.trim()}”.`
                      : activeFolder === "archived"
                        ? "Conversations you archive will appear here."
                        : "Your archived conversations are still available in Archived."}
                  </Text>
                </View>
            }
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
    color: Colors.dark,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondary,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBackground,
    borderRadius: 24,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  folderTabs: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  folderTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: Colors.inputBackground,
  },
  folderTabActive: {
    backgroundColor: Colors.dark,
  },
  folderTabText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.dark,
  },
  folderTabTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.dark,
  },
  listContent: {
    paddingBottom: 20,
  },
  swipeContainer: {
    overflow: "hidden",
    backgroundColor: Colors.white,
  },
  swipeActions: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 148,
    flexDirection: "row",
  },
  swipeAction: {
    width: 74,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  archiveAction: {
    backgroundColor: Colors.dark,
  },
  deleteAction: {
    backgroundColor: "#C62828",
  },
  swipeActionText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: Colors.white,
  },
  chatRowForeground: {
    backgroundColor: Colors.white,
  },
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.md,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.logoBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  businessName: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.dark,
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
  },
  lastMessage: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    marginTop: 4,
  },
  guestContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 32,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  searchEmptyContainer: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 32,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: Colors.dark,
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: 8,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: Spacing.sm,
  },
  exploreButton: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: 24,
  },
  exploreButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  signInButton: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: 24,
  },
  signInText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
});
