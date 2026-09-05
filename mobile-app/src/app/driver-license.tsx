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

import PrimaryButton from "@/components/common/PrimaryButton";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAppToast } from "@/context/ToastContext";
import { uploadDriversLicense } from "@/services/profileService";

export default function DriverLicenseScreen() {
  const { user, isGuest, updateUser } = useAuth();
  const { showSuccess, showError } = useAppToast();

  const [frontImage, setFrontImage] = useState<string | null>(
    user?.drivers_license_front || null
  );
  const [backImage, setBackImage] = useState<string | null>(
    user?.drivers_license_back || null
  );
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user?.drivers_license_front) setFrontImage(user.drivers_license_front);
    if (user?.drivers_license_back) setBackImage(user.drivers_license_back);
  }, [user]);

  const handlePickImage = async (side: "front" | "back") => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showError("Permission Required", "Camera roll permission is required to upload your license.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 10],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        if (side === "front") setFrontImage(uri);
        else setBackImage(uri);
      }
    } catch {
      showError("Image Error", "Could not select photo.");
    }
  };

  const handleSubmit = async () => {
    if (!frontImage || !backImage) {
      showError("Missing License Photo", "Please upload both the Front and Back sides of your driver's license.");
      return;
    }

    try {
      setUploading(true);
      const updatedUser = await uploadDriversLicense(frontImage, backImage);
      await updateUser(updatedUser);
      showSuccess("Verification Saved", "Driver's license submitted and verified.");
      router.back();
    } catch (e: any) {
      showError("Upload Failed", e.response?.data?.message || "Could not save driver's license.");
    } finally {
      setUploading(false);
    }
  };

  if (isGuest) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Driver's License</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.guestContainer}>
          <Ionicons name="card-outline" size={72} color={Colors.secondary} />
          <Text style={styles.guestTitle}>Sign In Required</Text>
          <Text style={styles.guestSubtitle}>
            Please sign in to upload and manage your verified driver's license.
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

  const isVerified = user?.is_drivers_license_verified;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver's License</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Hero */}
        <View style={styles.statusHero}>
          <View style={[styles.statusIconWrap, isVerified && styles.statusIconWrapVerified]}>
            <Ionicons
              name={isVerified ? "shield-checkmark" : "card"}
              size={28}
              color={isVerified ? "#10B981" : Colors.dark}
            />
          </View>
          <Text style={styles.statusTitle}>
            {isVerified ? "License Verified" : "Identity Verification"}
          </Text>
          <Text style={styles.statusSub}>
            {isVerified
              ? "Your driver's license has been validated. You are eligible to book and rent vehicles."
              : "Upload clear photos of the front and back of your official driver's license."}
          </Text>
        </View>

        {/* Front Photo Card */}
        <Text style={styles.sectionHeading}>1. License Front Side</Text>
        <TouchableOpacity
          style={styles.uploadCard}
          onPress={() => handlePickImage("front")}
          activeOpacity={0.8}
        >
          {frontImage ? (
            <Image source={{ uri: frontImage }} style={styles.licensePreview} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderWrap}>
              <MaterialCommunityIcons name="card-account-details-outline" size={40} color={Colors.secondary} />
              <Text style={styles.uploadLabel}>Tap to select or snap front photo</Text>
              <Text style={styles.uploadSub}>Must show name, photo & license number</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Back Photo Card */}
        <Text style={styles.sectionHeading}>2. License Back Side</Text>
        <TouchableOpacity
          style={styles.uploadCard}
          onPress={() => handlePickImage("back")}
          activeOpacity={0.8}
        >
          {backImage ? (
            <Image source={{ uri: backImage }} style={styles.licensePreview} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderWrap}>
              <MaterialCommunityIcons name="card-bulleted-outline" size={40} color={Colors.secondary} />
              <Text style={styles.uploadLabel}>Tap to select or snap back photo</Text>
              <Text style={styles.uploadSub}>Must show restrictions and conditions</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={{ marginTop: Spacing.xl, marginBottom: 30 }}>
          <PrimaryButton
            title={uploading ? "Saving License..." : "Save & Verify License"}
            onPress={handleSubmit}
            loading={uploading}
          />
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
  },
  statusHero: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.logoBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  statusIconWrapVerified: {
    backgroundColor: "#ECFDF5",
  },
  statusTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
  },
  statusSub: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 4,
  },
  sectionHeading: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: Spacing.sm,
  },
  uploadCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    height: 170,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: "dashed",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  licensePreview: {
    width: "100%",
    height: "100%",
  },
  placeholderWrap: {
    alignItems: "center",
    padding: Spacing.md,
  },
  uploadLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.dark,
    marginTop: 8,
  },
  uploadSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
    marginTop: 2,
  },
  guestContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  guestTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    color: Colors.dark,
    marginTop: Spacing.md,
  },
  guestSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
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
