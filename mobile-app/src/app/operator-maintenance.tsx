import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import {
  getOperatorMaintenanceList,
  logVehicleMaintenance,
  VehicleHealthInfo,
} from "@/services/maintenanceService";

export default function OperatorMaintenanceScreen() {
  const { showSuccess, showError } = useAppToast();
  const [vehicles, setVehicles] = useState<VehicleHealthInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Log Service Modal state
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleHealthInfo | null>(null);
  const [serviceType, setServiceType] = useState("Oil & Filter Change");
  const [mileageInput, setMileageInput] = useState("");
  const [costInput, setCostInput] = useState("");
  const [performedByInput, setPerformedByInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await getOperatorMaintenanceList();
      setVehicles(data);
    } catch (e) {
      console.log("Error loading maintenance data:", e);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openLogModal = (v: VehicleHealthInfo) => {
    setSelectedVehicle(v);
    setServiceType("Oil & Filter Change");
    setMileageInput(String(v.current_odometer || 25000));
    setCostInput("1500");
    setPerformedByInput("QuickLube Calapan");
    setNotesInput("");
  };

  const handleSaveMaintenance = async () => {
    if (!selectedVehicle) return;
    const mileageNum = parseInt(mileageInput, 10);
    if (isNaN(mileageNum) || mileageNum < 0) {
      showError("Validation", "Please enter a valid mileage.");
      return;
    }

    try {
      setSubmitting(true);
      await logVehicleMaintenance({
        vehicle_id: selectedVehicle.id,
        service_type: serviceType,
        mileage_at_service: mileageNum,
        cost: parseFloat(costInput) || 0,
        service_date: new Date().toISOString().split("T")[0],
        performed_by: performedByInput.trim() || undefined,
        notes: notesInput.trim() || undefined,
      });

      showSuccess("Maintenance Logged", `${serviceType} recorded for ${selectedVehicle.name}.`);
      setSelectedVehicle(null);
      loadData(true);
    } catch (e: any) {
      showError("Error", e.response?.data?.message || "Failed to log maintenance.");
    } finally {
      setSubmitting(false);
    }
  };

  const overdueCount = vehicles.filter((v) => v.health_status === "overdue").length;
  const dueSoonCount = vehicles.filter((v) => v.health_status === "due_soon").length;
  const goodCount = vehicles.filter((v) => v.health_status === "good").length;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fleet Maintenance & Health</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => loadData(false)} activeOpacity={0.7}>
          <Ionicons name="refresh" size={18} color={Colors.dark} />
        </TouchableOpacity>
      </View>

      {/* Overview Stat Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: "#10B981" }]}>
          <Text style={styles.statNumber}>{goodCount}</Text>
          <Text style={styles.statLabel}>Optimal</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#F59E0B" }]}>
          <Text style={[styles.statNumber, { color: "#D97706" }]}>{dueSoonCount}</Text>
          <Text style={styles.statLabel}>Due Soon</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Colors.error }]}>
          <Text style={[styles.statNumber, { color: Colors.error }]}>{overdueCount}</Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Analyzing fleet health...</Text>
        </View>
      ) : vehicles.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No Vehicles Registered</Text>
          <Text style={styles.emptySub}>Upload vehicles to your fleet to begin tracking mileage and preventive maintenance recommendations.</Text>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              colors={[Colors.primary]}
            />
          }
          renderItem={({ item }) => {
            const progress = Math.min(1, Math.max(0, item.km_since_last_service / item.service_interval_km));
            const isAlert = item.health_status !== "good";

            return (
              <View style={styles.vehicleCard}>
                {/* Top vehicle info row */}
                <View style={styles.vehicleHeaderRow}>
                  <Image
                    source={item.image_url ? { uri: item.image_url } : { uri: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800" }}
                    style={styles.vehicleThumb}
                    contentFit="cover"
                  />
                  <View style={styles.vehicleInfoCol}>
                    <Text style={styles.vehicleName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.vehiclePlate}>{item.plate_number ? `Plate: ${item.plate_number}` : `${item.brand || ""} ${item.model || ""}`}</Text>
                    <View style={[
                      styles.healthBadgePill,
                      item.health_status === "overdue" && styles.badgeOverdue,
                      item.health_status === "due_soon" && styles.badgeDueSoon,
                      item.health_status === "good" && styles.badgeGood,
                    ]}>
                      <Text style={[
                        styles.healthBadgeText,
                        item.health_status === "overdue" && { color: "#DC2626" },
                        item.health_status === "due_soon" && { color: "#D97706" },
                        item.health_status === "good" && { color: "#059669" },
                      ]}>
                        {item.health_badge}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Mileage Tracker Progress Bar */}
                <View style={styles.mileageSection}>
                  <View style={styles.mileageLabelsRow}>
                    <Text style={styles.mileageLabel}>ODOMETER: {item.current_odometer.toLocaleString()} km</Text>
                    <Text style={styles.mileageLabel}>Next Milestone: {(item.last_service_odometer + item.service_interval_km).toLocaleString()} km</Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${progress * 100}%` },
                        item.health_status === "overdue" ? { backgroundColor: Colors.error } : item.health_status === "due_soon" ? { backgroundColor: "#F59E0B" } : { backgroundColor: Colors.primary },
                      ]}
                    />
                  </View>
                  <Text style={styles.healthStatusLabelText}>{item.health_label}</Text>
                </View>

                {/* AI / Algorithm Maintenance Recommendations */}
                {item.recommendations && item.recommendations.length > 0 && (
                  <View style={styles.recoSection}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 }}>
                      <Ionicons name="bulb-outline" size={14} color="#D97706" />
                      <Text style={styles.recoHeaderTitle}>Maintenance Recommendation:</Text>
                    </View>
                    {item.recommendations.map((rec, idx) => (
                      <View key={idx} style={styles.recoItemBox}>
                        <Ionicons name="warning" size={15} color={rec.urgency === "critical" ? Colors.error : "#D97706"} />
                        <Text style={styles.recoItemText}>{rec.message}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Action Row */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.logServiceBtn}
                    onPress={() => openLogModal(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle-outline" size={16} color={Colors.dark} />
                    <Text style={styles.logServiceBtnText}>Log Service Record</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Log Maintenance Record Modal */}
      <Modal
        visible={!!selectedVehicle}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedVehicle(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedVehicle(null)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Log Service Record</Text>
            <Text style={styles.modalSubtitle}>{selectedVehicle?.name}</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
              <View>
                <Text style={styles.inputLabel}>Service / Maintenance Type</Text>
                <View style={styles.serviceChipsRow}>
                  {["Oil & Filter Change", "Brake Pad Check", "Tire Rotation", "Engine Tune-up", "Battery Change"].map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.serviceChip, serviceType === t && styles.serviceChipActive]}
                      onPress={() => setServiceType(t)}
                    >
                      <Text style={[styles.serviceChipText, serviceType === t && styles.serviceChipTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text style={styles.inputLabel}>Odometer Mileage (km)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={mileageInput}
                  onChangeText={setMileageInput}
                  placeholder="e.g. 30500"
                  placeholderTextColor={Colors.secondary}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Service Cost (PHP)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={costInput}
                  onChangeText={setCostInput}
                  placeholder="e.g. 1850"
                  placeholderTextColor={Colors.secondary}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Performed By / Service Center</Text>
                <TextInput
                  style={styles.textInput}
                  value={performedByInput}
                  onChangeText={setPerformedByInput}
                  placeholder="e.g. AutoCare Calapan"
                  placeholderTextColor={Colors.secondary}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Notes / Replaced Parts (Optional)</Text>
                <TextInput
                  style={[styles.textInput, { height: 64, textAlignVertical: "top" }]}
                  multiline
                  value={notesInput}
                  onChangeText={setNotesInput}
                  placeholder="e.g. Fully synthetic 5W-30 oil and OEM filter installed."
                  placeholderTextColor={Colors.secondary}
                />
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setSelectedVehicle(null)}
                  disabled={submitting}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={handleSaveMaintenance}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={Colors.dark} />
                  ) : (
                    <Text style={styles.modalSubmitText}>Save Record</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  refreshBtn: {
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
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.dark,
  },
  statLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.secondary,
    marginTop: 2,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 32,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.dark,
    textAlign: "center",
  },
  emptySub: {
    marginTop: 8,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 30,
    gap: 14,
  },
  vehicleCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  vehicleHeaderRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  vehicleThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  vehicleInfoCol: {
    flex: 1,
  },
  vehicleName: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  vehiclePlate: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
    marginTop: 1,
  },
  healthBadgePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  badgeGood: {
    backgroundColor: "#ECFDF5",
  },
  badgeDueSoon: {
    backgroundColor: "#FFFBEB",
  },
  badgeOverdue: {
    backgroundColor: "#FEF2F2",
  },
  healthBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
  },
  mileageSection: {
    marginTop: 12,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  mileageLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  mileageLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: Colors.secondary,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  healthStatusLabelText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#475569",
    marginTop: 6,
  },
  recoSection: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0",
    gap: 4,
  },
  recoHeaderTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 11.5,
    color: Colors.dark,
  },
  recoItemBox: {
    flexDirection: "row",
    gap: 6,
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    padding: 8,
    borderRadius: 8,
  },
  recoItemText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: "#78350F",
    lineHeight: 15,
  },
  cardActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  logServiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  logServiceBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    maxHeight: "85%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
  },
  modalSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginBottom: 14,
  },
  inputLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
    marginBottom: 6,
  },
  serviceChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  serviceChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  serviceChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  serviceChipText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.secondary,
  },
  serviceChipTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.dark,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.secondary,
  },
  modalSubmitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubmitText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
});
