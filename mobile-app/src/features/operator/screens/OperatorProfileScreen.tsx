import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import PrimaryButton from "@/components/common/PrimaryButton";
import { Colors } from "@/constants/colors";
import { FontFamily, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import OperatorShell from "@/features/operator/components/navigation/OperatorShell";
import api, { resolveImageUrl } from "@/services/api";
import { uploadProfilePhoto } from "@/services/profileService";

const GCASH_IMG = require("@/assets/img/gcash.jpg");

export default function OperatorProfileScreen() {
  const { user, updateUser, isOperatorPending, refreshUser } = useAuth();
  const { showSuccess, showError } = useAppToast();
  const profile = user?.operatorProfile ?? user?.operator_profile;

  useFocusEffect(
    useCallback(() => {
      refreshUser?.().catch(() => {});
    }, [refreshUser]),
  );

  const [profileImageDraft, setProfileImage] = useState<string | null>(null);
  const profileImage =
    profileImageDraft ?? resolveImageUrl(user?.profile_photo);
  const [uploading, setUploading] = useState(false);

  // Business and Payment Setup Fields
  const [accountNameDraft, setAccountName] = useState<string | null>(null);
  const accountName = accountNameDraft ?? profile?.account_name ?? "";
  const [accountNumberDraft, setAccountNumber] = useState<string | null>(null);
  const accountNumber = accountNumberDraft ?? profile?.account_number ?? "";
  const [paymentMethod, setPaymentMethod] = useState("gcash");
  const [qrCodeDraft, setQrCodeImage] = useState<string | null>(null);
  const qrCodeImage = qrCodeDraft ?? resolveImageUrl(profile?.qr_code);
  const [savingPayment, setSavingPayment] = useState(false);

  const handlePickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showError("Permission Needed", "Please grant camera roll permissions.");
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
          showSuccess("Photo Updated", "Business profile photo updated.");
        } catch {
          await updateUser({ profile_photo: selectedUri });
          showSuccess("Photo Updated", "Profile image updated.");
        } finally {
          setUploading(false);
        }
      }
    } catch {
      setUploading(false);
      showError("Image Error", "Could not pick image.");
    }
  };

  const handlePickQrCode = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showError("Permission Needed", "Please grant photo permissions.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setQrCodeImage(result.assets[0].uri);
      }
    } catch {
      showError("Image Error", "Could not pick QR code.");
    }
  };

  const handleSavePaymentSetup = async () => {
    const cleanPhone = accountNumber.trim().replace(/\s+/g, "");

    // Validate Philippine Phone / Account Number format (09XXXXXXXXX or +639XXXXXXXXX)
    const phoneRegex = /^(09|\+639)\d{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      showError(
        "Invalid Number",
        "Please input a valid 11-digit mobile number (e.g. 09171234567 or +639171234567).",
      );
      return;
    }

    try {
      setSavingPayment(true);
      const formData = new FormData();
      formData.append("account_number", cleanPhone);
      if (accountName.trim())
        formData.append("account_name", accountName.trim());
      formData.append("accepted_payment_methods[]", paymentMethod);

      if (qrCodeImage && !qrCodeImage.startsWith("http")) {
        const filename = qrCodeImage.split("/").pop() || "qr_code.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        formData.append("qr_code", {
          uri: qrCodeImage,
          name: filename,
          type,
        } as any);
      }

      const response = await api.post(`/operator/payment`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.data) {
        await updateUser(response.data.data);
      }

      showSuccess(
        "Payment Setup Saved",
        "Renters can now send reservation payments to this account.",
      );
    } catch (e: any) {
      showError(
        "Error",
        e.response?.data?.message || "Could not save payment setup.",
      );
    } finally {
      setSavingPayment(false);
    }
  };

  const fullName = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(" ");
  const address =
    [profile?.street_address, profile?.barangay, profile?.municipality]
      .filter(Boolean)
      .join(", ") || "Address not provided";

  return (
    <OperatorShell activeRoute="profile">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled={true}
      >
        {/* Profile Card & Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarCircle}>
                <Ionicons name="business" size={32} color={Colors.dark} />
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

          <Text style={styles.userName}>
            {profile?.business_name || fullName || "Host Workspace"}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          {isOperatorPending ? (
            <View style={[styles.verifiedBadge, styles.pendingBadge]}>
              <Ionicons name="time" size={14} color="#D97706" />
              <Text style={[styles.verifiedText, styles.pendingBadgeText]}>
                Application Under Review
              </Text>
            </View>
          ) : (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.verifiedText}>Verified Fleet Operator</Text>
            </View>
          )}
        </View>

        {/* Business Info Section */}
        <Text style={styles.sectionHeading}>Business Information</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Ionicons
              name={
                isOperatorPending ? "time-outline" : "shield-checkmark-outline"
              }
              size={18}
              color={isOperatorPending ? "#D97706" : "#10B981"}
            />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel}>Account Accreditation</Text>
              <Text
                style={[
                  styles.infoValue,
                  isOperatorPending && {
                    color: "#D97706",
                    fontFamily: FontFamily.bold,
                  },
                ]}
              >
                {isOperatorPending
                  ? "Pending Administrator Verification"
                  : "Active & Verified"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons
              name="person-outline"
              size={18}
              color={Colors.secondary}
            />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel}>Authorized Representative</Text>
              <Text style={styles.infoValue}>{fullName}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color={Colors.secondary} />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel}>Business Contact</Text>
              <Text style={styles.infoValue}>
                {profile?.business_contact_number ||
                  user?.mobile_number ||
                  "Not set"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons
              name="location-outline"
              size={18}
              color={Colors.secondary}
            />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel}>Garage / Pickup Base</Text>
              <Text style={styles.infoValue}>{address}</Text>
            </View>
          </View>
        </View>

        {/* Payment Setup for Renters */}
        <Text style={styles.sectionHeading}>Rental Payment Setup</Text>
        <View style={styles.card}>
          <Text style={styles.cardSub}>
            Set your payment account & optional QR code so renters know where to
            send reservation fees.
          </Text>

          <Text style={styles.inputLabel}>Primary Payment Channel</Text>
          <View style={styles.paymentMethodsRow}>
            <View
              style={[
                styles.methodPill,
                styles.methodPillActive,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                },
              ]}
            >
              <Image
                source={GCASH_IMG}
                style={{ width: 22, height: 22, borderRadius: 6 }}
                resizeMode="cover"
              />
              <Text
                style={[
                  styles.methodPillText,
                  styles.methodPillTextActive,
                  { fontSize: 13, letterSpacing: 0.3 },
                ]}
              >
                GCash
              </Text>
            </View>
          </View>

          <Text style={styles.inputLabel}>Account Name</Text>
          <TextInput
            style={styles.input}
            value={accountName}
            onChangeText={setAccountName}
            placeholder="e.g. Juan Dela Cruz"
          />

          <Text style={styles.inputLabel}>
            Account / Phone Number (11-digits)
          </Text>
          <TextInput
            style={styles.input}
            value={accountNumber}
            onChangeText={setAccountNumber}
            placeholder="e.g. 09171234567"
            keyboardType="phone-pad"
            maxLength={13}
          />

          <Text style={styles.inputLabel}>Optional Payment QR Code</Text>
          <TouchableOpacity
            style={styles.qrUploadBox}
            onPress={handlePickQrCode}
            activeOpacity={0.8}
          >
            {qrCodeImage ? (
              <Image
                source={{ uri: qrCodeImage }}
                style={styles.qrImagePreview}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Ionicons
                  name="qr-code-outline"
                  size={32}
                  color={Colors.secondary}
                />
                <Text style={styles.qrText}>
                  Tap to select payment QR code image
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ marginTop: Spacing.md, marginBottom: Spacing.xs }}>
            <PrimaryButton
              title={savingPayment ? "Saving Setup..." : "Save Payment Details"}
              onPress={handleSavePaymentSetup}
              loading={savingPayment}
            />
          </View>
        </View>
      </ScrollView>
    </OperatorShell>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  avatarSection: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarWrapper: {
    position: "relative",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.logoBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
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
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: Spacing.md,
  },
  verifiedText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: "#10B981",
  },
  pendingBadge: {
    backgroundColor: "#FEF3C7",
  },
  pendingBadgeText: {
    color: "#D97706",
  },
  sectionHeading: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardSub: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginBottom: 10,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    gap: Spacing.md,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
  },
  infoValue: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.dark,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 10,
  },
  inputLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.dark,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.dark,
  },
  paymentMethodsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  methodPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.inputBackground,
  },
  methodPillActive: {
    backgroundColor: Colors.logoBackground,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  methodPillText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.secondary,
  },
  methodPillTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  qrUploadBox: {
    height: 120,
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    overflow: "hidden",
  },
  qrImagePreview: {
    width: "100%",
    height: "100%",
  },
  qrPlaceholder: {
    alignItems: "center",
    gap: 4,
  },
  qrText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
  },
});
