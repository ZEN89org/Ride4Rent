import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
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
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  ConversationItem,
  getConversations,
} from "@/services/messageService";

const cleanMessagePreview = (msg?: string | null): string => {
  if (!msg) return "No messages yet";
  const cleaned = msg.replace(/^\[REPLY:[\s\S]*?\]\s*/i, "").trim();
  if (cleaned.includes("EXTENSION PAYMENT RECEIPT")) {
    return "🧾 Extension Receipt Settled";
  }
  if (cleaned.includes("PAYMENT RECEIPT") || cleaned.includes("RESERVATION PAYMENT RECEIPT")) {
    return "🧾 Payment Receipt Settled";
  }
  return cleaned || "Replied to a message";
};

export default function Chats() {
  const { isGuest } = useAuth();
  const [search, setSearch] = useState("");
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

  const filteredChats = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.business_name && c.business_name.toLowerCase().includes(search.toLowerCase())) ||
      c.last_message.toLowerCase().includes(search.toLowerCase())
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

  if (isGuest) {
    return (
      <ScreenContainer>
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color={Colors.secondary} />
          <Text style={styles.emptyTitle}>Direct Host Messaging</Text>
          <Text style={styles.emptySubtitle}>
            Sign in to chat directly with verified operators and car rental hosts.
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push("/auth")}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
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

        {/* Search Bar if has chats */}
        {conversations.length > 0 && (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.secondary} />
            <TextInput
              placeholder="Search conversations..."
              placeholderTextColor={Colors.secondary}
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />
          </View>
        )}

        {/* Empty state for new users */}
        {conversations.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="chatbubble-ellipses-outline" size={38} color={Colors.secondary} />
            </View>
            <Text style={styles.emptyTitle}>No Messages Yet</Text>
            <Text style={styles.emptySubtitle}>
              When you contact a vehicle operator or send an inquiry, your conversations will appear right here.
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push("/(tabs)/home")}
              activeOpacity={0.85}
            >
              <Text style={styles.exploreButtonText}>Browse Vehicles</Text>
            </TouchableOpacity>
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
              <TouchableOpacity
                style={styles.chatCard}
                activeOpacity={0.7}
                onPress={() => handleOpenChat(item)}
              >
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
            )}
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
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.heading,
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondary,
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
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.dark,
  },
  listContent: {
    paddingBottom: 20,
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    fontSize: FontSize.title,
    fontFamily: FontFamily.bold,
    color: Colors.dark,
    marginTop: Spacing.xs,
  },
  emptySubtitle: {
    marginTop: 8,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 22,
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
    color: Colors.white,
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
    color: Colors.white,
  },
});
