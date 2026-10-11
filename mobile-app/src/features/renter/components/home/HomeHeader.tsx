import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import {
  FontFamily,
  FontSize,
  Spacing,
} from "@/constants/theme";
import { useNotificationCount } from "@/context/NotificationContext";

const { height } = Dimensions.get("window");

interface Props {
  user: any;
  isGuest: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit?: () => void;
  onNotificationPress: () => void;
  onMenuPress: () => void;
  profilePhoto?: string | null;
  onProfilePress?: () => void;
}

export default function HomeHeader({
  user,
  isGuest,
  search,
  onSearchChange,
  onSearchSubmit,
  onNotificationPress,
  onMenuPress,
  profilePhoto: customPhoto,
  onProfilePress,
}: Props) {
  const { unreadCount } = useNotificationCount();
  const profilePhoto = customPhoto || user?.profile_photo;

  return (
    <View style={styles.container}>
      <View style={styles.userRow}>
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
              <Ionicons
                name="person"
                size={24}
                color={Colors.dark}
              />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.userInfo}
          onPress={onProfilePress}
          activeOpacity={0.8}
        >
          <Text
            style={styles.username}
            numberOfLines={1}
          >
            {isGuest ? "Guest" : user?.first_name || user?.name || "User"}
          </Text>

          <Text style={styles.subtitle}>
            Discover vehicles and stores.
          </Text>
        </TouchableOpacity>

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
            <MaterialCommunityIcons
              name="menu"
              size={23}
              color={Colors.dark}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TouchableOpacity onPress={onSearchSubmit} activeOpacity={0.7} style={styles.searchIconBtn}>
          <Ionicons
            name="search"
            size={21}
            color={Colors.dark}
          />
        </TouchableOpacity>

        <TextInput
          value={search}
          onChangeText={onSearchChange}
          onSubmitEditing={onSearchSubmit}
          placeholder="Search vehicle, brand, or type..."
          placeholderTextColor={Colors.secondary}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />

        {search.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange("")} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={18} color={Colors.secondary} />
          </TouchableOpacity>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 72,
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
    marginTop: 6,
    marginLeft: 8,
    marginRight: Spacing.sm,
  },

  username: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    color: Colors.white,
  },

  subtitle: {
    marginTop: -8,
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.white,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
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
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: 9,
    lineHeight: 11,
  },

  searchContainer: {
    height: 50,
    marginTop: 18,
    backgroundColor: Colors.white,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 20,
  },
  searchIconBtn: {
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.dark,
    paddingVertical: 0,
  },
});
