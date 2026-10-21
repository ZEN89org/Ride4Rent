import ProfileInformation from "@/components/common/ProfileInformation";
import ProfileLogoutButton from "@/components/common/ProfileLogoutButton";
import { ProfileSummary } from "@/components/common/ProfileSummary";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
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

export default function OperatorProfileScreen({ paymentOnly = false }: { paymentOnly?: boolean }) {
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
  const [qrPreviewError, setQrPreviewError] = useState(false);

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
        setQrPreviewError(false);
      }
    } catch {
      showError("Image Error", "Could not pick QR code.");
    }
  };

  const handleSavePaymentSetup = async () => {
    if (!accountName.trim() || accountName.trim().length > 100) {
      showError("Account Name Required", "Enter the GCash account holder’s name (up to 100 characters).");
      return;
    }
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
        {!paymentOnly && <>
        {/* Profile Card & Avatar */}
        <ProfileSummary image={profileImage} title={fullName || profile?.business_name || "Operator"} email={user?.email} badge={isOperatorPending ? "Application Under Review" : "Verified Operator"} badgeColor={isOperatorPending ? "#D97706" : "#16A34A"} badgeBackground={isOperatorPending ? "#FFFBEB" : "#ECFDF5"} uploading={uploading} onEdit={handlePickImage} />

        <TouchableOpacity style={styles.paymentShortcut} onPress={() => router.push("/operator-payment" as any)} activeOpacity={0.8}>
          <View style={styles.paymentShortcutIcon}><Ionicons name="wallet-outline" size={20} color={Colors.dark} /></View>
          <View style={{ flex: 1 }}><Text style={styles.paymentShortcutTitle}>Payment Method</Text><Text style={styles.paymentShortcutHint}>GCash account and payment QR code</Text></View><Ionicons name="chevron-forward" size={18} color={Colors.dark} />
        </TouchableOpacity>
        <ProfileInformation title="Business Information" rows={[
          { icon: "business-outline", label: "Business Name", value: profile?.business_name || "Not provided" },
          { icon: "shield-checkmark-outline", label: "Account Status", value: isOperatorPending ? "Under Review" : "Verified Operator" },
          { icon: "person-outline", label: "Representative", value: fullName || "Not provided" },
          { icon: "mail-outline", label: "Email Address", value: user?.email || "Not provided" },
          { icon: "call-outline", label: "Business Contact", value: profile?.business_contact_number || user?.mobile_number || "Not provided" },
          { icon: "location-outline", label: "Pickup Address", value: address },
        ]} />
        <ProfileLogoutButton />
        </>}
        {paymentOnly && <>
          <View style={paymentStyles.header}><TouchableOpacity accessibilityLabel="Back to profile" onPress={() => router.back()} style={paymentStyles.back}><Ionicons name="chevron-back" size={22} color={Colors.dark} /></TouchableOpacity><View style={{ flex: 1 }}><Text style={paymentStyles.title}>Payment Method</Text><Text style={paymentStyles.subtitle}>Where renters send their payments</Text></View></View>
          <View style={paymentStyles.accountCard}>
            <View style={paymentStyles.accountHeader}><Image source={GCASH_IMG} style={paymentStyles.logo} /><View style={{ flex: 1 }}><Text style={paymentStyles.cardTitle}>GCash account</Text><Text style={paymentStyles.subtitle}>Use the details registered in GCash</Text></View></View>
            <Text style={styles.inputLabel}>Account name</Text><TextInput style={paymentStyles.input} value={accountName} onChangeText={setAccountName} placeholder="Registered account name" maxLength={100} autoCapitalize="words" editable={!savingPayment} />
            <Text style={styles.inputLabel}>Mobile number</Text><TextInput style={paymentStyles.input} value={accountNumber} onChangeText={value => setAccountNumber(value.replace(/[^\d+]/g, "").slice(0, 13))} placeholder="09XXXXXXXXX" keyboardType="phone-pad" maxLength={13} editable={!savingPayment} />
          </View>
          <View style={paymentStyles.accountCard}>
            <View style={paymentStyles.qrHeader}><View style={{ flex: 1 }}><Text style={paymentStyles.cardTitle}>Payment QR code</Text><Text style={paymentStyles.subtitle}>Optional · upload your GCash QR</Text></View><Ionicons name="qr-code-outline" size={22} color={Colors.dark} /></View>
            <View style={paymentStyles.qrFrame}>
              {qrCodeImage && !qrPreviewError ? <Image source={{ uri: qrCodeImage }} resizeMode="contain" style={paymentStyles.qrImage} onError={() => setQrPreviewError(true)} /> : <View style={paymentStyles.qrEmpty}><Ionicons name="qr-code-outline" size={48} color={Colors.secondary} /><Text style={paymentStyles.qrHint}>{qrPreviewError ? "QR image unavailable. Upload a new image." : "Your QR code will appear here"}</Text></View>}
            </View>
            <TouchableOpacity disabled={savingPayment} style={paymentStyles.changeQr} onPress={handlePickQrCode}><Ionicons name="image-outline" size={18} color={Colors.dark} /><Text style={paymentStyles.changeText}>{qrCodeImage ? "Replace QR code" : "Upload QR code"}</Text></TouchableOpacity>
          </View>
          <PrimaryButton title={savingPayment ? "Saving…" : "Save payment details"} onPress={handleSavePaymentSetup} loading={savingPayment} />
        </>}

      </ScrollView>
    </OperatorShell>
  );
}

const styles = StyleSheet.create({
  paymentShortcut: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.logoBackground, padding: 14, borderRadius: 16, gap: 12, marginBottom: 24 },
  paymentShortcutIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.white, alignItems: "center", justifyContent: "center" },
  paymentShortcutTitle: { fontFamily: FontFamily.bold, fontSize: 13.5, color: Colors.dark },
  paymentShortcutHint: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 18, color: Colors.secondary, marginTop: 1 },
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
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

const paymentStyles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  back: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: FontFamily.bold, fontSize: 23, color: Colors.dark },
  subtitle: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 19, color: Colors.secondary, marginTop: 3 },
  accountCard: { backgroundColor: Colors.white, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 18, padding: 18, marginBottom: 18 },
  accountHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  logo: { width: 42, height: 42, borderRadius: 12 },
  cardTitle: { fontFamily: FontFamily.semiBold, fontSize: 15, color: Colors.dark },
  input: { minHeight: 50, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, paddingHorizontal: 14, fontFamily: FontFamily.regular, fontSize: 14, color: Colors.dark, marginBottom: 14 },
  qrHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  qrFrame: { width: "100%", maxWidth: 300, aspectRatio: 1, alignSelf: "center", backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", padding: 12 },
  qrImage: { width: "100%", height: "100%" },
  qrEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 12 },
  qrHint: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 19, textAlign: "center", color: Colors.secondary },
  changeQr: { minHeight: 48, backgroundColor: Colors.logoBackground, borderRadius: 12, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 16 },
  changeText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.dark },
});
