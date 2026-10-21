import ListPagination from "@/components/common/ListPagination";
import { paginateItems } from "@/utils/paginateItems";
import { AppBottomSheet } from "@/components/common/AppBottomSheet";
import { rentalSheetStyle } from "@/constants/rentalDesign";
import RentalSheetHeader from "@/components/common/RentalSheetHeader";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import {
  getOperatorMaintenanceList,
  logVehicleMaintenance,
  VehicleHealthInfo,
  updateMaintenanceSchedule,
} from "@/services/maintenanceService";

export default function OperatorMaintenanceScreen() {
  const { showSuccess, showError } = useAppToast();
  const [vehicles, setVehicles] = useState<VehicleHealthInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const listRef = useRef<FlatList<VehicleHealthInfo>>(null);
  const [detailsVehicle, setDetailsVehicle] = useState<VehicleHealthInfo | null>(null);
  const [showServiceTypes, setShowServiceTypes] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [scheduleVehicle, setScheduleVehicle] = useState<VehicleHealthInfo | null>(null);
  const [scheduleOdo, setScheduleOdo] = useState("");
  const [scheduleBaseline, setScheduleBaseline] = useState("");
  const [scheduleInterval, setScheduleInterval] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);
  const openSchedule = (vehicle: VehicleHealthInfo) => {
    setScheduleVehicle(vehicle); setScheduleOdo(String(vehicle.current_odometer));
    setScheduleBaseline(String(vehicle.last_service_odometer)); setScheduleInterval(String(vehicle.service_interval_km));
  };
  const saveSchedule = async () => {
    if (!scheduleVehicle || savingSchedule) return;
    const current = Number(scheduleOdo), baseline = Number(scheduleBaseline), interval = Number(scheduleInterval);
    if (![scheduleOdo, scheduleBaseline, scheduleInterval].every(value => /^\d+$/.test(value)) || baseline > current || current < scheduleVehicle.current_odometer || interval < 100 || interval > 100000) {
      showError("Check mileage", "Use whole kilometers. Current mileage cannot decrease, last service cannot exceed current mileage, and the interval must be 100–100,000 km."); return;
    }
    setSavingSchedule(true);
    try {
      await updateMaintenanceSchedule(scheduleVehicle.id, { current_odometer: current, last_service_odometer: baseline, service_interval_km: interval });
      setScheduleVehicle(null); await loadData(true); showSuccess("Schedule Updated", "Recommendations now use the updated mileage and service interval.");
    } catch (error: any) { showError("Unable to save", error.response?.data?.message || "Please try again."); }
    finally { setSavingSchedule(false); }
  };

  // Log Service Modal state
  const [selectedVehicle, setSelectedVehicle] =
    useState<VehicleHealthInfo | null>(null);
  const [serviceType, setServiceType] = useState("Oil & Filter Change");
  const [mileageInput, setMileageInput] = useState("");
  const [costInput, setCostInput] = useState("");
  const [performedByInput, setPerformedByInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async (silent = false) => {
    try {
      const data = await getOperatorMaintenanceList();
      setVehicles(data); setLoadError(false);
    } catch (e) {
      setLoadError(true);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    getOperatorMaintenanceList()
      .then((data) => {
        if (active) setVehicles(data);
      })
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const openLogModal = (v: VehicleHealthInfo) => {
    setSelectedVehicle(v);
    setServiceType("Oil & Filter Change");
    setShowServiceTypes(false);
    setMileageInput(String(v.current_odometer));
    setCostInput("");
    setPerformedByInput("");
    setNotesInput("");
  };

  const handleSaveMaintenance = async () => {
    if (!selectedVehicle) return;
    const mileageNum = parseInt(mileageInput, 10);
    if (!/^\d+$/.test(mileageInput) || isNaN(mileageNum) || mileageNum < 0 || (costInput.trim() !== "" && (!Number.isFinite(Number(costInput)) || Number(costInput) < 0))) {
      showError("Validation", "Enter whole mileage and a valid non-negative service cost.");
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

      showSuccess(
        "Maintenance Logged",
        `${serviceType} recorded for ${selectedVehicle.name}.`,
      );
      setSelectedVehicle(null);
      loadData(true);
    } catch (e: any) {
      showError(
        "Error",
        e.response?.data?.message || "Failed to log maintenance.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const sortedVehicles = [...vehicles].sort((a, b) => ({ overdue: 0, due_soon: 1, unknown: 2, good: 3 }[a.health_status] - { overdue: 0, due_soon: 1, unknown: 2, good: 3 }[b.health_status]));
  const filteredVehicles = sortedVehicles.filter(vehicle => `${vehicle.name} ${vehicle.plate_number || ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  const page = paginateItems(filteredVehicles, currentPage, 5);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to dashboard" style={styles.headerButton} onPress={() => router.canGoBack() ? router.back() : router.replace("/operator-home")}><Ionicons name="chevron-back" size={22} color={Colors.dark} /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={styles.headerTitle}>Maintenance</Text><Text style={styles.headerSubtitle}>Mileage & service reminders</Text></View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="How maintenance recommendations work" style={styles.headerButton} onPress={() => setShowGuide(true)}><Ionicons name="information-circle-outline" size={23} color={Colors.dark} /></TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBox}><Ionicons name="search-outline" size={19} color={Colors.secondary} /><TextInput accessibilityLabel="Search vehicles by name or plate" style={styles.searchInput} placeholder="Search vehicle or plate number" value={search} onChangeText={value => { setSearch(value); setCurrentPage(1); }} autoCorrect={false} />{!!search && <TouchableOpacity accessibilityLabel="Clear search" onPress={() => { setSearch(""); setCurrentPage(1); }}><Ionicons name="close" size={20} color={Colors.secondary} /></TouchableOpacity>}</View>
      </View>

      {loading && !refreshing ? <View style={styles.loadingWrap}><ActivityIndicator color={Colors.primary} size="large" /><Text style={styles.muted}>Loading your fleet…</Text></View> : loadError ? <View style={styles.emptyWrap}><View style={styles.emptyIcon}><Ionicons name="cloud-offline-outline" size={28} color={Colors.dark} /></View><Text style={styles.emptyTitle}>Couldn’t load your fleet</Text><Text style={styles.emptySub}>Check your connection and try again.</Text><TouchableOpacity style={styles.emptyButton} onPress={() => { setLoading(true); void loadData(); }}><Text style={styles.actionText}>Try Again</Text></TouchableOpacity></View> : (
        <FlatList
          ref={listRef}
          data={page.items}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadData(); }} colors={[Colors.primary]} />}
          ListHeaderComponent={<View style={styles.listHeading}><Text style={styles.sectionTitle}>{filteredVehicles.length} {filteredVehicles.length === 1 ? "vehicle" : "vehicles"}</Text><Text style={styles.muted}>Service due first</Text></View>}
          ListEmptyComponent={<View style={styles.emptyWrap}><View style={styles.emptyIcon}><Ionicons name="car-outline" size={28} color={Colors.dark} /></View><Text style={styles.emptyTitle}>{vehicles.length ? "No matching vehicles" : "No vehicles yet"}</Text><Text style={styles.emptySub}>{vehicles.length ? "Try a different name or plate number." : "Add a vehicle to start tracking its maintenance."}</Text><TouchableOpacity style={styles.emptyButton} onPress={() => vehicles.length ? setSearch("") : router.push("/operator-vehicles")}><Text style={styles.actionText}>{vehicles.length ? "Clear Search" : "View Fleet"}</Text></TouchableOpacity></View>}
          ListFooterComponent={<ListPagination currentPage={page.page} totalItems={filteredVehicles.length} pageSize={5} itemName="vehicles" onPageChange={next => { setCurrentPage(next); listRef.current?.scrollToOffset({ offset: 0, animated: true }); }} />}
          renderItem={({ item }) => {
            const unknown = item.health_status === "unknown";
            const progress = unknown ? 0 : Math.min(1, Math.max(0, item.km_since_last_service / Math.max(1, item.service_interval_km)));
            const badge = item.health_status === "overdue" ? styles.badgeOverdue : item.health_status === "due_soon" ? styles.badgeSoon : item.health_status === "good" ? styles.badgeGood : styles.badgeSetup;
            const statusColor = item.health_status === "overdue" ? "#B91C1C" : item.health_status === "due_soon" ? "#92400E" : item.health_status === "good" ? "#047857" : "#64748B";
            return <View style={styles.vehicleCard}>
              <View style={styles.vehicleHeader}>
                {item.image_url ? <Image source={{ uri: item.image_url }} contentFit="cover" style={styles.vehicleThumb} /> : <View style={[styles.vehicleThumb, styles.placeholder]}><Ionicons name="car-outline" size={26} color={Colors.secondary} /></View>}
                <View style={{ flex: 1, gap: 3 }}><Text style={styles.vehicleName}>{item.name}</Text><Text style={styles.muted}>{item.plate_number || [item.brand, item.model].filter(Boolean).join(" ")}</Text></View>
              </View>
              <View style={styles.statusRow}><View style={[styles.badge, badge]}><Text style={[styles.badgeText, { color: statusColor }]}>{item.health_badge}</Text></View><Text style={styles.sectionCaption}>{item.service_interval_km.toLocaleString()} km interval</Text></View>
              <View style={styles.mileageCard}>
                <View style={styles.metricRow}><Text style={styles.metricLabel}>Current mileage</Text><Text style={styles.metricValue}>{item.current_odometer.toLocaleString()} km</Text></View>
                <View style={styles.metricRow}><Text style={styles.metricLabel}>Next service</Text><Text style={styles.metricValue}>{unknown ? "Set your baseline" : `${(item.last_service_odometer + item.service_interval_km).toLocaleString()} km`}</Text></View>
                {!unknown && <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: item.health_status === "overdue" ? "#DC2626" : Colors.primary }]} /></View>}
                <Text style={[styles.serviceCaption, unknown && { color: Colors.secondary }]}>{item.health_label}</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" style={styles.detailsLink} onPress={() => setDetailsVehicle(item)}><Ionicons name="document-text-outline" size={16} color={Colors.secondary} /><Text style={styles.detailsLinkText}>Recommendations & history</Text><Ionicons name="chevron-forward" size={16} color={Colors.secondary} /></TouchableOpacity>
              <View style={styles.cardActions}><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Edit service schedule for ${item.name}`} style={styles.secondaryAction} onPress={() => openSchedule(item)}><Ionicons name="options-outline" size={17} color={Colors.dark} /><Text style={styles.actionText}>Schedule</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Log service for ${item.name}`} style={styles.primaryAction} onPress={() => openLogModal(item)}><Ionicons name="add" size={18} color={Colors.dark} /><Text style={styles.actionText}>Log Service</Text></TouchableOpacity></View>
            </View>;
          }}
        />
      )}

      <AppBottomSheet visible={!!detailsVehicle} onClose={() => setDetailsVehicle(null)} sheetStyle={rentalSheetStyle}>
        <RentalSheetHeader title="Vehicle Care" subtitle={detailsVehicle?.name} icon="build-outline" onClose={() => setDetailsVehicle(null)} />
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 14, paddingBottom: 12 }}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          {detailsVehicle?.recommendations.map(recommendation => <View key={recommendation.type} style={styles.guideStep}><Text style={styles.recommendationTitle}>{recommendation.type}</Text><Text style={styles.recommendationBody}>{recommendation.message}</Text></View>)}
          <Text style={styles.sectionTitle}>Recent service</Text>
          {detailsVehicle?.recent_logs.length ? detailsVehicle.recent_logs.map(log => <View key={log.id} style={styles.historyEntry}><Text style={styles.historyService}>{log.service_type}</Text><View style={styles.metricRow}><Text style={styles.muted}>{log.service_date}</Text><Text style={styles.muted}>{log.mileage_at_service.toLocaleString()} km</Text></View></View>) : <Text style={styles.muted}>No service records yet.</Text>}
          <Text style={styles.footnote}>{detailsVehicle?.recommendation_basis}</Text>
        </ScrollView>
      </AppBottomSheet>

      <AppBottomSheet visible={showGuide} onClose={() => setShowGuide(false)} sheetStyle={rentalSheetStyle}>
        <RentalSheetHeader title="How Reminders Work" subtitle="Based on the readings you record" icon="information-circle-outline" onClose={() => setShowGuide(false)} />
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 14, paddingBottom: 12 }}>
          {[{ title: "1. Set the schedule", text: "Enter the current odometer, mileage at the last routine service and the manufacturer’s service interval." }, { title: "2. Track the distance", text: "Distance since service = current mileage − last service mileage. Due soon starts within 500 km or 10% of the interval, whichever is smaller." }, { title: "3. Record completed work", text: "Oil and filter changes or routine preventive maintenance reset the countdown. Tire, brake and battery work stay in history without resetting it." }].map(step => <View key={step.title} style={styles.guideStep}><Text style={styles.recommendationTitle}>{step.title}</Text><Text style={styles.recommendationBody}>{step.text}</Text></View>)}
          <Text style={styles.recommendationBody}>Without a service baseline, the vehicle shows Set up. Readings are recorded manually or at trip return; these reminders do not diagnose mechanical condition.</Text>
        </ScrollView>
      </AppBottomSheet>

      <AppBottomSheet visible={!!scheduleVehicle} onClose={() => { if (!savingSchedule) setScheduleVehicle(null); }} dismissOnBackdrop={!savingSchedule} sheetStyle={rentalSheetStyle}>
        <RentalSheetHeader title="Service Schedule" subtitle={scheduleVehicle?.name} icon="options-outline" disabled={savingSchedule} onClose={() => setScheduleVehicle(null)} />
        <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
          <Text style={styles.emptySub}>Use the interval in your vehicle’s service guide.</Text>
          {[{ label: "Current odometer (km)", value: scheduleOdo, change: setScheduleOdo }, { label: "Last routine service (km)", value: scheduleBaseline, change: setScheduleBaseline }, { label: "Routine service interval (km)", value: scheduleInterval, change: setScheduleInterval }].map(field => <View key={field.label}><Text style={styles.inputLabel}>{field.label}</Text><TextInput accessibilityLabel={field.label} style={styles.textInput} keyboardType="number-pad" maxLength={9} value={field.value} onChangeText={value => field.change(value.replace(/\D/g, ""))} /></View>)}
        </ScrollView>
        <TouchableOpacity disabled={savingSchedule} style={[styles.primaryAction, { flexGrow: 0, flexBasis: "auto" }]} onPress={() => { void saveSchedule(); }}><Text style={styles.actionText}>{savingSchedule ? "Saving…" : "Save Schedule"}</Text></TouchableOpacity>
      </AppBottomSheet>

      {/* Log Maintenance Record Modal */}
      <AppBottomSheet visible={!!selectedVehicle} onClose={() => { if (!submitting) setSelectedVehicle(null); }} dismissOnBackdrop={!submitting} sheetStyle={rentalSheetStyle}>
        <RentalSheetHeader title="Log Service" subtitle={selectedVehicle?.name} icon="build-outline" disabled={submitting} onClose={() => setSelectedVehicle(null)} />
            <ScrollView
              style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 14, paddingBottom: 16 }}
            >
              <View>
                <Text style={styles.inputLabel}>
                  Service type
                </Text>
                <TouchableOpacity style={styles.serviceSelector} onPress={() => setShowServiceTypes(value => !value)} accessibilityRole="button" accessibilityState={{ expanded: showServiceTypes }}><Text style={styles.actionText}>{serviceType}</Text><Ionicons name={showServiceTypes ? "chevron-up" : "chevron-down"} size={18} color={Colors.secondary} /></TouchableOpacity>
                {showServiceTypes && <View style={styles.serviceOptions}>{["Oil & Filter Change", "Routine Preventive Maintenance", "Brake Inspection", "Tire Replacement", "Battery Replacement", "General Repair", "Other"].map(type => <TouchableOpacity key={type} accessibilityRole="radio" accessibilityState={{ checked: serviceType === type }} style={styles.serviceOption} onPress={() => { setServiceType(type); setShowServiceTypes(false); }}><Text style={styles.actionText}>{type}</Text>{serviceType === type && <Ionicons name="checkmark" size={18} color={Colors.dark} />}</TouchableOpacity>)}</View>}
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
                <Text style={styles.inputLabel}>Cost (₱) · Optional</Text>
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
                <Text style={styles.inputLabel}>
                  Service center · Optional
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={performedByInput}
                  onChangeText={setPerformedByInput}
                  placeholder="e.g. AutoCare Calapan"
                  placeholderTextColor={Colors.secondary}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>
                  Notes · Optional
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { height: 64, textAlignVertical: "top" },
                  ]}
                  multiline
                  value={notesInput}
                  onChangeText={setNotesInput}
                  placeholder="e.g. Fully synthetic 5W-30 oil and OEM filter installed."
                  placeholderTextColor={Colors.secondary}
                />
              </View>

            </ScrollView>
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

      </AppBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchSection: { paddingHorizontal: 16, paddingBottom: 16, backgroundColor: Colors.white },
  searchBox: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  searchInput: { flex: 1, minWidth: 0, minHeight: 48, fontFamily: FontFamily.regular, fontSize: 12, color: Colors.dark },
  listHeading: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" },
  detailsLink: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 44, marginTop: 8 },
  detailsLinkText: { flex: 1, fontFamily: FontFamily.regular, fontSize: 11, color: Colors.secondary },
  serviceSelector: { minHeight: 48, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  serviceOptions: { marginTop: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12 },
  serviceOption: { minHeight: 44, flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" },
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, backgroundColor: Colors.white },
  headerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#F8FAFC" },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 22, lineHeight: 30, color: Colors.dark },
  headerSubtitle: { fontFamily: FontFamily.regular, fontSize: 11, lineHeight: 17, color: Colors.secondary },







  listContent: { padding: 16, paddingBottom: 28, gap: 14, flexGrow: 1 },









  muted: { fontFamily: FontFamily.regular, fontSize: 11, lineHeight: 18, color: Colors.secondary },
  vehicleCard: { backgroundColor: Colors.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#E2E8F0" },
  vehicleHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  vehicleThumb: { width: 58, height: 58, borderRadius: 14, backgroundColor: "#F1F5F9" },
  placeholder: { justifyContent: "center", alignItems: "center" },
  vehicleName: { fontFamily: FontFamily.semiBold, fontSize: 15, lineHeight: 22, color: Colors.dark },
  statusRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 14, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontFamily: FontFamily.semiBold, fontSize: 10, lineHeight: 16 },
  badgeOverdue: { backgroundColor: "#FEF2F2" },
  badgeSoon: { backgroundColor: "#FFF6DA" },
  badgeGood: { backgroundColor: "#ECFDF5" },
  badgeSetup: { backgroundColor: "#F1F5F9" },
  sectionCaption: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.secondary },
  mileageCard: { backgroundColor: "#F8FAFC", borderRadius: 14, padding: 14, gap: 10 },
  metricRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  metricLabel: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.secondary, flexShrink: 1 },
  metricValue: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.dark, textAlign: "right", flexShrink: 1 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: "#E2E8F0", overflow: "hidden", marginTop: 2 },
  progressFill: { height: "100%", borderRadius: 3 },
  serviceCaption: { fontFamily: FontFamily.medium, fontSize: 11, lineHeight: 18, color: Colors.dark },


  sectionTitle: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.dark },



  recommendationTitle: { fontFamily: FontFamily.semiBold, fontSize: 12, lineHeight: 19, color: Colors.dark },
  recommendationBody: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 20, color: Colors.secondary, marginTop: 3 },



  historyEntry: { padding: 12, gap: 4, backgroundColor: "#F8FAFC", borderRadius: 12, marginBottom: 8 },
  historyService: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.dark },
  cardActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  primaryAction: { flexGrow: 1, flexBasis: 0, minHeight: 48, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 14, backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  secondaryAction: { flex: 1, minHeight: 48, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  actionText: { fontFamily: FontFamily.semiBold, fontSize: 12, lineHeight: 18, color: Colors.dark, flexShrink: 1 },
  footnote: { fontFamily: FontFamily.regular, fontSize: 11, lineHeight: 18, color: Colors.secondary, textAlign: "center", paddingHorizontal: 12, paddingVertical: 4 },
  guideStep: { backgroundColor: "#F8FAFC", padding: 14, borderRadius: 14 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyWrap: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 36, gap: 8 },
  emptyIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: Colors.logoBackground, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontFamily: FontFamily.semiBold, fontSize: 17, color: Colors.dark, textAlign: "center" },
  emptySub: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 20, color: Colors.secondary, textAlign: "center" },
  emptyButton: { minHeight: 48, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.primary, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 8 },
  inputLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
    marginBottom: 6,
  },





  textInput: {
    minHeight: 48,
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
  modalCancelBtn: { flex: 1, minHeight: 50, padding: 12, borderRadius: 14, backgroundColor: Colors.white, borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  modalCancelText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.secondary,
  },
  modalSubmitBtn: { flex: 2, minHeight: 50, padding: 12, borderRadius: 14, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  modalSubmitText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
});
