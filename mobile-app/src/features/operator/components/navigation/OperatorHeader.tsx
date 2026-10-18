import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";

interface OperatorHeaderProps {
  user: any;
  profile: any;
  profilePhoto: string | null;
  unreadCount: number;
  isOperatorPending: boolean;
  onProfilePress: () => void;
  onNotificationPress: () => void;
  onMenuPress: () => void;
}

export default function OperatorHeader({
  user,
  profile,
  profilePhoto,
  unreadCount,
  isOperatorPending,
  onProfilePress,
  onNotificationPress,
  onMenuPress,
}: OperatorHeaderProps) {
  const displayName =
    profile?.business_name ||
    (user?.first_name ? `${user.first_name} ${user?.last_name || ""}`.trim() : null) ||
    user?.name ||
    "Operator";

  return (
    <View style={styles.container}>
      <View style={styles.userRow}>
        {/* Profile Circle (Matching Renter HomeHeader) */}
        <TouchableOpacity
          style={styles.profileContainer}
          onPress={onProfilePress}
          activeOpacity={0.8}
        >
          {profilePhoto ? (
            <Image
              source={{ uri: profilePhoto }}
              contentFit="cover"
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.defaultProfile}>
              <Ionicons name="person" size={24} color={Colors.dark} />
            </View>
          )}
        </TouchableOpacity>

        {/* User / Business Info */}
        <TouchableOpacity
          style={styles.userInfo}
          onPress={onProfilePress}
          activeOpacity={0.8}
        >
          <Text style={styles.username} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {isOperatorPending ? "Application Under Review" : "Fleet Operator Portal"}
          </Text>
        </TouchableOpacity>

        {/* 2 White Circular Action Buttons (Matching Renter HomeHeader) */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onNotificationPress}
            activeOpacity={0.8}
          >
            <Ionicons
              name="notifications-outline"
              size={21}
              color={Colors.dark}
            />
            {unreadCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onMenuPress}
            activeOpacity={0.8}
          >
            <Ionicons
              name="menu"
              size={23}
              color={Colors.dark}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 56, // Room for the overlapping revenue card!
    zIndex: 1,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  defaultProfile: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.inputBackground,
  },
  userInfo: {
    flex: 1,
    marginTop: 4,
    marginLeft: 10,
    marginRight: Spacing.sm,
  },
  username: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    color: Colors.dark,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.dark,
    opacity: 0.82,
    marginTop: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  badgeContainer: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: Colors.primary,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  badgeText: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: 9,
    lineHeight: 11,
  },
});
