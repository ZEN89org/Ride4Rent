import { AppBottomSheet } from "@/components/common/AppBottomSheet";
import RentalSheetHeader from "@/components/common/RentalSheetHeader";
import { rentalSheetStyle } from "@/constants/rentalDesign";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { copyToClipboard } from "@/utils/clipboard";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import { ActivityIndicator, Modal, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { Skeleton } from "@/components/common/Skeleton";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Radius, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import {
  getOperatorRevenue,
  submitRemittanceProof,
} from "@/features/operator/services/operatorService";
import {
  AvailableMonth,
  OperatorRevenueData,
  RevenueBookingItem,
} from "@/features/operator/types/operatorService";
import { resolveImageUrl } from "@/services/api";

interface OperatorRevenueModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function OperatorRevenueModal({
  visible,
  onClose,
}: OperatorRevenueModalProps) {
  const { showModal, showError } = useAppToast();
  const [data, setData] = useState<OperatorRevenueData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRevenueTrips, setShowRevenueTrips] = useState(false);
  const [showRemittanceInfo, setShowRemittanceInfo] = useState(false);

  // Remittance submission state
  const [paymentMethod, setPaymentMethod] = useState<string>("GCash");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [operatorNotes, setOperatorNotes] = useState<string>("");
  const [submittingRemittance, setSubmittingRemittance] =
    useState<boolean>(false);
  const [copiedGcash, setCopiedGcash] = useState<boolean>(false);
  const [previewReceiptModal, setPreviewReceiptModal] = useState<string | null>(
    null,
  );

  const fetchRevenue = async (month?: string, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await getOperatorRevenue(month);
      setData(res);
      if (!month && res?.month) {
        setSelectedMonth(res.month);
      }
    } catch (e) {
      console.error("Failed to load operator revenue report:", e);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (visible) {
      let active = true;
      getOperatorRevenue(selectedMonth)
        .then((result) => {
          if (active) setData(result);
        })
        .catch((error) =>
          console.error("Failed to load operator revenue report:", error),
        )
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }
  }, [visible, selectedMonth]);

  const handleSelectMonth = (m: string) => {
    setLoading(true);
    setPaymentReference("");
    setReceiptUri(null);
    setSelectedMonth(m);
  };

  const handleCopyAccount = async (num: string) => {
    try {
      const copied = await copyToClipboard(num);
      if (!copied) {
        showError("Copy unavailable", "Please copy the account number manually. Update your development build to enable the Copy button.");
        return;
      }
      setCopiedGcash(true);
      setTimeout(() => setCopiedGcash(false), 2000);
    } catch {}
  };

  const handlePickReceipt = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showModal?.(
          "Permission Required",
          "Please grant photo library access to upload your remittance receipt.",
          [{ text: "OK" }],
          "warning",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setReceiptUri(result.assets[0].uri);
      }
    } catch {
      showError?.("Unable to select image.");
    }
  };

  const handleSubmitProof = async () => {
    if (!data?.month) return;
    if (!/^\d{13}$/.test(paymentReference.trim())) {
      showError?.("Enter the 13-digit GCash reference number.");
      return;
    }
    if (!receiptUri) {
      showError?.("Please upload a photo of your payment receipt.");
      return;
    }

    try {
      setSubmittingRemittance(true);
      await submitRemittanceProof({
        billing_month: data.month,
        payment_method: paymentMethod,
        payment_reference: paymentReference.trim(),
        receipt_image: receiptUri,
        operator_notes: operatorNotes.trim() || undefined,
      });

      showModal?.(
        "Remittance Submitted",
        "Your payment proof has been submitted to Admin for review. Once verified, your status will update immediately.",
        [{ text: "OK" }],
        "success",
      );

      // Reset form
      setPaymentReference("");
      setReceiptUri(null);
      setOperatorNotes("");

      // Refresh data
      await fetchRevenue(selectedMonth, true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Failed to submit remittance. Please try again.";
      showError?.(msg);
    } finally {
      setSubmittingRemittance(false);
    }
  };

  const remittance = data?.remittance;
  const commissionDue = Number(data?.commission_due || 0);
  const canSubmitProof =
    !data?.is_current_cycle && !!data?.admin_payment_info?.account_name && !!data?.admin_payment_info?.account_number && commissionDue > 0 &&
    (!remittance ||
      remittance.status === "pending" ||
      remittance.status === "overdue" ||
      remittance.status === "frozen" ||
      remittance.status === "rejected");

  return (
    <AppBottomSheet visible={visible} onClose={onClose} sheetStyle={rentalSheetStyle}>
        <RentalSheetHeader title="Revenue" subtitle="Monthly earnings and commission" icon="wallet-outline" onClose={onClose} />
        {loading && !refreshing ? (
          <View style={styles.centerLoading}>
            <View style={{ width: "100%", gap: 16, padding: 20 }}><Skeleton height={150} /><Skeleton height={100} /><Skeleton height={100} /></View>
            <Text style={styles.loadingText}>
              Calculating monthly billing cycle...
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchRevenue(selectedMonth, true);
                }}
                colors={[Colors.primary]}
              />
            }
          >
            {/* Month Cycle Selector Carousel */}
            {data?.available_months && data.available_months.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.monthsPillRow}
              >
                {data.available_months.map((m: AvailableMonth) => {
                  const isSelected =
                    selectedMonth === m.month ||
                    (!selectedMonth && m.month === data.month);
                  return (
                    <TouchableOpacity
                      key={m.month}
                      style={[
                        styles.monthPill,
                        isSelected && styles.monthPillActive,
                      ]}
                      onPress={() => handleSelectMonth(m.month)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.monthPillText,
                          isSelected && styles.monthPillTextActive,
                        ]}
                      >
                        {m.label}
                      </Text>
                      {m.count > 0 && (
                        <View
                          style={[
                            styles.monthCountBadge,
                            isSelected && styles.monthCountBadgeActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.monthCountText,
                              isSelected && styles.monthCountTextActive,
                            ]}
                          >
                            {m.count}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Cycle Status Banner */}
            <View style={styles.cycleBanner}>
              <View style={styles.cycleBannerLeft}>
                <Ionicons name="calendar-outline" size={16} color="#0284C7" />
                <Text style={styles.cycleBannerDate}>
                  Cycle: {data?.cycle_start} → {data?.cycle_end}
                </Text>
              </View>
              {data?.is_current_cycle ? (
                <View style={styles.cycleBadgeActive}>
                  <Text style={styles.cycleBadgeActiveText}>
                    {data?.days_remaining_in_cycle}d remaining
                  </Text>
                </View>
              ) : (
                <View style={styles.cycleBadgeArchived}>
                  <Text style={styles.cycleBadgeArchivedText}>
                    Closed Cycle
                  </Text>
                </View>
              )}
            </View>

            {/* Main Financial Summary Card */}
            <View style={styles.mainFinancialCard}>
              <Text style={styles.financialCardHeader}>
                FINANCIAL SUMMARY ({data?.month_label?.toUpperCase() || "MONTH"}
                )
              </Text>

              {/* Net Earnings Hero */}
              <View style={styles.netEarningsHero}>
                <Text style={styles.netEarningsLabel}>
                  Operator Net Take-Home
                </Text>
                <Text style={styles.netEarningsValue}>
                  PHP{" "}
                  {(data?.net_earnings || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <Text style={styles.netEarningsCaption}>
                  After Ride4Rent {data?.commission_percent}% platform fee
                  deduction
                </Text>
              </View>

              <View style={styles.metricDivider} />

              {/* Two Column Metric Row */}
              <View style={styles.twoColumnMetrics}>
                <View style={styles.metricCol}>
                  <Text style={styles.colLabel}>Gross Fleet Revenue</Text>
                  <Text style={styles.colValueGross}>
                    PHP{" "}
                    {(data?.gross_revenue || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                  <Text style={styles.colSub}>
                    {data?.completed_bookings_count || 0} completed rentals
                  </Text>
                </View>

                <View style={styles.metricColDivider} />

                <View style={styles.metricCol}>
                  <Text style={styles.colLabel}>
                    Platform Commission ({data?.commission_percent}%)
                  </Text>
                  <Text style={styles.colValueCommission}>
                    -PHP{" "}
                    {(data?.commission_due || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                  <Text style={styles.colSub}>Due to Ride4Rent Admin</Text>
                </View>
              </View>
            </View>

            {data?.is_current_cycle && <Text style={{ color: Colors.secondary, marginBottom: 12 }}>This month’s totals are provisional. Commission payment opens after the billing month closes.</Text>}
            {/* Admin Commission Remittance Card & Submission */}
            <View style={styles.remittanceCard}>
              <TouchableOpacity
                style={styles.remittanceHeader}
                onPress={() => setShowRemittanceInfo(!showRemittanceInfo)}
                activeOpacity={0.85}
              >
                <View style={styles.remittanceHeaderLeft}>
                  <View style={styles.remittanceIconCircle}>
                    <Ionicons
                      name="wallet-outline"
                      size={18}
                      color="#D97706"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.remittanceTitle}>
                      10% Platform Commission Remittance
                    </Text>
                    <Text style={styles.remittanceSub}>
                      {remittance?.status === "verified" ||
                      remittance?.status === "settled"
                        ? "Settled & verified by Admin"
                        : remittance?.status === "submitted"
                        ? "Payment proof submitted (Under Review)"
                        : remittance?.is_account_frozen
                        ? "Listings Frozen — Immediate Remittance Required"
                        : remittance?.is_grace_expired
                        ? "Overdue — Immediate Remittance Required"
                        : "Due at the end of monthly billing cycle"}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={showRemittanceInfo ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={Colors.secondary}
                />
              </TouchableOpacity>

              {/* Status Banner */}
              {remittance && (
                <View style={styles.remittanceStatusBox}>
                  {remittance.status === "verified" ||
                  remittance.status === "settled" ? (
                    <View style={styles.statusVerifiedRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#16A34A"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.statusVerifiedTitle}>
                          Commission Settled
                        </Text>
                        <Text style={styles.statusVerifiedSub}>
                          Payment verified by Admin. Listings active & eligible
                          for new bookings.
                        </Text>
                      </View>
                    </View>
                  ) : remittance.status === "submitted" ? (
                    <View style={styles.statusSubmittedRow}>
                      <Ionicons name="time" size={20} color="#0284C7" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.statusSubmittedTitle}>
                          Proof Submitted — Under Admin Review
                        </Text>
                        <Text style={styles.statusSubmittedSub}>
                          Method: {remittance.payment_method} • Ref:{" "}
                          {remittance.payment_reference}
                        </Text>
                        {remittance.submitted_at && (
                          <Text style={styles.statusSubmittedDate}>
                            Submitted on {remittance.submitted_at}
                          </Text>
                        )}
                      </View>
                      {remittance.receipt_image_url && (
                        <TouchableOpacity
                          onPress={() =>
                            setPreviewReceiptModal(
                              resolveImageUrl(remittance.receipt_image_url),
                            )
                          }
                          style={styles.viewReceiptPill}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name="image-outline"
                            size={14}
                            color="#0284C7"
                          />
                          <Text style={styles.viewReceiptText}>Receipt</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : remittance.is_account_frozen ? (
                    <View style={styles.statusFrozenRow}>
                      <Ionicons name="snow" size={20} color="#DC2626" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.statusFrozenTitle}>
                          Listings Frozen (No New Bookings)
                        </Text>
                        <Text style={styles.statusFrozenSub}>
                          48-hour grace period expired. Listed vehicles are hidden
                          from search. Remit ₱
                          {commissionDue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          below to restore bookings.
                        </Text>
                      </View>
                    </View>
                  ) : remittance.grace_hours_remaining &&
                    remittance.grace_hours_remaining > 0 &&
                    !data?.is_current_cycle ? (
                    <View style={styles.statusGraceRow}>
                      <Ionicons
                        name="alert-circle"
                        size={20}
                        color="#D97706"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.statusGraceTitle}>
                          48-Hour Grace Period Active (
                          {remittance.grace_hours_remaining}h left)
                        </Text>
                        <Text style={styles.statusGraceSub}>
                          Remit 10% commission before grace expires to prevent
                          automatic listing freeze.
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              )}

              {/* Explainer / Admin Account Info Accordion */}
              {showRemittanceInfo && (
                <View style={styles.remittanceBody}>
                  <Text style={styles.remittanceExplainer}>
                    Ride4Rent automatically tallies your completed rental
                    transactions each calendar month. At the end of every
                    monthly billing cycle, operators remit the{" "}
                    {data?.commission_percent}% platform commission to
                    Ride4Rent via GCash within the 48-hour grace period.
                  </Text>
                  <View style={styles.remittanceAccountBox}>
                    <View style={styles.remittanceInfoRow}>
                      <Text style={styles.remittanceKey}>
                        Admin GCash:
                      </Text>
                      <TouchableOpacity
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                        onPress={() => handleCopyAccount(data?.admin_payment_info?.account_number || "")}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.remittanceVal}>{data?.admin_payment_info?.account_number || "Not configured — contact support"}</Text>
                        <Ionicons
                          name={copiedGcash ? "checkmark" : "copy-outline"}
                          size={14}
                          color={copiedGcash ? "#16A34A" : Colors.secondary}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.remittanceInfoRow}>
                      <Text style={styles.remittanceKey}>Account Name:</Text>
                      <Text style={styles.remittanceVal}>
                        {data?.admin_payment_info?.account_name || "Not configured"}
                      </Text>
                    </View>
                    <View style={styles.remittanceInfoRow}>
                      <Text style={styles.remittanceKey}>Grace Window:</Text>
                      <Text style={styles.remittanceVal}>
                        48 Hours after month-end
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Remittance Submission Form */}
              {canSubmitProof && (
                <View style={styles.remittanceFormContainer}>
                  <View style={styles.formHeaderRow}>
                    <Ionicons
                      name="card-outline"
                      size={16}
                      color={Colors.dark}
                    />
                    <Text style={styles.formHeaderText}>
                      Submit Proof of Remittance
                    </Text>
                  </View>

                  {/* Payment Method Selector */}
                  <Text style={styles.formLabel}>Payment Method</Text>
                  <View style={styles.methodSelectorRow}>
                    {["GCash"].map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.methodPill,
                          paymentMethod === m && styles.methodPillActive,
                        ]}
                        onPress={() => setPaymentMethod(m)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.methodPillText,
                            paymentMethod === m && styles.methodPillTextActive,
                          ]}
                        >
                          {m}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Payment Reference Number */}
                  <Text style={styles.formLabel}>
                    Reference / Transaction No.
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 100982347182"
                    placeholderTextColor="#94A3B8"
                    value={paymentReference}
                    onChangeText={(value) => setPaymentReference(value.replace(/\D/g, "").slice(0, 13))}
                    autoCapitalize="characters"
                  />

                  {/* Receipt Photo */}
                  <Text style={styles.formLabel}>
                    Receipt / Proof Screenshot
                  </Text>
                  {receiptUri ? (
                    <View style={styles.receiptPreviewBox}>
                      <Image
                        source={{ uri: receiptUri }}
                        style={styles.receiptPreviewImg}
                        contentFit="cover"
                      />
                      <TouchableOpacity
                        style={styles.receiptRemoveBtn}
                        onPress={() => setReceiptUri(null)}
                      >
                        <Ionicons name="trash" size={14} color={Colors.white} />
                        <Text style={styles.receiptRemoveText}>Change</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.uploadReceiptBtn}
                      onPress={handlePickReceipt}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="camera-outline"
                        size={20}
                        color={Colors.secondary}
                      />
                      <Text style={styles.uploadReceiptText}>
                        Upload Receipt Photo
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Optional Notes */}
                  <Text style={styles.formLabel}>
                    Notes for Admin (Optional)
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Any notes or remarks..."
                    placeholderTextColor="#94A3B8"
                    value={operatorNotes}
                    onChangeText={setOperatorNotes}
                  />

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[
                      styles.submitRemittanceBtn,
                      submittingRemittance && styles.submitBtnDisabled,
                    ]}
                    onPress={handleSubmitProof}
                    disabled={submittingRemittance}
                    activeOpacity={0.85}
                  >
                    {submittingRemittance ? (
                      <ActivityIndicator size="small" color={Colors.dark} />
                    ) : (
                      <>
                        <Ionicons
                          name="cloud-upload"
                          size={16}
                          color={Colors.dark}
                        />
                        <Text style={styles.submitRemittanceBtnText}>
                          Submit Proof (₱
                          {commissionDue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          )
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity onPress={() => setShowRevenueTrips(!showRevenueTrips)} style={{ paddingVertical: 14 }}><Text style={{ fontFamily: FontFamily.semiBold, color: Colors.dark }}>{showRevenueTrips ? "Hide" : "View"} completed trips ({data?.completed_bookings_count || 0})</Text></TouchableOpacity>
            {showRevenueTrips && <>
            {/* Itemized Bookings Breakdown Section */}
            <View style={styles.breakdownHeaderRow}>
              <Text style={styles.breakdownSectionTitle}>
                Completed Rentals Breakdown ({data?.bookings?.length || 0})
              </Text>
            </View>

            {!data?.bookings || data.bookings.length === 0 ? (
              <View style={styles.emptyBookingsCard}>
                <Ionicons
                  name="receipt-outline"
                  size={36}
                  color={Colors.secondary}
                />
                <Text style={styles.emptyBookingsTitle}>
                  No Completed Bookings
                </Text>
                <Text style={styles.emptyBookingsSub}>
                  Completed trips for {data?.month_label || "this cycle"} will
                  appear here with automated 10% commission calculations.
                </Text>
              </View>
            ) : (
              data.bookings.map((b: RevenueBookingItem) => (
                <View key={b.id} style={styles.bookingRowCard}>
                  <View style={styles.bookingRowTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bookingVehicleTitle}>
                        {b.vehicle_name}
                      </Text>
                      <Text style={styles.bookingRenterSubtitle}>
                        Renter: {b.renter_name} • {b.booking_code}
                      </Text>
                      <Text style={styles.bookingDateSubtitle}>
                        Completed: {b.completed_at}
                      </Text>
                    </View>
                    <View style={styles.bookingNetBadge}>
                      <Text style={styles.bookingNetBadgeLabel}>
                        Net Earnings
                      </Text>
                      <Text style={styles.bookingNetBadgeAmount}>
                        PHP{" "}
                        {b.net_amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.bookingMathRow}>
                    <View style={styles.mathItem}>
                      <Text style={styles.mathItemLabel}>Gross Rent</Text>
                      <Text style={styles.mathItemVal}>
                        PHP {b.gross_total.toLocaleString()}
                      </Text>
                    </View>
                    <Text style={styles.mathOp}>-</Text>
                    <View style={styles.mathItem}>
                      <Text style={styles.mathItemLabel}>Admin 10%</Text>
                      <Text style={styles.mathItemValDanger}>
                        PHP{" "}
                        {b.commission_amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                    <Text style={styles.mathOp}>=</Text>
                    <View style={styles.mathItem}>
                      <Text style={styles.mathItemLabel}>Operator</Text>
                      <Text style={styles.mathItemValSuccess}>
                        PHP{" "}
                        {b.net_amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
            </>}
          </ScrollView>
        )}

        {/* Receipt Image Preview Modal */}
        <Modal
          visible={Boolean(previewReceiptModal)}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewReceiptModal(null)}
        >
          <View style={styles.previewModalOverlay}>
            <TouchableOpacity
              style={styles.previewModalCloseBtn}
              onPress={() => setPreviewReceiptModal(null)}
            >
              <Ionicons name="close" size={22} color={Colors.white} />
            </TouchableOpacity>
            {previewReceiptModal && (
              <Image
                source={{ uri: previewReceiptModal }}
                style={styles.previewModalImg}
                contentFit="contain"
              />
            )}
          </View>
        </Modal>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  topBarTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.subheading,
    color: Colors.dark,
  },
  topBarSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.secondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  centerLoading: {
    minHeight: 280,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.secondary,
  },
  scrollContent: {
    paddingTop: 2,
    paddingBottom: 18,
    gap: 14,
  },
  monthsPillRow: {
    gap: 8,
    paddingBottom: 4,
  },
  monthPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  monthPillActive: {
    backgroundColor: Colors.dark,
    borderColor: Colors.dark,
  },
  monthPillText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: Colors.dark,
  },
  monthPillTextActive: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
  },
  monthCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: "#E2E8F0",
  },
  monthCountBadgeActive: {
    backgroundColor: Colors.primary,
  },
  monthCountText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  monthCountTextActive: {
    color: Colors.dark,
  },
  cycleBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  cycleBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cycleBannerDate: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: "#1E40AF",
  },
  cycleBadgeActive: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: "#DBEAFE",
  },
  cycleBadgeActiveText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: "#1D4ED8",
    textTransform: "uppercase",
  },
  cycleBadgeArchived: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: "#E2E8F0",
  },
  cycleBadgeArchivedText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: "#475569",
    textTransform: "uppercase",
  },
  mainFinancialCard: {
    backgroundColor: "#0F172A",
    borderRadius: Radius.lg,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  financialCardHeader: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1,
    color: "#94A3B8",
    marginBottom: 10,
  },
  netEarningsHero: {
    marginBottom: 14,
  },
  netEarningsLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: "#CBD5E1",
  },
  netEarningsValue: {
    fontFamily: FontFamily.bold,
    fontSize: 32,
    color: "#10B981",
    marginVertical: 4,
  },
  netEarningsCaption: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: "#94A3B8",
  },
  metricDivider: {
    height: 1,
    backgroundColor: "#1E293B",
    marginVertical: 12,
  },
  twoColumnMetrics: {
    flexDirection: "row",
    alignItems: "center",
  },
  metricCol: {
    flex: 1,
  },
  metricColDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#1E293B",
    marginHorizontal: 12,
  },
  colLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#94A3B8",
  },
  colValueGross: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.white,
    marginTop: 2,
  },
  colValueCommission: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: "#F87171",
    marginTop: 2,
  },
  colSub: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  remittanceCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "#FDE68A",
    overflow: "hidden",
  },
  remittanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  remittanceHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  remittanceIconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  },
  remittanceTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.caption,
    color: "#92400E",
  },
  remittanceSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: "#B45309",
    marginTop: 1,
  },
  remittanceBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#FEF3C7",
    paddingTop: 10,
    gap: 10,
  },
  remittanceExplainer: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: "#78350F",
    lineHeight: 18,
  },
  remittanceAccountBox: {
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FCD34D",
    gap: 6,
  },
  remittanceInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  remittanceKey: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.secondary,
  },
  remittanceVal: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.dark,
  },
  breakdownHeaderRow: {
    marginTop: 6,
  },
  breakdownSectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.dark,
  },
  emptyBookingsCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  emptyBookingsTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.dark,
    marginTop: 4,
  },
  emptyBookingsSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 18,
  },
  bookingRowCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  bookingRowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  bookingVehicleTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.dark,
  },
  bookingRenterSubtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.caption,
    color: Colors.secondary,
    marginTop: 2,
  },
  bookingDateSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  bookingNetBadge: {
    alignItems: "flex-end",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  bookingNetBadgeLabel: {
    fontSize: 9,
    fontFamily: FontFamily.medium,
    color: "#166534",
  },
  bookingNetBadgeAmount: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.caption,
    color: "#15803D",
    marginTop: 1,
  },
  bookingMathRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: Radius.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  mathItem: {
    alignItems: "center",
  },
  mathItemLabel: {
    fontSize: 10,
    fontFamily: FontFamily.regular,
    color: Colors.secondary,
  },
  mathItemVal: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    color: Colors.dark,
    marginTop: 1,
  },
  mathItemValDanger: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    color: "#DC2626",
    marginTop: 1,
  },
  mathItemValSuccess: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    color: "#16A34A",
    marginTop: 1,
  },
  mathOp: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.secondary,
  },
  remittanceStatusBox: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  statusVerifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F0FDF4",
    padding: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  statusVerifiedTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: "#166534",
  },
  statusVerifiedSub: {
    fontFamily: FontFamily.regular,
    fontSize: 10.5,
    color: "#15803D",
    marginTop: 1,
  },
  statusSubmittedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F0F9FF",
    padding: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  statusSubmittedTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: "#0369A1",
  },
  statusSubmittedSub: {
    fontFamily: FontFamily.medium,
    fontSize: 10.5,
    color: "#0284C7",
    marginTop: 1,
  },
  statusSubmittedDate: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  viewReceiptPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  viewReceiptText: {
    fontFamily: FontFamily.bold,
    fontSize: 10.5,
    color: "#0284C7",
  },
  statusFrozenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    padding: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  statusFrozenTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: "#991B1B",
  },
  statusFrozenSub: {
    fontFamily: FontFamily.regular,
    fontSize: 10.5,
    color: "#B91C1C",
    marginTop: 1,
    lineHeight: 15,
  },
  statusGraceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFBEB",
    padding: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  statusGraceTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: "#92400E",
  },
  statusGraceSub: {
    fontFamily: FontFamily.regular,
    fontSize: 10.5,
    color: "#B45309",
    marginTop: 1,
  },
  remittanceFormContainer: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#FEF3C7",
    backgroundColor: Colors.white,
    gap: 8,
  },
  formHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  formHeaderText: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    color: Colors.dark,
  },
  formLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#475569",
    marginTop: 4,
  },
  methodSelectorRow: {
    flexDirection: "row",
    gap: 8,
  },
  methodPill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: Radius.sm,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  methodPillActive: {
    backgroundColor: Colors.dark,
    borderColor: Colors.dark,
  },
  methodPillText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#475569",
  },
  methodPillTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  formInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.dark,
  },
  uploadReceiptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    borderRadius: Radius.md,
    paddingVertical: 14,
  },
  uploadReceiptText: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: Colors.secondary,
  },
  receiptPreviewBox: {
    position: "relative",
    borderRadius: Radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  receiptPreviewImg: {
    width: "100%",
    height: 120,
    backgroundColor: "#F1F5F9",
  },
  receiptRemoveBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  receiptRemoveText: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: 10,
  },
  submitRemittanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 12,
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitRemittanceBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    color: Colors.dark,
  },
  previewModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  previewModalCloseBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  previewModalImg: {
    width: "95%",
    height: "75%",
    borderRadius: Radius.md,
  },
});
