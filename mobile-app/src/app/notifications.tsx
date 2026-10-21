import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import { Animated, FlatList, PanResponder, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBottomSheet } from "@/components/common/AppBottomSheet";
import { Skeleton } from "@/components/common/Skeleton";
import { groupNotifications } from "@/utils/groupNotifications";
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

function cleanRawJsonInText(text?: string | null): string {
  if (!text) return "";
  let cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (cleaned.includes("{") && cleaned.includes("}")) {
    cleaned = cleaned.replace(/\{[^{}]*?["']?name["']?\s*:\s*["']?([^"',{}]+)["']?[^{}]*?\}/gi, "$1");
    cleaned = cleaned.replace(/\{[^{}]*\}/g, "").trim();
  }
  // Deduplicate consecutive identical words like "Honda Honda" -> "Honda"
  while (/\b(\w+)\s+\1\b/i.test(cleaned)) {
    cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, "$1");
  }
  return cleaned.replace(/\s{2,}/g, " ").trim();
}

function formatConciseNotification(
  rawTitle?: string | null,
  rawMessage?: string | null,
): { title: string; message: string } {
  let trimmedTitle = cleanRawJsonInText(rawTitle);
  const trimmedMsg = cleanRawJsonInText(rawMessage);

  // If title is missing or blank, infer appropriate header from message
  if (!trimmedTitle) {
    const lowerM = trimmedMsg.toLowerCase();
    if (lowerM.includes("don't miss your trip") || lowerM.includes("upcoming trip")) {
      trimmedTitle = "Upcoming Trip Reminder";
    } else if (lowerM.includes("don't miss your ride")) {
      trimmedTitle = "Don't Miss Your Ride!";
    } else if (lowerM.includes("complete your reservation")) {
      trimmedTitle = "Complete Your Reservation";
    } else if (lowerM.includes("still interested in")) {
      trimmedTitle = "Still Interested in Your Ride?";
    } else if (lowerM.includes("expiring soon")) {
      trimmedTitle = "Reservation Expiring Soon";
    } else {
      trimmedTitle = "Notification";
    }
  }

  const rawLowerT = trimmedTitle.toLowerCase();

  // Preserve personalized pending booking & upcoming trip reminder notifications intact
  if (
    rawLowerT.includes("don't miss your ride") ||
    rawLowerT.includes("complete your reservation") ||
    rawLowerT.includes("still interested in") ||
    rawLowerT.includes("reservation expiring soon") ||
    rawLowerT.includes("upcoming trip reminder")
  ) {
    return {
      title: trimmedTitle,
      message: trimmedMsg,
    };
  }

  const clean = (str?: string | null) =>
    (str || "")
      .replace(/\s*\([^)]*\)/g, "")
      .replace(/[:,-]\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();

  const t = clean(trimmedTitle);
  const m = clean(trimmedMsg);
  const lowerT = t.toLowerCase();
  const lowerM = m.toLowerCase();

  if (lowerT.includes("new booking")) {
    return {
      title: "New Booking Request",
      message: "New reservation request received.",
    };
  }
  if (
    lowerT.includes("payment submitted") ||
    lowerT.includes("gcash reservation paid")
  ) {
    return {
      title: "Payment Submitted",
      message: "Renter submitted reservation payment for verification.",
    };
  }
  if (
    lowerT.includes("reservation payment received") ||
    lowerT.includes("payment received")
  ) {
    return {
      title: "Payment Received",
      message: "Your reservation payment was received. Awaiting host approval.",
    };
  }
  if (
    lowerT.includes("payment confirmed") ||
    lowerT.includes("booking approved")
  ) {
    return {
      title: "Booking Approved",
      message: "Your booking has been approved by the host.",
    };
  }
  if (lowerT.includes("trip started")) {
    return {
      title: "Trip Started",
      message: "Your rental trip has started.",
    };
  }
  if (lowerT.includes("trip completed")) {
    return {
      title: "Trip Completed",
      message: "Your rental trip has been completed.",
    };
  }
  if (lowerT.includes("renter arrived")) {
    return {
      title: "Renter Arrived",
      message: "Renter arrived for pickup.",
    };
  }
  if (lowerT.includes("vehicle returned")) {
    return {
      title: "Vehicle Returned",
      message: "Vehicle returned for inspection.",
    };
  }
  if (lowerT.includes("vehicle unavailable")) {
    return {
      title: "Vehicle Unavailable",
      message: "This vehicle is no longer available.",
    };
  }
  if (lowerT.includes("no-show") || lowerM.includes("no-show")) {
    if (lowerT.includes("closed")) {
      return {
        title: "Booking Closed",
        message: "Booking closed as no-show.",
      };
    }
    return {
      title: "Marked as No-Show",
      message: "Your booking was marked as no-show.",
    };
  }
  if (lowerT.includes("refund required")) {
    return {
      title: "Refund Required",
      message:
        "Please process the reservation refund for the cancelled booking.",
    };
  }
  if (lowerT.includes("refund completed")) {
    return {
      title: "Refund Completed",
      message: "Your reservation refund has been processed.",
    };
  }
  if (lowerT.includes("auto-cancelled") || lowerT.includes("booking expired")) {
    if (lowerM.includes("refund")) {
      return {
        title: "Booking Expired",
        message: "Host did not confirm in time. Your refund is pending.",
      };
    }
    return {
      title: "Booking Expired",
      message: "Your booking expired due to unpaid reservation fee.",
    };
  }
  if (lowerT.includes("booking cancelled")) {
    return {
      title: "Booking Cancelled",
      message: lowerM.includes("refund")
        ? "Your booking was cancelled. Refund is pending."
        : "Reservation was cancelled.",
    };
  }
  if (lowerT.includes("booking declined")) {
    return {
      title: "Booking Declined",
      message: lowerM.includes("refund")
        ? "Your booking was declined. Refund is pending."
        : "Reservation was declined.",
    };
  }
  if (lowerT.includes("extension requested")) {
    return {
      title: "Extension Requested",
      message: "A renter requested a trip extension. Please review.",
    };
  }
  if (lowerT.includes("extension submitted")) {
    return {
      title: "Extension Submitted",
      message: "Your trip extension request was sent to the host.",
    };
  }
  if (
    lowerT.includes("extension agreed") ||
    lowerT.includes("extension approved")
  ) {
    if (lowerM.includes("you agreed")) {
      return {
        title: "Extension Approved",
        message: "Extension approved. Awaiting renter payment.",
      };
    }
    return {
      title: "Extension Approved",
      message:
        "Your extension request was approved. Please settle the payment.",
    };
  }
  if (lowerT.includes("extension declined")) {
    return {
      title: "Extension Declined",
      message: "Your trip extension request was declined by the host.",
    };
  }
  if (
    lowerT.includes("extension payment settled") ||
    lowerT.includes("extension paid")
  ) {
    return {
      title: "Extension Paid",
      message: "Renter paid the trip extension fee.",
    };
  }
  if (lowerT.includes("extension confirmed")) {
    return {
      title: "Extension Confirmed",
      message: "Your trip extension is confirmed.",
    };
  }
  if (lowerT.includes("license uploaded")) {
    return {
      title: "License Uploaded",
      message: "Your driver's license was uploaded for verification.",
    };
  }
  if (lowerT.includes("license approved")) {
    return {
      title: "Driver's License Approved",
      message: "Your driver's license has been verified.",
    };
  }
  if (lowerT.includes("license") && lowerT.includes("rejected")) {
    return {
      title: "Driver's License Rejected",
      message:
        "Your driver's license was not approved. Please upload a clear photo.",
    };
  }
  if (lowerT.includes("operator account approved")) {
    return {
      title: "Operator Account Approved",
      message: "Your operator account has been verified and activated.",
    };
  }
  if (lowerT.includes("operator application rejected")) {
    return {
      title: "Operator Application Rejected",
      message: "Your operator application was not approved.",
    };
  }
  if (lowerT.includes("account suspended")) {
    return {
      title: "Account Suspended",
      message: "Your account has been suspended by the administrator.",
    };
  }
  if (lowerT.includes("account reactivated")) {
    return {
      title: "Account Reactivated",
      message: "Your account has been restored to active status.",
    };
  }

  return { title: t, message: m };
}

function createNotificationSwipe(translateX: Animated.Value) {
  const SWIPE_WIDTH = -140;

  let isOpen = false;
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dx < 0) {
        // Swiping left
        const newX = isOpen
          ? Math.max(SWIPE_WIDTH - 25, SWIPE_WIDTH + gestureState.dx)
          : Math.max(SWIPE_WIDTH - 25, gestureState.dx);
        translateX.setValue(newX);
      } else if (isOpen && gestureState.dx > 0) {
        // Swiping back right from open state
        const newX = Math.min(0, SWIPE_WIDTH + gestureState.dx);
        translateX.setValue(newX);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx < -45 || (isOpen && gestureState.dx < 35)) {
        // Snap open to reveal Archive and Delete buttons
        Animated.spring(translateX, {
          toValue: SWIPE_WIDTH,
          useNativeDriver: true,
          bounciness: 4,
        }).start();
        isOpen = true;
      } else {
        // Snap closed
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }).start();
        isOpen = false;
      }
    },
  });

  const closeSwipe = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
    isOpen = false;
  };

  return { panResponder, closeSwipe, isSwipeOpen: () => isOpen };
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
  const translateX = useState(() => new Animated.Value(0))[0];

  const { panResponder, closeSwipe, isSwipeOpen } = useMemo(
    () => createNotificationSwipe(translateX),
    [translateX],
  );

  const { title: cleanTitle, message: cleanMessage } =
    formatConciseNotification(item.title, item.message);

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
          <Text style={[styles.actionText, { color: Colors.white }]}>
            Delete
          </Text>
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
            if (isSwipeOpen()) {
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

          {/* Middle Full Content (No Ellipsis Truncation) */}
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.itemTitle,
                  !item.is_read && styles.itemTitleUnread,
                ]}
              >
                {cleanTitle}
              </Text>
              {(item.group_count || 0) > 1 && <Text style={{ fontFamily: FontFamily.semiBold, marginRight: 8 }}>({item.group_count})</Text>}
              <Text style={styles.timeText}>{item.time}</Text>
            </View>

            {/* Full Subtitle / Status Text */}
            <Text style={styles.itemMessage} numberOfLines={2}>{cleanMessage}</Text>
          </View>

          {!item.is_read && <View style={styles.unreadIndicator}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary }} /></View>}
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
  if (/expo\.modules|TaskManager|Call to function|SQLSTATE|Stack trace|node_modules/i.test(notif.message || "")) return false;
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
  const { refreshUnreadCount, resetUnreadCount, decrementUnreadCount } =
    useNotificationCount();
  const { showModal, showSuccess, showInfo } = useAppToast();
  const archiveKey = `@ride4rent_archived_notifications:${user?.id || "guest"}`;
  const [notificationTab, setNotificationTab] = useState<"inbox" | "archived">(
    "inbox",
  );
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [archivedNotifications, setArchivedNotifications] = useState<
    AppNotification[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedNotificationGroup, setSelectedNotificationGroup] = useState<AppNotification[] | null>(null);
  const [optionsMenuVisible, setOptionsMenuVisible] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [data] = await Promise.all([
        getNotifications(),
        refreshUser?.().catch(() => null),
      ]);
      const validList = Array.isArray(data)
        ? data.filter(isPriorityNotification)
        : [];
      const archivedIds = new Set<string>(JSON.parse(await AsyncStorage.getItem(archiveKey) || "[]"));
      setNotifications(validList.filter((n) => !archivedIds.has(n.id)));
      setArchivedNotifications(validList.filter((n) => archivedIds.has(n.id)));
      refreshUnreadCount();
    } catch (e) {
      console.log("Error loading notifications:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isGuest) return;
    let active = true;
    getNotifications()
      .then(async (data) => {
        const archivedIds = new Set<string>(JSON.parse(await AsyncStorage.getItem(archiveKey) || "[]"));
        if (!active) return;
        const valid = Array.isArray(data) ? data.filter(isPriorityNotification) : [];
        setNotifications(valid.filter((n) => !archivedIds.has(n.id)));
        setArchivedNotifications(valid.filter((n) => archivedIds.has(n.id)));
      })
      .catch((error) => console.log("Error loading notifications:", error))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isGuest, archiveKey]);

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
              await AsyncStorage.removeItem(archiveKey);
              setArchivedNotifications([]);
              setNotifications([]);
              resetUnreadCount();
              showSuccess("Notifications", "All notifications cleared.");
            } catch (e) {
              console.log("Error clearing notifications:", e);
            }
          },
        },
      ],
      "confirm",
    );
  };

  const handleDeleteOne = async (id: string) => {
    try {
      const target = (
        notificationTab === "inbox" ? notifications : archivedNotifications
      ).find((n) => n.id === id);
      const grouped = activeList.find((item) => item.id === id);
      const ids = grouped?.group_ids || [id];
      await Promise.all(ids.map(deleteNotification));
      if (notificationTab === "inbox") {
        setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
      } else {
        setArchivedNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
      }
      decrementUnreadCount((notificationTab === "inbox" ? notifications : archivedNotifications).filter((n) => ids.includes(n.id) && !n.is_read).length);
      showInfo("Deleted", "Notification removed.");
    } catch (e) {
      console.log("Error deleting notification:", e);
    }
  };

  const handleArchiveOne = async (item: AppNotification) => {
    const ids = item.group_ids || [item.id];
    const members = notifications.filter((n) => ids.includes(n.id));
    try {
      await Promise.all(members.filter((n) => !n.is_read).map((n) => markNotificationAsRead(n.id)));
      decrementUnreadCount(members.filter((n) => !n.is_read).length);
      const storedIds: string[] = JSON.parse(await AsyncStorage.getItem(archiveKey) || "[]");
      await AsyncStorage.setItem(archiveKey, JSON.stringify([...new Set([...storedIds, ...ids])]));
      setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
      setArchivedNotifications((prev) => [...members.map((n) => ({ ...n, is_read: true })), ...prev.filter((n) => !ids.includes(n.id))]);
      showSuccess("Archived", "Notifications moved to archive.");
    } catch (error) { console.error("Could not archive notifications:", error); }
  };
  const handleUnarchiveOne = async (item: AppNotification) => {
    const ids = item.group_ids || [item.id];
    const members = archivedNotifications.filter((n) => ids.includes(n.id));
    const storedIds: string[] = JSON.parse(await AsyncStorage.getItem(archiveKey) || "[]");
    await AsyncStorage.setItem(archiveKey, JSON.stringify(storedIds.filter((id) => !ids.includes(id))));
    setArchivedNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
    setNotifications((prev) => [...members, ...prev.filter((n) => !ids.includes(n.id))]);
  };

  const handleNotificationPress = async (item: AppNotification) => {
    const members = (notificationTab === "inbox" ? notifications : archivedNotifications).filter((entry) => (item.group_ids || [item.id]).includes(entry.id));
    if (new Set(members.map((entry) => entry.action_url)).size > 1) {
      setSelectedNotificationGroup(members);
      return;
    }
    if (!item.is_read) {
      const ids = item.group_ids || [item.id];
      try { await Promise.all(ids.map(markNotificationAsRead)); } catch (error) { console.warn("Could not mark notifications read:", error); void refreshUnreadCount(); return; }
      const unread = notifications.filter((n) => ids.includes(n.id) && !n.is_read).length;
      setNotifications((prev) => prev.map((n) => ids.includes(n.id) ? { ...n, is_read: true } : n));
      decrementUnreadCount(unread);
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
      if (targetUrl.startsWith("/(tabs)")) {
        router.navigate(targetUrl as any);
      } else {
        router.push(targetUrl as any);
      }
      return;
    }

    // Role-aware fallback navigation
    if (item.type === "booking") {
      if (isOperator) {
        router.push("/operator-bookings" as any);
      } else {
        router.navigate("/(tabs)/bookings" as any);
      }
    } else if (item.type === "chat") {
      if (isOperator) {
        router.push("/operator-chats" as any);
      } else {
        router.navigate("/(tabs)/chats" as any);
      }
    } else {
      if (isOperator) {
        router.push("/operator-profile" as any);
      } else {
        router.navigate("/(tabs)/home" as any);
      }
    }
  };

  const unreadCountLocal = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  // Current active list depending on selected tab
  const activeList = groupNotifications((notificationTab === "inbox" ? notifications : archivedNotifications).filter((n) => !unreadOnly || !n.is_read));

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
    if (todayItems.length > 0)
      groups.push({ title: "Today", data: todayItems });
    if (yesterdayItems.length > 0)
      groups.push({ title: "Yesterday", data: yesterdayItems });
    if (earlierItems.length > 0)
      groups.push({ title: "Earlier", data: earlierItems });

    return groups;
  }, [activeList]);

  const getIconConfig = (type: string, isRead: boolean, title = "") => {
    const lower = title.toLowerCase().replace(/[’‘]/g, "'");
    const eventStyle: {
      icon: React.ComponentProps<typeof Ionicons>["name"];
      color: string;
      bgColor: string;
      borderColor: string;
    } | null = /don'?t miss your ride/.test(lower)
      ? { icon: "alarm-outline", color: "#B45309", bgColor: "#FFFBEB", borderColor: "#FDE68A" }
      : lower.includes("trip started")
        ? { icon: "navigate-outline", color: "#0369A1", bgColor: "#F0F9FF", borderColor: "#BAE6FD" }
        : lower.includes("booking approved")
          ? { icon: "checkmark-done-circle-outline", color: "#047857", bgColor: "#ECFDF5", borderColor: "#A7F3D0" }
          : /upcom+ing trip|upcoming trip|don't miss your trip/.test(lower)
            ? { icon: "calendar-outline", color: "#6D28D9", bgColor: "#F5F3FF", borderColor: "#DDD6FE" }
            : lower.includes("still interested")
              ? { icon: "heart-outline", color: "#BE185D", bgColor: "#FDF2F8", borderColor: "#FBCFE8" }
              : null;
    if (eventStyle) return {
      icon: <Ionicons name={eventStyle.icon} size={22} color={eventStyle.color} />,
      bgColor: eventStyle.bgColor,
      borderColor: eventStyle.borderColor,
    };
    const icon = lower.includes("call") ? "call-outline" : lower.includes("refund") ? "return-down-back-outline" : lower.includes("payment") || lower.includes("commission") ? "receipt-outline" : lower.includes("location") || lower.includes("gps") ? "location-outline" : lower.includes("pickup") || lower.includes("return") ? "time-outline" : null;
    if (icon) return { icon: <Ionicons name={icon} size={22} color={Colors.dark} />, bgColor: Colors.logoBackground, borderColor: "#FDE68A" };

    switch (type) {
      case "booking":
        return {
          icon: (
            <MaterialCommunityIcons name="car-key" size={22} color="#1A1A1A" />
          ),
          bgColor: Colors.logoBackground,
          borderColor: "#FDE68A",
        };
      case "success":
        return {
          icon: (
            <Ionicons
              name="checkmark-circle-outline"
              size={22}
              color="#10B981"
            />
          ),
          bgColor: "#ECFDF5",
          borderColor: "#A7F3D0",
        };
      case "warning":
        return {
          icon: (
            <Ionicons name="alert-circle-outline" size={22} color="#F59E0B" />
          ),
          bgColor: "#FFFBEB",
          borderColor: "#FDE68A",
        };
      case "error":
        return {
          icon: (
            <Ionicons
              name="close-circle-outline"
              size={22}
              color={Colors.error}
            />
          ),
          bgColor: "#FEF2F2",
          borderColor: "#FECACA",
        };
      case "chat":
        return {
          icon: (
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={21}
              color="#1A1A1A"
            />
          ),
          bgColor: Colors.logoBackground,
          borderColor: "#FDE68A",
        };
      default:
        return {
          icon: (
            <Ionicons name="notifications-outline" size={21} color="#1A1A1A" />
          ),
          bgColor: "#F3F4F6",
          borderColor: "#E5E7EB",
        };
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      {/* Sleek Minimal Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
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
              <Ionicons
                name="ellipsis-vertical"
                size={19}
                color={Colors.dark}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.actionBtn} />
          )}
        </View>
      </View>

      {/* Inbox / Archived Tab Toggle Pill Bar */}
      <View style={styles.tabToggleBar}>
        <TouchableOpacity
          style={[
            styles.tabToggleItem,
            notificationTab === "inbox" && styles.tabToggleItemActive,
          ]}
          onPress={() => setNotificationTab("inbox")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabToggleText,
              notificationTab === "inbox" && styles.tabToggleTextActive,
            ]}
          >
            Inbox {notifications.length > 0 ? `(${notifications.length})` : ""}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabToggleItem,
            notificationTab === "archived" && styles.tabToggleItemActive,
          ]}
          onPress={() => setNotificationTab("archived")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabToggleText,
              notificationTab === "archived" && styles.tabToggleTextActive,
            ]}
          >
            Archived{" "}
            {archivedNotifications.length > 0
              ? `(${archivedNotifications.length})`
              : ""}
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
          <Text style={styles.emptyTitle}>
            {notificationTab === "inbox"
              ? "No Notifications Yet"
              : "No Archived Notifications"}
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
                  const iconCfg = getIconConfig(item.type, item.is_read, item.title);
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
      <AppBottomSheet visible={!!selectedNotificationGroup} onClose={() => setSelectedNotificationGroup(null)} title="Grouped Notifications">
        <ScrollView style={{ maxHeight: 380, flexShrink: 1 }}>
        {selectedNotificationGroup?.map((entry) => <TouchableOpacity key={entry.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border }} onPress={() => { setSelectedNotificationGroup(null); void handleNotificationPress(entry); }}>
          <Text style={{ fontFamily: FontFamily.semiBold }} numberOfLines={1}>{entry.title}</Text>
          <Text style={{ color: Colors.secondary, marginTop: 5 }} numberOfLines={2}>{entry.message}</Text>
          <Text style={{ color: Colors.secondary, marginTop: 4, fontSize: 11 }}>{entry.time}</Text>
        </TouchableOpacity>)}
        </ScrollView>
      </AppBottomSheet>
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
              <View
                style={[
                  styles.menuOptionIconBox,
                  { backgroundColor: "#ECFDF5" },
                ]}
              >
                <Ionicons name="checkmark-done" size={20} color="#10B981" />
              </View>
              <View style={styles.menuOptionTextBox}>
                <Text style={styles.menuOptionTitle}>Mark all as read</Text>
                <Text style={styles.menuOptionSubtitle}>
                  Mark all unread notifications
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.menuOptionItem}
            onPress={handleClearAll}
            activeOpacity={0.7}
          >
            <View
              style={[styles.menuOptionIconBox, { backgroundColor: "#FEF2F2" }]}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </View>
            <View style={styles.menuOptionTextBox}>
              <Text style={[styles.menuOptionTitle, { color: Colors.error }]}>
                Clear all
              </Text>
              <Text style={styles.menuOptionSubtitle}>
                Remove notifications from list
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuOptionItem} onPress={async () => { setOptionsMenuVisible(false); for (const entry of groupNotifications(notifications.filter((n) => n.is_read))) await handleArchiveOne(entry); }}><View style={styles.menuOptionTextBox}><Text style={styles.menuOptionTitle}>Archive Read Notifications</Text><Text style={styles.menuOptionSubtitle}>Keep unread updates in your inbox</Text></View></TouchableOpacity>
          <TouchableOpacity style={styles.menuOptionItem} onPress={() => { setUnreadOnly(!unreadOnly); setOptionsMenuVisible(false); }}><View style={styles.menuOptionTextBox}><Text style={styles.menuOptionTitle}>{unreadOnly ? "Show All Notifications" : "Show Unread Only"}</Text></View></TouchableOpacity>
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
    color: Colors.dark,
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
    alignItems: "flex-start",
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
    lineHeight: 17,
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
    color: Colors.dark,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 32,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.dark,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 8,
    paddingHorizontal: Spacing.sm,
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
