import { AppBottomSheet } from "@/components/common/AppBottomSheet";
import ListPagination from "@/components/common/ListPagination";
import { Skeleton } from "@/components/common/Skeleton";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import OperatorShell from "@/features/operator/components/navigation/OperatorShell";
import {
  deleteVehicle,
  getMyVehicles,
  updateVehicle,
} from "@/features/operator/services/vehicleService";
import { Vehicle } from "@/features/operator/types/vehicle";
import { resolveImageUrl } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function OperatorVehiclesScreen() {
  const { user, isOperatorPending } = useAuth();
  const { showModal, showSuccess, showError } = useAppToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const vehiclesFlatListRef = React.useRef<FlatList>(null);

  // Vehicle Edit BottomSheet State
  const [selectedVehicleForEdit, setSelectedVehicleForEdit] =
    useState<Vehicle | null>(null);
  const [editDailyRate, setEditDailyRate] = useState("");
  const [editReservationFee, setEditReservationFee] = useState("");
  const [editStatus, setEditStatus] = useState<
    "available" | "unavailable" | "maintenance"
  >("available");
  const [editDescription, setEditDescription] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const profile =
    (user as any)?.operatorProfile ?? (user as any)?.operator_profile;

  const handleAddCar = () => {
    if (isOperatorPending) {
      showModal(
        "Account Under Review",
        "You cannot list new vehicles while your account is pending administrator review. Once your business documents are verified, vehicle listing will be unlocked.",
        [{ text: "Understood", style: "default" }],
        "warning",
      );
      return;
    }

    const hasPaymentSetup = Boolean(
      profile?.account_number && String(profile.account_number).trim(),
    );
    if (!hasPaymentSetup) {
      showModal(
        "Payment Setup Required",
        "Please set up your GCash rental payment details first before listing a vehicle, so renters know where to send reservation fees.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Set Up Now",
            onPress: () => router.push("/operator-profile" as any),
          },
        ],
        "warning",
      );
      return;
    }

    router.push("/operator-vehicle-upload" as any);
  };

  const load = useCallback(async () => {
    try {
      const data = await getMyVehicles();
      setVehicles(data);
    } catch {
      console.error("Unable to load fleet vehicles.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getMyVehicles()
      .then((data) => {
        if (active) setVehicles(data);
      })
      .catch(() => console.error("Unable to load fleet vehicles."))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const openEditModal = (v: Vehicle) => {
    setSelectedVehicleForEdit(v);
    setEditDailyRate(String(v.price_per_day || ""));
    setEditReservationFee(String(v.reservation_fee || "0"));
    const rawStatus =
      (v.availability_status as any) ||
      (v.is_available ? "available" : "unavailable");
    const normalized =
      rawStatus === "maintenance"
        ? "maintenance"
        : rawStatus === "unavailable"
          ? "unavailable"
          : "available";
    setEditStatus(normalized);
    setEditDescription(v.description || "");
  };

  const handleSaveVehicleEdit = async () => {
    if (!selectedVehicleForEdit) return;
    const rateNum = parseFloat(editDailyRate);
    if (isNaN(rateNum) || rateNum <= 0) {
      showModal(
        "Validation Error",
        "Please enter a valid daily rental rate greater than ₱0.",
        [{ text: "OK" }],
        "warning",
      );
      return;
    }

    try {
      setSubmittingEdit(true);
      await updateVehicle(selectedVehicleForEdit.id, {
        daily_rate: rateNum,
        reservation_fee: parseFloat(editReservationFee) || 0,
        availability_status: editStatus,
        description: editDescription.trim() || undefined,
      });
      showSuccess(
        "Vehicle Updated",
        `Settings for "${selectedVehicleForEdit.name}" saved.`,
      );
      setSelectedVehicleForEdit(null);
      load();
    } catch (e: any) {
      showError(
        "Update Failed",
        e.response?.data?.message || "Could not update vehicle.",
      );
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteVehicle = (v: Vehicle) => {
    if (v.is_rented) {
      showModal(
        "Vehicle Currently Rented",
        `"${v.name}" is currently on an active trip and cannot be deleted until the trip is completed.`,
        [{ text: "OK" }],
        "warning",
      );
      return;
    }

    showModal(
      "Delete Vehicle",
      `Are you sure you want to permanently remove "${v.name}" from your catalog? This cannot be undone.`,
      [
        { text: "Keep Vehicle", style: "cancel" },
        {
          text: "Yes, Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVehicle(v.id);
              showSuccess(
                "Vehicle Removed",
                `"${v.name}" has been removed from your fleet.`,
              );
              setVehicles((prev) => prev.filter((item) => item.id !== v.id));
            } catch (e: any) {
              showError(
                "Delete Failed",
                e.response?.data?.message || "Could not delete vehicle.",
              );
            }
          },
        },
      ],
      "confirm",
    );
  };

  const getStatusBadge = (item: Vehicle) => {
    if (item.is_rented) {
      return {
        label: "On Active Trip",
        bg: "#EFF6FF",
        text: "#2563EB",
        border: "#BFDBFE",
        dot: "#2563EB",
      };
    }
    const status =
      item.availability_status ||
      (item.is_available ? "available" : "unavailable");
    if (status === "maintenance") {
      return {
        label: "Under Maintenance",
        bg: "#FEF3C7",
        text: "#D97706",
        border: "#FDE68A",
        dot: "#D97706",
      };
    }
    if (status === "unavailable" || !item.is_available) {
      return {
        label: "Unavailable",
        bg: "#F1F5F9",
        text: "#64748B",
        border: "#CBD5E1",
        dot: "#94A3B8",
      };
    }
    return {
      label: "Available",
      bg: "#ECFDF5",
      text: "#059669",
      border: "#A7F3D0",
      dot: "#10B981",
    };
  };

  return (
    <OperatorShell activeRoute="vehicles">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Fleet Catalog</Text>
            <Text style={styles.subtitle}>
              {vehicles.length}{" "}
              {vehicles.length === 1 ? "car listed" : "cars listed in fleet"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAddCar}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color={Colors.dark} />
            <Text style={styles.addBtnText}>Add Car</Text>
          </TouchableOpacity>
        </View>

        {isOperatorPending && (
          <View style={styles.pendingNotice}>
            <Ionicons name="time" size={18} color="#D97706" />
            <Text style={styles.pendingNoticeText}>
              Your account is currently under review by the Admin. Vehicle
              listing will be enabled once your documents are approved.
            </Text>
          </View>
        )}

        {!Boolean(
          profile?.account_number && String(profile.account_number).trim(),
        ) && (
          <TouchableOpacity
            style={styles.paymentNoticeBanner}
            onPress={() => router.push("/operator-profile" as any)}
            activeOpacity={0.85}
          >
            <View style={styles.paymentNoticeIconCircle}>
              <Ionicons name="card" size={16} color="#B45309" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentNoticeTitle}>
                Rental Payment Not Set Up
              </Text>
              <Text style={styles.paymentNoticeText}>
                Set up your GCash details so you can list vehicles and receive
                reservation fees. Tap to configure.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#B45309" />
          </TouchableOpacity>
        )}

        {loading && !refreshing ? (
          <View style={{ gap: 14 }}>
            <Skeleton height={130} borderRadius={18} />
            <Skeleton height={130} borderRadius={18} />
          </View>
        ) : vehicles.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Your Fleet is Empty</Text>
            <Text style={styles.emptySubtitle}>
              Publish your first vehicle to start receiving rental requests and
              bookings from renters.
            </Text>
            <TouchableOpacity
              style={styles.addFirstBtn}
              onPress={handleAddCar}
              activeOpacity={0.85}
            >
              <Text style={styles.addFirstBtnText}>+ Add First Car</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={vehiclesFlatListRef}
            data={
              vehicles.length > 15
                ? vehicles.slice((currentPage - 1) * 15, currentPage * 15)
                : vehicles
            }
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  load();
                }}
                colors={[Colors.primary]}
              />
            }
            ListFooterComponent={
              vehicles.length > 15 ? (
                <ListPagination
                  currentPage={currentPage}
                  totalItems={vehicles.length}
                  pageSize={15}
                  itemName="vehicles"
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    vehiclesFlatListRef.current?.scrollToOffset({
                      offset: 0,
                      animated: true,
                    });
                  }}
                />
              ) : null
            }
            renderItem={({ item }) => {
              const statusCfg = getStatusBadge(item);
              return (
                <View style={styles.card}>
                  <View style={styles.cardMainRow}>
                    <Image
                      source={{
                        uri:
                          resolveImageUrl(item.image_url) ||
                          "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60",
                      }}
                      style={styles.image}
                    />

                    <View style={styles.details}>
                      <View style={styles.nameRow}>
                        <Text style={styles.vehicleName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: statusCfg.bg,
                              borderColor: statusCfg.border,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: statusCfg.dot },
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              { color: statusCfg.text },
                            ]}
                          >
                            {statusCfg.label}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.specsText}>
                        {item.transmission || "Auto"} • {item.seats || 5} Seats
                        • {item.fuel_type || "Gas"}
                      </Text>

                      <View style={styles.priceRow}>
                        <Text style={styles.price}>
                          ₱{Number(item.price_per_day).toLocaleString()}
                          <Text style={styles.pricePeriod}> / day</Text>
                        </Text>
                        {Number(item.reservation_fee) > 0 ? (
                          <Text style={styles.depositText}>
                            Deposit: ₱
                            {Number(item.reservation_fee).toLocaleString()}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  {/* Actions Row */}
                  <View style={styles.cardActionRow}>
                    <TouchableOpacity
                      style={styles.manageBtn}
                      onPress={() => openEditModal(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="options-outline"
                        size={14}
                        color={Colors.dark}
                      />
                      <Text style={styles.manageBtnText}>Manage & Rates</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.previewBtn}
                      onPress={() => router.push(`/vehicles/${item.id}` as any)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="eye-outline"
                        size={14}
                        color={Colors.dark}
                      />
                      <Text style={styles.previewBtnText}>Preview</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteVehicle(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={14}
                        color="#DC2626"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Edit Vehicle BottomSheet */}
        <AppBottomSheet
          visible={!!selectedVehicleForEdit}
          onClose={() => setSelectedVehicleForEdit(null)}
          position="bottom"
          showHandle={true}
          sheetStyle={styles.editSheet}
        >
          <Text style={styles.sheetTitle}>Manage Vehicle</Text>
          <Text style={styles.sheetSub}>{selectedVehicleForEdit?.name}</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 380 }}
          >
            {/* Availability Status Selector */}
            <Text style={styles.fieldLabel}>Availability Status</Text>
            <View style={styles.statusOptionsRow}>
              {[
                {
                  id: "available",
                  label: "Available",
                  icon: "checkmark-circle",
                  color: "#059669",
                },
                {
                  id: "maintenance",
                  label: "Maintenance",
                  icon: "construct",
                  color: "#D97706",
                },
                {
                  id: "unavailable",
                  label: "Unavailable",
                  icon: "pause-circle",
                  color: "#64748B",
                },
              ].map((opt) => {
                const isSelected = editStatus === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.statusOptionBtn,
                      isSelected && styles.statusOptionBtnActive,
                    ]}
                    onPress={() => setEditStatus(opt.id as any)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={13}
                      color={isSelected ? Colors.dark : opt.color}
                    />
                    <Text
                      style={[
                        styles.statusOptionText,
                        isSelected && styles.statusOptionTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Daily Rental Rate */}
            <Text style={styles.fieldLabel}>Daily Rental Rate (₱) *</Text>
            <View style={styles.inputBox}>
              <Text style={styles.currencyPrefix}>₱</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={editDailyRate}
                onChangeText={setEditDailyRate}
                placeholder="e.g. 1500"
                placeholderTextColor={Colors.secondary}
              />
              <Text style={styles.unitSuffix}>/ day</Text>
            </View>

            {/* Reservation Fee */}
            <Text style={styles.fieldLabel}>Reservation Fee Deposit (₱)</Text>
            <View style={styles.inputBox}>
              <Text style={styles.currencyPrefix}>₱</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={editReservationFee}
                onChangeText={setEditReservationFee}
                placeholder="e.g. 500"
                placeholderTextColor={Colors.secondary}
              />
            </View>

            {/* Description / Special Notes */}
            <Text style={styles.fieldLabel}>Description & Features</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              multiline
              numberOfLines={3}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Mention vehicle highlights, inclusions, or pickup details..."
              placeholderTextColor={Colors.secondary}
            />
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.sheetActionsRow}>
            <TouchableOpacity
              style={styles.cancelSheetBtn}
              onPress={() => setSelectedVehicleForEdit(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelSheetBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveSheetBtn}
              onPress={handleSaveVehicleEdit}
              disabled={submittingEdit}
              activeOpacity={0.88}
            >
              <Ionicons name="checkmark-done" size={16} color={Colors.dark} />
              <Text style={styles.saveSheetBtnText}>
                {submittingEdit ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          </View>
        </AppBottomSheet>
      </View>
    </OperatorShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
  },
  subtitle: {
    color: Colors.secondary,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: 13,
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: Spacing.md,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardMainRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  image: {
    height: 84,
    width: 100,
    borderRadius: 12,
    backgroundColor: Colors.inputBackground,
  },
  details: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vehicleName: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: 15,
    flex: 1,
    marginRight: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
  },
  specsText: {
    color: Colors.secondary,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    marginTop: 3,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  price: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  pricePeriod: {
    color: Colors.secondary,
    fontFamily: FontFamily.regular,
    fontSize: 10,
  },
  depositText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.secondary,
  },
  cardActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    alignItems: "center",
  },
  manageBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    borderRadius: 10,
  },
  manageBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },
  previewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  previewBtnText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.dark,
  },
  deleteBtn: {
    backgroundColor: "#FEF2F2",
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 32,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: 18,
    textAlign: "center",
  },
  emptySubtitle: {
    color: Colors.secondary,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: Spacing.sm,
  },
  addFirstBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: 24,
  },
  addFirstBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  pendingNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  pendingNoticeText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 18,
    color: "#92400E",
  },
  paymentNoticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  paymentNoticeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentNoticeTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: "#92400E",
  },
  paymentNoticeText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    lineHeight: 15,
    color: "#B45309",
    marginTop: 2,
  },
  editSheet: {
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
  sheetSub: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    marginBottom: 16,
    marginTop: 2,
  },
  fieldLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.dark,
    marginBottom: 6,
    marginTop: 12,
  },
  statusOptionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusOptionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 9,
    borderRadius: 10,
  },
  statusOptionBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusOptionText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.secondary,
  },
  statusOptionTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.secondary,
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.dark,
  },
  unitSuffix: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
  },
  textArea: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 70,
    textAlignVertical: "top",
  },
  sheetActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
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
  saveSheetBtn: {
    flex: 1.6,
    flexDirection: "row",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveSheetBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
});
