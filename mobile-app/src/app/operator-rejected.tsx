import { rentalSheetStyle } from "@/constants/rentalDesign";
import RentalSheetHeader from "@/components/common/RentalSheetHeader";
import { AppBottomSheet } from "@/components/common/AppBottomSheet";

import ScreenContainer from "@/components/common/ScreenContainer";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { resubmitOperatorDocuments } from "@/features/operator/services/operatorService";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function OperatorRejected() {
  const { user, logout, refreshUser } = useAuth();
  const { showSuccess, showError } = useAppToast();

  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [permitFront, setPermitFront] = useState<string | null>(null);
  const [permitBack, setPermitBack] = useState<string | null>(null);
  const [govIdFront, setGovIdFront] = useState<string | null>(null);
  const [govIdBack, setGovIdBack] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.replace("/auth");
  };

  const pickDocumentImage = async (setter: (uri: string | null) => void) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 10],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setter(result.assets[0].uri);
      }
    } catch {
      showError(
        "Image Picker Error",
        "Could not load selected document image.",
      );
    }
  };

  const handleSubmitResubmission = async () => {
    if (!permitFront && !govIdFront) {
      showError(
        "Documents Required",
        "Please upload at least one corrected document (Business Permit or Government ID).",
      );
      return;
    }

    try {
      setSubmitting(true);
      await resubmitOperatorDocuments({
        business_permit_front: permitFront || undefined,
        business_permit_back: permitBack || undefined,
        government_id_front: govIdFront || undefined,
        government_id_back: govIdBack || undefined,
        notes: notes.trim() || undefined,
      });

      showSuccess(
        "Documents Resubmitted",
        "Your application has been returned to pending review.",
      );
      setShowResubmitModal(false);
      await refreshUser();
      router.replace("/operator-pending" as any);
    } catch (e: any) {
      showError(
        "Submission Error",
        e.response?.data?.message || "Failed to resubmit documents.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const rejectionReason =
    user?.operator_profile?.rejection_reason ||
    (user as any)?.operatorProfile?.rejection_reason;

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="close-circle-outline" size={68} color="#DC2626" />
        </View>

        <Text style={styles.title}>Registration Rejected</Text>

        <Text style={styles.message}>
          Your host operator application was not approved by the Ride4Rent
          Administrator.
        </Text>

        {rejectionReason ? (
          <View style={styles.reasonContainer}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 4,
              }}
            >
              <Ionicons name="information-circle" size={16} color="#DC2626" />
              <Text style={styles.reasonTitle}>
                Feedback from Administrator
              </Text>
            </View>
            <Text style={styles.reason}>{rejectionReason}</Text>
          </View>
        ) : null}

        <View style={styles.actionButtonGroup}>
          <TouchableOpacity
            style={styles.resubmitBtn}
            onPress={() => setShowResubmitModal(true)}
            activeOpacity={0.88}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={18}
              color={Colors.dark}
            />
            <Text style={styles.resubmitBtnText}>Re-upload Documents</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutBtnText}>Return to Login</Text>
          </TouchableOpacity>
        </View>

        {/* Resubmit Documents Bottom Sheet */}
        <AppBottomSheet
          visible={showResubmitModal}
          onClose={() => setShowResubmitModal(false)}
          position="bottom"
          showHandle={true}
          sheetStyle={rentalSheetStyle}
        >
          <RentalSheetHeader title="Update Documents" subtitle="Upload clear permits and identification." icon="document-text-outline" onClose={() => setShowResubmitModal(false)} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flexShrink: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. Business Permit Section */}
            <Text style={styles.sectionHeader}>
              1. Business Permit / Mayor&apos;s Permit
            </Text>
            <View style={styles.docRow}>
              {/* Permit Front */}
              <TouchableOpacity
                style={styles.docBox}
                onPress={() => pickDocumentImage(setPermitFront)}
                activeOpacity={0.8}
              >
                {permitFront ? (
                  <View style={styles.docPreviewWrap}>
                    <Image
                      source={{ uri: permitFront }}
                      style={styles.docImage}
                      contentFit="cover"
                    />
                    <View style={styles.docOverlayBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color="#10B981"
                      />
                      <Text style={styles.docOverlayText}>Front</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.docPlaceholder}>
                    <Ionicons
                      name="camera-outline"
                      size={22}
                      color={Colors.secondary}
                    />
                    <Text style={styles.docPlaceholderText}>Permit Front</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Permit Back */}
              <TouchableOpacity
                style={styles.docBox}
                onPress={() => pickDocumentImage(setPermitBack)}
                activeOpacity={0.8}
              >
                {permitBack ? (
                  <View style={styles.docPreviewWrap}>
                    <Image
                      source={{ uri: permitBack }}
                      style={styles.docImage}
                      contentFit="cover"
                    />
                    <View style={styles.docOverlayBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color="#10B981"
                      />
                      <Text style={styles.docOverlayText}>Back</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.docPlaceholder}>
                    <Ionicons
                      name="camera-outline"
                      size={22}
                      color={Colors.secondary}
                    />
                    <Text style={styles.docPlaceholderText}>
                      Permit Back (Optional)
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* 2. Government ID Section */}
            <Text style={styles.sectionHeader}>2. Government-issued ID</Text>
            <View style={styles.docRow}>
              {/* ID Front */}
              <TouchableOpacity
                style={styles.docBox}
                onPress={() => pickDocumentImage(setGovIdFront)}
                activeOpacity={0.8}
              >
                {govIdFront ? (
                  <View style={styles.docPreviewWrap}>
                    <Image
                      source={{ uri: govIdFront }}
                      style={styles.docImage}
                      contentFit="cover"
                    />
                    <View style={styles.docOverlayBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color="#10B981"
                      />
                      <Text style={styles.docOverlayText}>ID Front</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.docPlaceholder}>
                    <Ionicons
                      name="camera-outline"
                      size={22}
                      color={Colors.secondary}
                    />
                    <Text style={styles.docPlaceholderText}>ID Front</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* ID Back */}
              <TouchableOpacity
                style={styles.docBox}
                onPress={() => pickDocumentImage(setGovIdBack)}
                activeOpacity={0.8}
              >
                {govIdBack ? (
                  <View style={styles.docPreviewWrap}>
                    <Image
                      source={{ uri: govIdBack }}
                      style={styles.docImage}
                      contentFit="cover"
                    />
                    <View style={styles.docOverlayBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color="#10B981"
                      />
                      <Text style={styles.docOverlayText}>ID Back</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.docPlaceholder}>
                    <Ionicons
                      name="camera-outline"
                      size={22}
                      color={Colors.secondary}
                    />
                    <Text style={styles.docPlaceholderText}>
                      ID Back (Optional)
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* 3. Note to Admin */}
            <Text style={styles.sectionHeader}>
              3. Note for Admin (Optional)
            </Text>
            <TextInput
              style={styles.notesInput}
              multiline
              numberOfLines={2}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Uploaded the 2026 renewed mayor's permit and clear national ID."
              placeholderTextColor={Colors.secondary}
            />
          </ScrollView>

          {/* Modal Footer Buttons */}
          <View style={styles.sheetFooterRow}>
            <TouchableOpacity
              style={styles.cancelSheetBtn}
              onPress={() => setShowResubmitModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelSheetBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitSheetBtn}
              onPress={handleSubmitResubmission}
              disabled={submitting}
              activeOpacity={0.88}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.dark} />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={Colors.dark}
                  />
                  <Text style={styles.submitSheetBtnText}>
                    Submit for Review
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </AppBottomSheet>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
    color: Colors.dark,
    textAlign: "center",
  },
  message: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 22,
  },
  reasonContainer: {
    width: "100%",
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  reasonTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: "#DC2626",
  },
  reason: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: "#7F1D1D",
    lineHeight: 20,
  },
  actionButtonGroup: {
    width: "100%",
    marginTop: Spacing.xl,
    gap: 10,
  },
  resubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    width: "100%",
  },
  resubmitBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.dark,
  },
  logoutBtn: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    width: "100%",
  },
  logoutBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.secondary,
  },
  sheetContent: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.dark,
  },
  sheetSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    color: Colors.secondary,
    marginTop: 2,
    marginBottom: 14,
  },
  sectionHeader: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.dark,
    marginTop: 10,
    marginBottom: 6,
  },
  docRow: {
    flexDirection: "row",
    gap: 10,
  },
  docBox: {
    flex: 1,
    height: 86,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    overflow: "hidden",
  },
  docPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  docPlaceholderText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.secondary,
  },
  docPreviewWrap: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  docImage: {
    width: "100%",
    height: "100%",
  },
  docOverlayBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  docOverlayText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.white,
  },
  notesInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.dark,
    minHeight: 56,
    textAlignVertical: "top",
  },
  sheetFooterRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  cancelSheetBtn: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelSheetBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.secondary,
  },
  submitSheetBtn: {
    flex: 1.8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitSheetBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
});
