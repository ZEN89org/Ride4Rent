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

const { height } = Dimensions.get("window");

interface Props {
  user: any;
  isGuest: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit?: () => void;
  onNotificationPress: () => void;
  onMenuPress: () => void;
}

export default function HomeHeader({
  user,
  isGuest,
  search,
  onSearchChange,
  onSearchSubmit,
  onNotificationPress,
  onMenuPress,
}: Props) {
  const profilePhoto = user?.profile_photo;

  return (
    <View style={styles.container}>

      <View style={styles.userRow}>

        <View style={styles.profileContainer}>
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
        </View>

        <View style={styles.userInfo}>
          <Text
            style={styles.username}
            numberOfLines={1}
          >
            {isGuest ? "Guest" : user?.first_name || user?.name || "User"}
          </Text>

          <Text style={styles.subtitle}>
            Discover vehicles and stores.
          </Text>
        </View>

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
        <Ionicons
          name="search"
          size={21}
          color={Colors.dark}
        />

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
    minHeight: height * 0.25,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 30,
  },

  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  profileContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    marginTop: 10,
    marginLeft: 5,
    marginRight: Spacing.sm,
  },

  username: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    color: Colors.dark,
  },

  subtitle: {
    marginTop: -10,
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.dark,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },

  actionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
  },

  searchContainer: {
  height: 50,
  marginTop: 25,
  backgroundColor: Colors.white,
  borderRadius: 10,
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: Spacing.md,
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
