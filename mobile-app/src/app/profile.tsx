import ProfileInformation from "@/components/common/ProfileInformation";
import ProfileLogoutButton from "@/components/common/ProfileLogoutButton";
import { ProfileSummary } from "@/components/common/ProfileSummary";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import { useAuth } from "@/features/auth/hooks/useAuth";

import { resolveImageUrl } from "@/services/api";
import { uploadProfilePhoto } from "@/services/profileService";
import { getSavedLocation, saveLocation } from "@/storage/locationStorage";

export default function ProfileScreen() {
  const { user, isGuest, updateUser, refreshUser } = useAuth();
  const { showSuccess, showError, showModal } = useAppToast();
  const [profileImageDraft, setProfileImage] = useState<string | null>(null);
  const profileImage =
    profileImageDraft ?? resolveImageUrl(user?.profile_photo);
  const [uploading, setUploading] = useState(false);
  const [savedAddress, setSavedAddress] = useState<string>("Not set");

  useFocusEffect(
    useCallback(() => {
      let active = true;

      getSavedLocation()
        .then((saved) => {
          if (active && saved?.address) {
            setSavedAddress(saved.address);
          }
        })
        .catch(() => {});

      const runBackgroundSync = () => {
        if (!active) return;
        refreshUser?.();

        const loadLocation = async () => {
          try {
            const saved = await getSavedLocation();
            if (saved?.address) {
              if (active) setSavedAddress(saved.address);
              return;
            }

            const perm = await Location.getForegroundPermissionsAsync();
            if (perm.granted && active) {
              const loc = await Location.getCurrentPositionAsync({});
              const geo = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              });
              const g = geo?.[0];
              const addr = g
                ? [g.street, g.district, g.city, g.region]
                    .filter(Boolean)
                    .join(", ")
                : "";
              if (addr && active) {
                await saveLocation({
                  latitude: loc.coords.latitude,
                  longitude: loc.coords.longitude,
                  address: addr,
                  confirmed: true,
                });
                if (active) setSavedAddress(addr);
              }
            }
          } catch {
            // ignore
          }
        };

        loadLocation();
      };

      const idleId =
        typeof requestIdleCallback === "function"
          ? requestIdleCallback(runBackgroundSync)
          : setTimeout(runBackgroundSync, 150);

      return () => {
        active = false;
        if (
          typeof cancelIdleCallback === "function" &&
          typeof idleId === "number"
        ) {
          cancelIdleCallback(idleId);
        } else {
          clearTimeout(idleId as any);
        }
      };
    }, [refreshUser]),
  );

  const handlePickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showModal(
          "Permission Required",
          "Please grant camera roll permissions to update your profile photo.",
          [{ text: "OK" }],
          "warning",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
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
          showSuccess("Success", "Profile photo updated.");
        } catch (apiErr) {
          console.error("Backend photo upload failed:", apiErr);
          await updateUser({ profile_photo: selectedUri });
          showSuccess("Success", "Profile photo updated.");
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
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.guestContainer}>
          <View style={styles.guestIconCircle}>
            <Ionicons name="person-outline" size={36} color={Colors.dark} />
          </View>
          <Text style={styles.guestTitle}>Guest Mode</Text>
          <Text style={styles.guestSubtitle}>
            Sign in to view your profile and driver&apos;s license.
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push("/auth")}
            activeOpacity={0.85}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const fullName = [
    user.first_name,
    user.middle_name,
    user.last_name,
    user.suffix,
  ]
    .filter(Boolean)
    .join(" ");

  const formatDOB = (dobString: string | null | undefined) => {
    if (!dobString) return "Not provided";
    try {
      const d = new Date(dobString);
      if (isNaN(d.getTime())) return dobString.split("T")[0];
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}, ${d.getFullYear()}`;
    } catch {
      return dobString;
    }
  };

  const isLicenseVerified = Boolean(user.is_drivers_license_verified);
  const isLicensePending =
    !isLicenseVerified &&
    (user.license_verification_status === "pending" ||
      (!user.license_verification_status &&
        Boolean(user.drivers_license_front)));
  const isLicenseRejected =
    !isLicenseVerified && user.license_verification_status === "rejected";

  const licenseInfo = isLicenseVerified
    ? {
        badgeText: "Verified Renter",
        badgeColor: "#047857",
        badgeBg: "#ECFDF5",
        subtext: "Verified and ready for booking",
        actionText: "View",
      }
    : isLicensePending
      ? {
          badgeText: "Pending Review",
          badgeColor: "#92400E",
          badgeBg: "#FEF3C7",
          subtext: "Under review by host/admin",
          actionText: "Check",
        }
      : isLicenseRejected
        ? {
            badgeText: "Rejected",
            badgeColor: "#B91C1C",
            badgeBg: "#FEE2E2",
            subtext: "Please upload a clear photo",
            actionText: "Update",
          }
        : {
            badgeText: "Unverified",
            badgeColor: "#92400E",
            badgeBg: Colors.logoBackground,
            subtext: "Required before booking a vehicle",
            actionText: "Upload",
          };

  const formattedSex = user.sex
    ? user.sex.charAt(0).toUpperCase() + user.sex.slice(1)
    : "Not provided";

  const personalDetails = [
    {
      icon: "person-outline" as const,
      label: "Full Name",
      value: fullName || "Not provided",
    },
    {
      icon: "mail-outline" as const,
      label: "Email Address",
      value: user.email || "Not provided",
    },
    {
      icon: "call-outline" as const,
      label: "Mobile Number",
      value: user.mobile_number || "Not provided",
    },
    {
      icon: "calendar-outline" as const,
      label: "Date of Birth",
      value: formatDOB(user.date_of_birth),
    },
    {
      icon: "male-female-outline" as const,
      label: "Gender",
      value: formattedSex,
    },
  ];

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      {/* Clean Minimal Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Clean Horizontal Profile Summary */}
        <ProfileSummary image={profileImage} title={fullName || "Ride4Rent User"} email={user.email} badge={licenseInfo.badgeText} badgeColor={licenseInfo.badgeColor} badgeBackground={licenseInfo.badgeBg} uploading={uploading} onEdit={handlePickImage} />

        {/* Simple Driver's License Row Card */}
        {user.role !== "operator" && (
          <TouchableOpacity
            style={styles.licenseRowCard}
            onPress={() => router.push("/driver-license" as any)}
            activeOpacity={0.8}
          >
            <View style={styles.licenseIconBox}>
              <Ionicons name="card-outline" size={20} color={Colors.dark} />
            </View>

            <View style={styles.licenseTextCol}>
              <Text style={styles.licenseTitle}>Driver&apos;s License</Text>
              <Text style={styles.licenseSubtext}>{licenseInfo.subtext}</Text>
            </View>

            <View style={styles.licenseActionBtn}>
              <Text style={styles.licenseActionBtnText}>
                {licenseInfo.actionText}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <ProfileInformation title="Personal Information" rows={personalDetails} />
        <View style={styles.personalList}>
          {/* Current Location Row (Connected to Available Vehicles Near You) */}
          {user.role !== "operator" && (
            <TouchableOpacity
              style={styles.personalRow}
              onPress={() =>
                router.push("/current-location?from=profile" as any)
              }
              activeOpacity={0.8}
            >
              <View style={styles.personalIconBox}>
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={Colors.dark}
                />
              </View>
              <View style={styles.personalTextCol}>
                <Text style={styles.personalLabel}>Current Location</Text>
                <Text style={styles.personalValue} numberOfLines={1}>
                  {savedAddress}
                </Text>
              </View>
              <View style={styles.locationChangeBtn}>
                <Text style={styles.locationChangeBtnText}>Change</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
        {user.role !== "operator" && <TouchableOpacity style={styles.personalRow} onPress={() => router.push("/payment-method" as any)} accessibilityRole="button">
          <View style={styles.personalIconBox}><Ionicons name="wallet-outline" size={20} color={Colors.dark} /></View>
          <View style={styles.personalTextCol}><Text style={styles.personalLabel}>Payment Method</Text><Text style={styles.personalValue}>Manage your saved GCash account</Text></View>
          <Ionicons name="chevron-forward" size={20} color={Colors.secondary} />
        </TouchableOpacity>}
        <ProfileLogoutButton />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.white,
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
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 40,
  },

  /* Horizontal Profile Header */
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: {
    fontFamily: FontFamily.bold,
    fontSize: 28,
    color: Colors.dark,
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  profileTextCol: {
    flex: 1,
    alignItems: "flex-start",
  },
  userName: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.dark,
  },
  userEmail: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    marginTop: 1,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 7,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
  },

  /* Simple Driver's License Card */
  licenseRowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.logoBackground,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 24,
  },
  licenseIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  licenseTextCol: {
    flex: 1,
  },
  licenseTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
    color: Colors.dark,
  },
  licenseSubtext: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 1,
  },
  licenseActionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  licenseActionBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },

  /* Personal Information — Clean Borderless List */
  sectionLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.dark,
    marginBottom: 14,
  },
  personalList: {
    gap: 16,
  },
  personalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  personalIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F6F6F6",
    justifyContent: "center",
    alignItems: "center",
  },
  personalTextCol: {
    flex: 1,
  },
  personalLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
  },
  personalValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.dark,
    marginTop: 2,
  },
  locationChangeBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  locationChangeBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },

  /* Guest Mode */
  guestContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  guestIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.logoBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  guestTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
    color: Colors.dark,
  },
  guestSubtitle: {
    marginTop: 6,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondary,
    textAlign: "center",
  },
  signInButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
  },
  signInText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
});
