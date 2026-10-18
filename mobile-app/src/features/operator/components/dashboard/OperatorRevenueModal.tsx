import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Radius, Spacing } from "@/constants/theme";
import { getOperatorRevenue } from "@/features/operator/services/operatorService";
import {
  AvailableMonth,
  OperatorRevenueData,
  RevenueBookingItem,
} from "@/features/operator/types/operatorService";

interface OperatorRevenueModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function OperatorRevenueModal({
  visible,
  onClose,
}: OperatorRevenueModalProps) {
  const [data, setData] = useState<OperatorRevenueData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRemittanceInfo, setShowRemittanceInfo] = useState(false);

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
    setSelectedMonth(m);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeContainer}>
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <MaterialCommunityIcons
                name="finance"
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.topBarTitle}>Track Revenue</Text>
            </View>
            <Text style={styles.topBarSub}>
              Monthly Gross Revenue & Ride4Rent Platform Commission
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={22} color={Colors.dark} />
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>
              Calculating monthly billing cycle...
            </Text>
          </View>
        ) : (
          <ScrollView
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

            {/* Admin Commission Remittance Accordion */}
            <View style={styles.remittanceCard}>
              <TouchableOpacity
                style={styles.remittanceHeader}
                onPress={() => setShowRemittanceInfo(!showRemittanceInfo)}
                activeOpacity={0.85}
              >
                <View style={styles.remittanceHeaderLeft}>
                  <View style={styles.remittanceIconCircle}>
                    <Ionicons
                      name="information-circle"
                      size={18}
                      color="#D97706"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.remittanceTitle}>
                      Admin Commission Remittance
                    </Text>
                    <Text style={styles.remittanceSub}>
                      How the monthly 10% platform fee is settled
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={showRemittanceInfo ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={Colors.secondary}
                />
              </TouchableOpacity>

              {showRemittanceInfo && (
                <View style={styles.remittanceBody}>
                  <Text style={styles.remittanceExplainer}>
                    Ride4Rent automatically tallies your completed rental
                    transactions each calendar month. At the end of every
                    monthly billing cycle, operators remit the{" "}
                    {data?.commission_percent}% platform commission to the
                    Ride4Rent admin via GCash or Bank Transfer.
                  </Text>
                  <View style={styles.remittanceAccountBox}>
                    <View style={styles.remittanceInfoRow}>
                      <Text style={styles.remittanceKey}>
                        Admin GCash / Maya:
                      </Text>
                      <Text style={styles.remittanceVal}>0917-889-4321</Text>
                    </View>
                    <View style={styles.remittanceInfoRow}>
                      <Text style={styles.remittanceKey}>Account Name:</Text>
                      <Text style={styles.remittanceVal}>
                        Ride4Rent Admin Operations
                      </Text>
                    </View>
                    <View style={styles.remittanceInfoRow}>
                      <Text style={styles.remittanceKey}>
                        Settlement Period:
                      </Text>
                      <Text style={styles.remittanceVal}>
                        End of Month (1st–5th)
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

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
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
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
    flex: 1,
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
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
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
});
