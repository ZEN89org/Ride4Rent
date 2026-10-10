import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBottomSheet } from "@/components/common/AppBottomSheet";
import { Skeleton } from "@/components/common/Skeleton";
import { Colors } from "@/constants/colors";
import { FontFamily, Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useNotificationCount } from "@/context/NotificationContext";
import { useAppToast } from "@/context/ToastContext";
import {
  AppNotification,
  clearAllNotifications,
  deleteNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/services/notificationService";
import { testPushNotification } from "@/services/deviceNotificationService";

interface GroupedNotifications {
  title: string;
  data: AppNotification[];
}

interface SwipeableNotificationItemProps {
  item: AppNotification;
  isLast: boolean;
  isArchived?: boolean;
  onPress: () => void;
  onArchive: () => void;
  onDelete: () => void;
  iconCfg: {
    icon: React.ReactNode;
    bgColor: string;
    borderColor: string;
  };
}

function simplifyNotificationText(text?: string | null): string {
  if (!text) return "";
  // Strip parentheses and anything inside them e.g. "(...)"
  let cleaned = text.replace(/\s*\([^)]*\)/g, "");
  // Strip trailing colons or commas
  cleaned = cleaned.replace(/[:,-]\s*$/, "");
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

function SwipeableNotificationItem({
  item,
  isLast,
  isArchived = false,
  onPress,
  onArchive,
  onDelete,
  iconCfg,
}: SwipeableNotificationItemProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const SWIPE_WIDTH = -140;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          // Swiping left
          const newX = isOpen.current
            ? Math.max(SWIPE_WIDTH - 25, SWIPE_WIDTH + gestureState.dx)
            : Math.max(SWIPE_WIDTH - 25, gestureState.dx);
          translateX.setValue(newX);
        } else if (isOpen.current && gestureState.dx > 0) {
          // Swiping back right from open state
          const newX = Math.min(0, SWIPE_WIDTH + gestureState.dx);
          translateX.setValue(newX);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -45 || (isOpen.current && gestureState.dx < 35)) {
          // Snap open to reveal Archive and Delete buttons
          Animated.spring(translateX, {
            toValue: SWIPE_WIDTH,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
          isOpen.current = true;
        } else {
          // Snap closed
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
          isOpen.current = false;
        }
      },
    })
  ).current;

  const closeSwipe = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
    isOpen.current = false;
  };

  const cleanTitle = simplifyNotificationText(item.title);
  const cleanMessage = simplifyNotificationText(item.message);

  return (
    <View style={styles.swipeContainer}>
      {/* Hidden Archive & Delete Actions behind the swipe */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.archiveActionBtn}
          onPress={() => {
            closeSwipe();
            onArchive();
          }}
          activeOpacity={0.85}
        >
          <Ionicons
            name={isArchived ? "arrow-undo-outline" : "archive-outline"}
            size={18}
            color={Colors.white}
          />
          <Text style={[styles.actionText, { color: Colors.white }]}>
            {isArchived ? "Restore" : "Archive"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteActionBtn}
          onPress={() => {
            closeSwipe();
            onDelete();
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.white} />
          <Text style={[styles.actionText, { color: Colors.white }]}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Front Visible Row Item */}
      <Animated.View
        style={[
          styles.rowItem,
          !isLast && styles.rowDivider,
          { transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.rowInnerTouch}
          onPress={() => {
            if (isOpen.current) {
              closeSwipe();
            } else {
              onPress();
            }
          }}
          activeOpacity={0.8}
        >
          {/* Left Clean Rounded Icon Box */}
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: iconCfg.bgColor,
                borderColor: iconCfg.borderColor,
              },
            ]}
          >
            {iconCfg.icon}
          </View>

          {/* Middle Single-Line Structured Content */}
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.itemTitle,
                  !item.is_read && styles.itemTitleUnread,
                ]}
                numberOfLines={1}
              >
                {cleanTitle}
              </Text>
              <Text style={styles.timeText}>{item.time}</Text>
            </View>

            {/* Clean Subtitle / Status Text */}
            <Text style={styles.itemMessage} numberOfLines={1}>
              {cleanMessage}
            </Text>
          </View>

          {/* Right Indicator for Unread */}
          {!item.is_read && (
            <View style={styles.unreadIndicator}>
              <View style={styles.unreadPill}>
                <Text style={styles.unreadPillText}>1</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const EXCLUDED_NOTIFICATION_TITLES = new Set([
  "welcome back",
  "copied",
  "test alert sent",
  "invalid number",
  "daily rate required",
  "photos required",
  "upload failed",
  "message error",
  "success",
  "deleted",
  "payment setup saved",
  "hello!",
]);

function isPriorityNotification(notif: AppNotification): boolean {
  if (!notif || !notif.title) return false;
  const lower = notif.title.trim().toLowerCase();
  if (EXCLUDED_NOTIFICATION_TITLES.has(lower)) return false;
  if (
    lower.startsWith("logged in") ||
    lower.startsWith("logged out") ||
    lower.startsWith("signed in") ||
    lower.startsWith("signed out") ||
    lower.startsWith("login") ||
    lower.startsWith("logout")
  ) {
    return false;
  }
  return true;
}

export default function NotificationsScreen() {
  const { user, isGuest, refreshUser } = useAuth();
  const { refreshUnreadCount, resetUnreadCount, decrementUnreadCount } = useNotificationCount();
  const { showModal, showSuccess, showInfo } = useAppToast();
  const [notificationTab, setNotificationTab] = useState<"inbox" | "archived">("inbox");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [archivedNotifications, setArchivedNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [optionsMenuVisible, setOptionsMenuVisible] = useState(false);

  useEffect(() => {
    if (!isGuest) {
      loadNotifications();
    }
  }, [isGuest]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [data] = await Promise.all([
        getNotifications(),
        refreshUser?.().catch(() => null),
      ]);
      const validList = Array.isArray(data) ? data.filter(isPriorityNotification) : [];
      setNotifications(validList);
      refreshUnreadCount();
    } catch (e) {
      console.log("Error loading notifications:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMarkAllRead = async () => {
    setOptionsMenuVisible(false);
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      resetUnreadCount();
      showSuccess("Notifications", "All marked as read.");
    } catch (e) {
      console.log("Error marking all notifications read:", e);
    }
  };

  const handleClearAll = () => {
    setOptionsMenuVisible(false);
    showModal(
      "Clear Notifications",
      "Are you sure you want to remove all notifications?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllNotifications();
              setNotifications([]);
              resetUnreadCount();
              showSuccess("Notifications", "All notifications cleared.");
            } catch (e) {
              console.log("Error clearing notifications:", e);
            }
          },
        },
      ],
      "confirm"
    );
  };

  const handleDeleteOne = async (id: string) => {
    try {
      const target = (notificationTab === "inbox" ? notifications : archivedNotifications).find((n) => n.id === id);
      await deleteNotification(id);
      if (notificationTab === "inbox") {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      } else {
        setArchivedNotifications((prev) => prev.filter((n) => n.id !== id));
      }
      if (target && !target.is_read) {
        decrementUnreadCount(1);
      }
      showInfo("Deleted", "Notification removed.");
    } catch (e) {
      console.log("Error deleting notification:", e);
    }
  };

  const handleArchiveOne = async (item: AppNotification) => {
    try {
      if (!item.is_read) {
        markNotificationAsRead(item.id).catch(() => {});
        decrementUnreadCount(1);
      }
      setNotifications((prev) => prev.filter((n) => n.id !== item.id));
      setArchivedNotifications((prev) => [item, ...prev.filter((n) => n.id !== item.id)]);
      showSuccess("Archived", "Notification moved to archive.");
    } catch (e) {
      console.log("Error archiving notification:", e);
    }
  };

  const handleUnarchiveOne = (item: AppNotification) => {
    setArchivedNotifications((prev) => prev.filter((n) => n.id !== item.id));
    setNotifications((prev) => [item, ...prev]);
    showSuccess("Restored", "Notification restored to Inbox.");
  };

  const handleNotificationPress = async (item: AppNotification) => {
    if (!item.is_read) {
      markNotificationAsRead(item.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      decrementUnreadCount(1);
    }

    // Refresh user profile before navigation so account standing is updated in real time
    try {
      await refreshUser?.();
    } catch {}

    const isOperator = user?.role === "operator";
    let targetUrl = item.action_url;

    // Fix redirection: operator notifications pointing to /profile or /operator/profile must go to /operator-profile
    if (isOperator) {
      if (
        !targetUrl ||
        targetUrl === "/profile" ||
        targetUrl === "/operator/profile" ||
        targetUrl.startsWith("/operator/")
      ) {
        targetUrl = "/operator-profile";
      }
    }

    if (
      isOperator &&
      (item.title?.toLowerCase().includes("operator") ||
        item.message?.toLowerCase().includes("operator"))
    ) {
      targetUrl = "/operator-profile";
    }

    if (targetUrl) {
      router.push(targetUrl as any);
      return;
    }

    // Role-aware fallback navigation
    if (item.type === "booking") {
      router.push(isOperator ? ("/operator-bookings" as any) : ("/(tabs)/bookings" as any));
    } else if (item.type === "chat") {
      router.push(isOperator ? ("/operator-chats" as any) : ("/(tabs)/chats" as any));
    } else {
      router.push(isOperator ? ("/operator-profile" as any) : ("/(tabs)/home" as any));
    }
  };

  const unreadCountLocal = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  // Current active list depending on selected tab
  const activeList = notificationTab === "inbox" ? notifications : archivedNotifications;

  // Group notifications by date (Today, Yesterday, Earlier)
  const groupedNotifications = useMemo<GroupedNotifications[]>(() => {
    if (!activeList || activeList.length === 0) return [];

    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const todayItems: AppNotification[] = [];
    const yesterdayItems: AppNotification[] = [];
    const earlierItems: AppNotification[] = [];

    activeList.forEach((item) => {
      const date = item.created_at ? new Date(item.created_at) : new Date();
      const dateStr = date.toDateString();

      if (dateStr === todayStr) {
        todayItems.push(item);
      } else if (dateStr === yesterdayStr) {
        yesterdayItems.push(item);
      } else {
        earlierItems.push(item);
      }
    });

    const groups: GroupedNotifications[] = [];
    if (todayItems.length > 0) groups.push({ title: "Today", data: todayItems });
    if (yesterdayItems.length > 0) groups.push({ title: "Yesterday", data: yesterdayItems });
    if (earlierItems.length > 0) groups.push({ title: "Earlier", data: earlierItems });

    return groups;
  }, [activeList]);

  const getIconConfig = (type: string, isRead: boolean) => {
    switch (type) {
      case "booking":
        return {
          icon: <MaterialCommunityIcons name="car-key" size={22} color="#1A1A1A" />,
          bgColor: Colors.logoBackground,
          borderColor: "#FDE68A",
        };
      case "success":
        return {
          icon: <Ionicons name="checkmark-circle-outline" size={22} color="#10B981" />,
          bgColor: "#ECFDF5",
          borderColor: "#A7F3D0",
        };
      case "warning":
        return {
          icon: <Ionicons name="alert-circle-outline" size={22} color="#F59E0B" />,
          bgColor: "#FFFBEB",
          borderColor: "#FDE68A",
        };
      case "error":
        return {
          icon: <Ionicons name="close-circle-outline" size={22} color={Colors.error} />,
          bgColor: "#FEF2F2",
          borderColor: "#FECACA",
        };
      case "chat":
        return {
          icon: <Ionicons name="chatbubble-ellipses-outline" size={21} color="#1A1A1A" />,
          bgColor: Colors.logoBackground,
          borderColor: "#FDE68A",
        };
      default:
        return {
          icon: <Ionicons name="notifications-outline" size={21} color="#1A1A1A" />,
          bgColor: "#F3F4F6",
          borderColor: "#E5E7EB",
        };
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      {/* Sleek Minimal Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={Colors.dark} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notifications</Text>

        <View style={styles.headerActions}>
          {activeList.length > 0 ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setOptionsMenuVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="ellipsis-vertical" size={19} color={Colors.dark} />
            </TouchableOpacity>
          ) : (
            <View style={styles.actionBtn} />
          )}
        </View>
      </View>

      {/* Inbox / Archived Tab Toggle Pill Bar */}
      <View style={styles.tabToggleBar}>
        <TouchableOpacity
          style={[styles.tabToggleItem, notificationTab === "inbox" && styles.tabToggleItemActive]}
          onPress={() => setNotificationTab("inbox")}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabToggleText, notificationTab === "inbox" && styles.tabToggleTextActive]}>
            Inbox {notifications.length > 0 ? `(${notifications.length})` : ""}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabToggleItem, notificationTab === "archived" && styles.tabToggleItemActive]}
          onPress={() => setNotificationTab("archived")}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabToggleText, notificationTab === "archived" && styles.tabToggleTextActive]}>
            Archived {archivedNotifications.length > 0 ? `(${archivedNotifications.length})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={{ padding: Spacing.md, gap: 14 }}>
          <Skeleton height={68} borderRadius={16} />
          <Skeleton height={68} borderRadius={16} />
          <Skeleton height={68} borderRadius={16} />
          <Skeleton height={68} borderRadius={16} />
        </View>
      ) : activeList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons
              name={notificationTab === "inbox" ? "notifications-outline" : "archive-outline"}
              size={34}
              color={Colors.secondary}
            />
          </View>
          <Text style={styles.emptyTitle}>
            {notificationTab === "inbox" ? "No notifications" : "No archived notifications"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {notificationTab === "inbox"
              ? "When you receive booking updates, approvals, or messages, they will appear here."
              : "Notifications you swipe and archive will be saved here."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedNotifications}
          keyExtractor={(item) => item.title}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadNotifications();
              }}
              colors={[Colors.primary]}
            />
          }
          renderItem={({ item: group }) => (
            <View style={styles.groupContainer}>
              {/* Group Section Date Header */}
              <Text style={styles.groupHeaderTitle}>{group.title}</Text>

              {/* Clean Row Items with Swipe Actions */}
              <View style={styles.itemsWrapper}>
                {group.data.map((item, index) => {
                  const iconCfg = getIconConfig(item.type, item.is_read);
                  const isLast = index === group.data.length - 1;

                  return (
                    <SwipeableNotificationItem
                      key={item.id}
                      item={item}
                      isLast={isLast}
                      isArchived={notificationTab === "archived"}
                      iconCfg={iconCfg}
                      onPress={() => handleNotificationPress(item)}
                      onArchive={() =>
                        notificationTab === "archived"
                          ? handleUnarchiveOne(item)
                          : handleArchiveOne(item)
                      }
                      onDelete={() => handleDeleteOne(item.id)}
                    />
                  );
                })}
              </View>
            </View>
          )}
        />
      )}

      {/* Options Menu Bottom Sheet */}
      <AppBottomSheet
        visible={optionsMenuVisible}
        onClose={() => setOptionsMenuVisible(false)}
        title="Notification Options"
      >
        <View style={{ paddingBottom: Spacing.sm }}>
          {notificationTab === "inbox" && unreadCountLocal > 0 && (
            <TouchableOpacity
              style={styles.menuOptionItem}
              onPress={handleMarkAllRead}
              activeOpacity={0.7}
            >
              <View style={[styles.menuOptionIconBox, { backgroundColor: "#ECFDF5" }]}>
                <Ionicons name="checkmark-done" size={20} color="#10B981" />
              </View>
              <View style={styles.menuOptionTextBox}>
                <Text style={styles.menuOptionTitle}>Mark all as read</Text>
                <Text style={styles.menuOptionSubtitle}>Mark all unread notifications</Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.menuOptionItem}
            onPress={handleClearAll}
            activeOpacity={0.7}
          >
            <View style={[styles.menuOptionIconBox, { backgroundColor: "#FEF2F2" }]}>
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </View>
            <View style={styles.menuOptionTextBox}>
              <Text style={[styles.menuOptionTitle, { color: Colors.error }]}>Clear all</Text>
              <Text style={styles.menuOptionSubtitle}>Remove notifications from list</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setOptionsMenuVisible(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </AppBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EFEFEF",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
    textAlign: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  tabToggleBar: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    marginHorizontal: Spacing.md,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 12,
    padding: 3,
  },
  tabToggleItem: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  tabToggleItemActive: {
    backgroundColor: Colors.primary,
  },
  tabToggleText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.secondary,
  },
  tabToggleTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingTop: 8,
    paddingBottom: 40,
  },
  groupContainer: {
    marginTop: 16,
  },
  groupHeaderTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.secondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  itemsWrapper: {
    backgroundColor: Colors.white,
  },
  swipeContainer: {
    position: "relative",
    overflow: "hidden",
  },
  actionsContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 140,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  archiveActionBtn: {
    width: 70,
    height: "100%",
    backgroundColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
  },
  deleteActionBtn: {
    width: 70,
    height: "100%",
    backgroundColor: Colors.error,
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
  },
  actionText: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: Colors.dark,
  },
  rowItem: {
    backgroundColor: Colors.white,
  },
  rowInnerTouch: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 14,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F1F1F1",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 13.5,
    color: "#2B2B2B",
    flex: 1,
    marginRight: 8,
  },
  itemTitleUnread: {
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  timeText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
  },
  itemMessage: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 3,
  },
  unreadIndicator: {
    paddingLeft: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadPill: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.dark,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
    marginBottom: 16,
  },
  menuOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 14,
  },
  menuOptionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  menuOptionTextBox: {
    flex: 1,
  },
  menuOptionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  menuOptionSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
});
