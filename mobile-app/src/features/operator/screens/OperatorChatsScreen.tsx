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

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import OperatorShell from "@/features/operator/components/navigation/OperatorShell";
import {
  ConversationItem,
  getConversations,
} from "@/services/messageService";

export default function OperatorChatsScreen() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOperatorChats = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await getConversations();
      setConversations(data);
    } catch (e) {
      console.log("Error loading operator conversations", e);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOperatorChats();
  }, [loadOperatorChats]);

  useFocusEffect(
    useCallback(() => {
      loadOperatorChats(true);
    }, [loadOperatorChats])
  );

  const handleOpenThread = (item: ConversationItem) => {
    router.push({
      pathname: `/chat/${item.user_id}`,
      params: { name: item.name || "Customer" },
    } as any);
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.last_message.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <OperatorShell activeRoute="chats">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Customer Inquiries</Text>
          <Text style={styles.subtitle}>Direct communications with interested renters</Text>
        </View>

        {conversations.length > 0 && (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.secondary} />
            <TextInput
              placeholder="Search renter inquiries..."
              placeholderTextColor={Colors.secondary}
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />
          </View>
        )}

        {conversations.length === 0 && !loading ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="chatbubble-ellipses-outline" size={38} color={Colors.secondary} />
            </View>
            <Text style={styles.emptyTitle}>No Renter Messages Yet</Text>
            <Text style={styles.emptySubtitle}>
              When renters visit your vehicle listings and send an inquiry, conversations will appear right here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => String(item.user_id)}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadOperatorChats();
                }}
                colors={[Colors.primary]}
              />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.chatCard}
                onPress={() => handleOpenThread(item)}
                activeOpacity={0.7}
              >
                {item.profile_photo ? (
                  <Image source={{ uri: item.profile_photo }} style={styles.avatarCircle} />
                ) : (
                  <View style={styles.avatarCircle}>
                    <Ionicons name="person" size={20} color={Colors.dark} />
                  </View>
                )}

                <View style={styles.chatInfo}>
                  <View style={styles.chatHeader}>
                    <Text style={styles.renterName}>{item.name || "Customer"}</Text>
                    <Text style={styles.timeText}>{item.last_time || "Recent"}</Text>
                  </View>
                  <Text
                    style={[
                      styles.lastMsg,
                      item.unread_count > 0 && { color: Colors.dark, fontFamily: FontFamily.semiBold },
                    ]}
                    numberOfLines={1}
                  >
                    {item.last_message || "Started a conversation"}
                  </Text>
                </View>

                {item.unread_count > 0 && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </OperatorShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
  },
  subtitle: {
    color: Colors.secondary,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 24,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.dark,
  },
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  renterName: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.dark,
  },
  timeText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
  },
  lastMsg: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    marginTop: 3,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    borderColor: Colors.border,
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.xl,
    marginTop: Spacing.xl,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    marginTop: Spacing.xs,
  },
  emptySubtitle: {
    color: Colors.secondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
  },
});
