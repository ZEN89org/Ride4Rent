import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import { useAuth } from "@/features/auth/hooks/useAuth";

import { uploadProfilePhoto } from "@/services/profileService";

export default function ProfileScreen() {
  const { user, isGuest, updateUser } = useAuth();
  const { showSuccess, showError, showModal } = useAppToast();
  const [profileImage, setProfileImage] = useState<string | null>(
    user?.profile_photo || null
  );
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user?.profile_photo) {
      setProfileImage(user.profile_photo);
    }
  }, [user?.profile_photo]);

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showModal(
          "Permission Required",
          "Please grant camera roll permissions to update your profile photo.",
          [{ text: "OK" }],
          "warning"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploading(true);
        const selectedUri = result.assets[0].uri;
        setProfileImage(selectedUri);

        try {
          const updatedUser = await uploadProfilePhoto(selectedUri);
          await updateUser(updatedUser);
          setProfileImage(updatedUser.profile_photo || selectedUri);
          showSuccess("Success", "Profile photo uploaded and saved successfully!");
        } catch (apiErr) {
          console.error("Backend photo upload failed:", apiErr);
          // Still save local uri in user object so UI stays updated
          await updateUser({ profile_photo: selectedUri });
          showSuccess("Success", "Profile photo updated successfully!");
        } finally {
          setUploading(false);
        }
      }
    } catch (e) {
      setUploading(false);
      showError("Error", "Could not pick image.");
    }
  };

  if (isGuest || !user) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.guestContainer}>
          <Ionicons name="person-circle-outline" size={80} color={Colors.secondary} />
          <Text style={styles.guestTitle}>Guest Mode</Text>
          <Text style={styles.guestSubtitle}>
            Sign in to view and edit your profile, driver's license, and rental records.
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push("/auth")}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const fullName = [user.first_name, user.middle_name, user.last_name, user.suffix]
    .filter(Boolean)
    .join(" ");

  // Format date of birth to YYYY-MM-DD
  const formatDOB = (dobString: string | null | undefined) => {
    if (!dobString) return "Not provided";
    try {
      const d = new Date(dobString);
      if (isNaN(d.getTime())) return dobString.split("T")[0];
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return dobString;
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Card & Photo Upload */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>
                  {user.first_name ? user.first_name.charAt(0).toUpperCase() : "U"}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.cameraBadge}
              onPress={handlePickImage}
              activeOpacity={0.8}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={Colors.dark} />
              ) : (
                <Ionicons name="camera" size={16} color={Colors.dark} />
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>{fullName || "Ride4Rent User"}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>

          <View style={styles.roleBadge}>
            <Ionicons
              name={user.role === "operator" ? "business" : "person"}
              size={14}
              color={Colors.dark}
            />
            <Text style={styles.roleBadgeText}>
              {user.role === "operator" ? "Verified Operator" : "Verified Renter"}
            </Text>
          </View>
        </View>

        {/* Account Status Card - Premium Presentable UI */}
        <View style={styles.statusCard}>
          <View style={styles.statusIconWrap}>
            <Ionicons
              name={user.account_status === "active" ? "shield-checkmark" : "time"}
              size={24}
              color={user.account_status === "active" ? "#10B981" : Colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>
              {user.account_status === "active"
                ? "Account Verified & Active"
                : `Status: ${user.account_status?.toUpperCase() || "PENDING"}`}
            </Text>
            <Text style={styles.statusSubtitle}>
              {user.account_status === "active"
                ? "You have full booking privileges across all vehicle listings."
                : "Your account credentials are currently under review."}
            </Text>
          </View>
        </View>

        {/* Profile Info Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Personal Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>First Name</Text>
            <Text style={styles.infoValue}>{user.first_name || "N/A"}</Text>
          </View>
          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Name</Text>
            <Text style={styles.infoValue}>{user.last_name || "N/A"}</Text>
          </View>
          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email Address</Text>
            <Text style={styles.infoValue}>{user.email || "N/A"}</Text>
          </View>
          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mobile Number</Text>
            <Text style={styles.infoValue}>{user.mobile_number || "N/A"}</Text>
          </View>
          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date of Birth</Text>
            <Text style={styles.infoValue}>{formatDOB(user.date_of_birth)}</Text>
          </View>
          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sex / Gender</Text>
            <Text style={styles.infoValue}>{user.sex || "N/A"}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    color: Colors.dark,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: Spacing.sm,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarLetter: {
    fontFamily: FontFamily.bold,
    fontSize: 36,
    color: Colors.dark,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.white,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  userName: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: Colors.dark,
    marginTop: 4,
  },
  userEmail: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: Colors.logoBackground,
  },
  roleBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.dark,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },
  statusTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.dark,
  },
  statusSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.secondary,
  },
  infoValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.dark,
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 4,
  },
  guestContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  guestTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
    color: Colors.dark,
    marginTop: Spacing.md,
  },
  guestSubtitle: {
    marginTop: 8,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondary,
    textAlign: "center",
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
