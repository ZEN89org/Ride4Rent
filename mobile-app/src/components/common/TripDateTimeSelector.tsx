import TripTimePickerContent from "./TripTimePickerContent";
import { AppBottomSheet } from "@/components/common/AppBottomSheet";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface TripDateTimeSelectorProps {
  startDate: Date;
  endDate: Date;
  startTime?: string; // e.g. "10:00 AM"
  endTime?: string; // e.g. "10:00 AM"
  onDateTimeChange: (
    start: Date,
    end: Date,
    startTime: string,
    endTime: string,
  ) => void;
  minDate?: Date;
  isExtensionOnly?: boolean; // When extending, start date is fixed to current end date
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const normalizeDate = (d: Date): Date => {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
};

// Formats as "13 Oct 2026" exactly matching Image 1 & 2
const formatDateDisplay = (d: Date): string => {
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

export default function TripDateTimeSelector({
  startDate,
  endDate,
  startTime = "10:00 AM",
  endTime = "10:00 AM",
  onDateTimeChange,
  minDate = new Date(),
  isExtensionOnly = false,
}: TripDateTimeSelectorProps) {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"pickup" | "return">(
    isExtensionOnly ? "return" : "pickup",
  );

  // Local draft state inside modal
  const [draftStart, setDraftStart] = useState<Date>(startDate);
  const [draftEnd, setDraftEnd] = useState<Date | null>(endDate);
  const [draftStartTime, setDraftStartTime] = useState<string>(startTime);
  const [draftEndTime, setDraftEndTime] = useState<string>(endTime);

  // Time editing modal state
  const [timePickerTarget, setTimePickerTarget] = useState<
    "pickup" | "return" | null
  >(null);
  const today = normalizeDate(minDate);

  const openCalendarModal = (tab: "pickup" | "return") => {
    setDraftStart(new Date(startDate));
    setDraftStartTime(startTime || "10:00 AM");
    setDraftEndTime(endTime || "10:00 AM");
    setActiveTab(tab);
    if (tab === "pickup" && !isExtensionOnly) {
      // When opening to set pickup date, don't pre-lock return date so user picks pickup date first
      setDraftEnd(null);
    } else {
      setDraftEnd(new Date(endDate));
    }
    setModalVisible(true);
  };

  const handleApply = () => {
    let finalEnd = draftEnd ? new Date(draftEnd) : null;
    if (isExtensionOnly) {
      if (!finalEnd || finalEnd <= draftStart) {
        finalEnd = new Date(draftStart);
        finalEnd.setDate(draftStart.getDate() + 1);
      }
    } else {
      if (!finalEnd || finalEnd < draftStart) {
        finalEnd = new Date(draftStart);
        finalEnd.setDate(draftStart.getDate() + 1);
      }
    }
    onDateTimeChange(draftStart, finalEnd, draftStartTime, draftEndTime);
    setModalVisible(false);
  };

  const normStart = normalizeDate(draftStart);
  const normEnd = draftEnd ? normalizeDate(draftEnd) : null;

  const handleDayPress = (year: number, month: number, day: number) => {
    const selected = new Date(year, month, day);
    selected.setHours(0, 0, 0, 0);

    if (selected < today) return;

    if (isExtensionOnly) {
      if (selected > normStart) {
        setDraftEnd(selected);
      }
      return;
    }

    if (activeTab === "pickup") {
      // Step 1: User picks pickup date only
      setDraftStart(selected);
      setDraftEnd(null); // Clear return date so user selects it next
      setActiveTab("return"); // Move to Step 2: Pick return date
    } else {
      // Step 2: User picks return date
      if (selected < normStart) {
        // Tapped a date earlier than pickup: treat as setting new pickup date
        setDraftStart(selected);
        setDraftEnd(null);
        setActiveTab("return");
      } else {
        setDraftEnd(selected);
      }
    }
  };

  // Open the manual time selector.
  const openTimePicker = (target: "pickup" | "return") => {
    setTimePickerTarget(target);
  };

  const saveTimePicker = (formatted: string) => {
    if (modalVisible) {
      if (timePickerTarget === "pickup") setDraftStartTime(formatted);
      else setDraftEndTime(formatted);
    } else if (timePickerTarget === "pickup") onDateTimeChange(startDate, endDate, formatted, endTime);
    else onDateTimeChange(startDate, endDate, startTime, formatted);
    setTimePickerTarget(null);
  };

  // Generate 6 consecutive months starting from current month
  const baseYear = today.getFullYear();
  const baseMonth = today.getMonth();
  const monthsToRender = [0, 1, 2, 3, 4, 5].map((offset) => {
    const d = new Date(baseYear, baseMonth + offset, 1);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
    };
  });

  const renderTimePickerContent = () => timePickerTarget && (
    <TripTimePickerContent
      key={`${timePickerTarget}:${modalVisible}`}
      target={timePickerTarget}
      value={timePickerTarget === "pickup" ? (modalVisible ? draftStartTime : startTime) : (modalVisible ? draftEndTime : endTime)}
      date={timePickerTarget === "pickup" ? (modalVisible ? draftStart : startDate) : (modalVisible ? draftEnd || endDate : endDate)}
      onClose={() => setTimePickerTarget(null)}
      onSave={saveTimePicker}
    />
  );

  return (
    <View style={styles.container}>
      {/* 2 SIDE-BY-SIDE COLUMNS: PICKUP & RETURN (Exact Match Image 1) */}
      <View style={styles.image1ColumnsRow}>
        {/* Left Column: Pickup */}
        <View style={styles.columnBox}>
          <Text style={styles.columnHeaderLabel}>
            {isExtensionOnly ? "Current Return" : "Pickup"}
          </Text>
          <View style={styles.cardContainer}>
            {/* Top Half: Calendar Icon + Date */}
            <TouchableOpacity
              style={styles.cardHalfTop}
              accessibilityRole="button"
              onPress={() => !isExtensionOnly && openCalendarModal("pickup")}
              activeOpacity={0.75}
              disabled={isExtensionOnly}
            >
              <Ionicons name="calendar-outline" size={19} color="#64748B" />
              <Text style={styles.cardDateText} numberOfLines={1}>
                {formatDateDisplay(startDate)}
              </Text>
            </TouchableOpacity>

            <View style={styles.horizontalDivider} />

            {/* Bottom Half: Clock Icon + Time */}
            <TouchableOpacity
              style={styles.cardHalfBottom}
              accessibilityRole="button"
              onPress={() => !isExtensionOnly && openTimePicker("pickup")}
              activeOpacity={0.75}
              disabled={isExtensionOnly}
            >
              <Ionicons name="time-outline" size={19} color="#64748B" />
              <Text style={styles.cardTimeText} numberOfLines={1}>
                {startTime}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Right Column: Return */}
        <View style={styles.columnBox}>
          <Text style={styles.columnHeaderLabel}>RETURN</Text>
          <View style={styles.cardContainer}>
            {/* Top Half: Calendar Icon + Date */}
            <TouchableOpacity
              style={styles.cardHalfTop}
              accessibilityRole="button"
              onPress={() => openCalendarModal("return")}
              activeOpacity={0.75}
            >
              <Ionicons name="calendar-outline" size={19} color="#64748B" />
              <Text style={styles.cardDateText} numberOfLines={1}>
                {formatDateDisplay(endDate)}
              </Text>
            </TouchableOpacity>

            <View style={styles.horizontalDivider} />

            {/* Bottom Half: Clock Icon + Time */}
            <TouchableOpacity
              style={styles.cardHalfBottom}
              accessibilityRole="button"
              onPress={() => openTimePicker("return")}
              activeOpacity={0.75}
            >
              <Ionicons name="time-outline" size={19} color="#64748B" />
              <Text style={styles.cardTimeText} numberOfLines={1}>
                {endTime}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* FULL-SCREEN MODAL: "Select dates and times" (Exact Match Image 2) */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        statusBarTranslucent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalScreen}>
          {/* Back Arrow & Large Title */}
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setModalVisible(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select dates and times</Text>
          </View>

          {/* Two Top Cards (Pickup & Return with Active Gold Border) */}
          <View style={styles.modalTopBoxesRow}>
            {/* Left Card: Pickup */}
            <View style={styles.modalBoxCard}>
              <TouchableOpacity
                style={[
                  styles.modalBoxHalfTop,
                  activeTab === "pickup" && styles.modalActiveCell,
                  isExtensionOnly && { opacity: 0.5 },
                ]}
                onPress={() => !isExtensionOnly && setActiveTab("pickup")}
                activeOpacity={0.8}
                disabled={isExtensionOnly}
              >
                <Ionicons name="calendar-outline" size={22} color="#0F172A" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalCellLabel}>Pickup</Text>
                  <Text style={styles.modalCellValue} numberOfLines={1}>
                    {formatDateDisplay(draftStart)}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.modalDivider} />

              <TouchableOpacity
                style={styles.modalBoxHalfBottom}
                onPress={() => !isExtensionOnly && openTimePicker("pickup")}
                activeOpacity={0.8}
                disabled={isExtensionOnly}
              >
                <Ionicons name="time-outline" size={22} color="#0F172A" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalCellLabel}>Time</Text>
                  <Text style={styles.modalCellValue} numberOfLines={1}>
                    {draftStartTime}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Right Card: Return */}
            <View style={styles.modalBoxCard}>
              <TouchableOpacity
                style={[
                  styles.modalBoxHalfTop,
                  activeTab === "return" && styles.modalActiveCell,
                ]}
                onPress={() => setActiveTab("return")}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={22} color="#0F172A" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalCellLabel}>Return</Text>
                  <Text
                    style={[
                      styles.modalCellValue,
                      !draftEnd && { color: "#94A3B8", fontStyle: "italic" },
                    ]}
                    numberOfLines={1}
                  >
                    {draftEnd ? formatDateDisplay(draftEnd) : "Select date"}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.modalDivider} />

              <TouchableOpacity
                style={styles.modalBoxHalfBottom}
                onPress={() => openTimePicker("return")}
                activeOpacity={0.8}
              >
                <Ionicons name="time-outline" size={22} color="#0F172A" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalCellLabel}>Time</Text>
                  <Text style={styles.modalCellValue} numberOfLines={1}>
                    {draftEndTime}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sequential Step Guide Banner */}
          <View style={styles.stepGuideBanner}>
            <Ionicons
              name={
                activeTab === "pickup" ? "calendar-outline" : "flag-outline"
              }
              size={14}
              color={Colors.primary}
            />
            <Text style={styles.stepGuideText}>
              {activeTab === "pickup"
                ? "Step 1: Tap a date to set Pick-up Date"
                : "Step 2: Tap a date to set Return Date"}
            </Text>
          </View>

          {/* Calendar Months ScrollView */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.calendarScrollContent}
          >
            {monthsToRender.map(({ year, month }, mIdx) => {
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const firstDayOfWeek = new Date(year, month, 1).getDay();

              const gridCells: (number | null)[] = [];
              for (let i = 0; i < firstDayOfWeek; i++) {
                gridCells.push(null);
              }
              for (let day = 1; day <= daysInMonth; day++) {
                gridCells.push(day);
              }

              return (
                <View
                  key={`month-${year}-${month}`}
                  style={styles.monthSection}
                >
                  {/* Centered Month Title (Matching Image 2: "October 2026") */}
                  <Text style={styles.monthTitleText}>
                    {MONTH_NAMES[month]} {year}
                  </Text>

                  {/* Weekday Row (Sun Mon Tue Wed Thu Fri Sat) */}
                  <View style={styles.weekdayRow}>
                    {WEEKDAY_NAMES.map((wk) => (
                      <Text key={wk} style={styles.weekdayText}>
                        {wk}
                      </Text>
                    ))}
                  </View>
                  <View style={styles.weekdayDivider} />

                  {/* Days Grid */}
                  <View style={styles.daysGrid}>
                    {gridCells.map((day, dIdx) => {
                      if (day === null) {
                        return (
                          <View key={`empty-${dIdx}`} style={styles.dayCell} />
                        );
                      }

                      const cellDate = new Date(year, month, day);
                      cellDate.setHours(0, 0, 0, 0);

                      const isPast = isExtensionOnly
                        ? cellDate <= normStart
                        : cellDate < today;
                      const isStart =
                        cellDate.getTime() === normStart.getTime();
                      const isEnd = normEnd
                        ? cellDate.getTime() === normEnd.getTime()
                        : false;
                      const isInRange = normEnd
                        ? cellDate > normStart && cellDate < normEnd
                        : false;
                      const isSingleDay = isStart && isEnd;

                      return (
                        <TouchableOpacity
                          key={`day-${day}`}
                          style={[
                            styles.dayCell,
                            // Range fill & Capsule ends matching Image 2
                            isInRange && styles.dayCellInRange,
                            isStart && !isSingleDay && styles.dayCellRangeStart,
                            isEnd && !isSingleDay && styles.dayCellRangeEnd,
                            isSingleDay && styles.dayCellSingle,
                          ]}
                          disabled={isPast}
                          onPress={() => handleDayPress(year, month, day)}
                          activeOpacity={0.8}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <View
                            style={[
                              styles.dayCircle,
                              (isStart || isEnd) && styles.dayCircleActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dayNumber,
                                isPast && styles.dayNumberPast,
                                (isStart || isEnd) && styles.dayNumberActive,
                                isInRange && styles.dayNumberInRange,
                              ]}
                            >
                              {day}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Bottom Fixed Button: "Select dates" (Dark button matching Image 2) */}
          <View style={[styles.modalBottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity
              style={styles.selectDatesBtn}
              onPress={handleApply}
              activeOpacity={0.88}
            >
              <Text style={styles.selectDatesBtnText}>
                {draftEnd ? "Select dates" : "Confirm Schedule"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Time Picker Bottom Sheet inside Calendar Modal */}
          <AppBottomSheet
            visible={!!timePickerTarget && modalVisible}
            onClose={() => setTimePickerTarget(null)}
            position="bottom"
            showHandle={true}
            renderAsOverlay={true}
            avoidKeyboard={false}
            sheetStyle={styles.timeSheetCard}
          >
            {renderTimePickerContent()}
          </AppBottomSheet>
        </View>
      </Modal>

      {/* Standalone Bottom Sheet for Time Picker (when opened directly from columns outside modal) */}
      <AppBottomSheet
        visible={!!timePickerTarget && !modalVisible}
        onClose={() => setTimePickerTarget(null)}
        position="bottom"
        showHandle={true}
        avoidKeyboard={false}
        sheetStyle={styles.timeSheetCard}
      >
        {renderTimePickerContent()}
      </AppBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: 4,
  },

  // 2 Side-by-Side Columns (Exact Match Image 1)
  image1ColumnsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  columnBox: {
    flex: 1,
  },
  columnHeaderLabel: {
    fontFamily: FontFamily.semiBold,
    letterSpacing: 0.7,
    fontSize: 11,
    color: "#0F172A",
    marginBottom: 8,
  },
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  cardHalfTop: {
    minHeight: 52,
    backgroundColor: "#FFFCED",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  cardHalfBottom: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  cardDateText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13.5,
    color: "#0F172A",
    flex: 1,
  },
  cardTimeText: {
    fontFamily: FontFamily.medium,
    fontSize: 13.5,
    color: "#0F172A",
    flex: 1,
  },

  // Full Screen Modal (Exact Match Image 2)
  modalScreen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    marginBottom: 16,
    width: 32,
    height: 32,
    justifyContent: "center",
  },
  modalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    color: "#0F172A",
    letterSpacing: -0.4,
  },

  // Two Top Cards in Modal (with gold active border)
  modalTopBoxesRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalBoxCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  modalBoxHalfTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
  },
  modalActiveCell: {
    borderWidth: 2,
    borderColor: "#FEC103", // Gold outline matching Image 2
    borderRadius: 12,
    backgroundColor: "#FFFDF5",
  },
  modalBoxHalfBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  modalCellLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: "#64748B",
    marginBottom: 1,
  },
  modalCellValue: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
    color: "#0F172A",
  },
  stepGuideBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
  },
  stepGuideText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: "#334155",
  },

  // Calendar Scroll Content
  calendarScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  monthSection: {
    marginBottom: 32,
  },
  monthTitleText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 16,
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  weekdayText: {
    width: "14.28%",
    textAlign: "center",
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: "#64748B",
  },
  weekdayDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginBottom: 12,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },

  // Connected Dark Pill Capsule (Exact Match Image 2)
  dayCellInRange: {
    backgroundColor: "#FEC103",
  },
  dayCellRangeStart: {
    backgroundColor: "#FEC103",
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  dayCellRangeEnd: {
    backgroundColor: "#FEC103",
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
  },
  dayCellSingle: {
    backgroundColor: "#FEC103",
    borderRadius: 14,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleActive: {
    backgroundColor: "transparent",
  },
  dayNumber: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: "#0F172A",
  },
  dayNumberPast: {
    color: "#CBD5E1",
  },
  dayNumberActive: {
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  dayNumberInRange: {
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },

  // Bottom Fixed Action Bar: "Select dates"
  modalBottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  selectDatesBtn: {
    backgroundColor: "#FEC103", // Dark button matching Image 2
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  selectDatesBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 19,
    color: Colors.dark,
  },

  // Time Picker Overlay Popup
  timeModalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    elevation: 999999,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  timeModalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  timeSheetCard: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  timeSheetContent: {
    paddingTop: 2,
  },
  extensionTimeContent: {
    paddingTop: 3,
    paddingBottom: 4,
  },
  extensionTimeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  extensionTimeTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 19,
    color: Colors.dark,
  },
  extensionTimeDate: {
    marginTop: 3,
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
  },
  extensionTimeValue: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: Colors.dark,
  },
  extensionTimeControls: {
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  extensionTimeControlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
  },
  extensionTimeControlLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.dark,
  },
  extensionStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  extensionStepperButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  extensionStepperValue: {
    minWidth: 25,
    fontFamily: FontFamily.bold,
    fontSize: 17,
    textAlign: "center",
    color: Colors.dark,
  },
  extensionTimeDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  extensionAmPm: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
    marginTop: 12,
  },
  extensionAmPmOption: {
    minWidth: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  extensionAmPmOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  extensionAmPmText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.secondary,
  },
  extensionAmPmTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  extensionSaveButton: {
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  extensionSaveButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 19,
    color: Colors.dark,
  },
  timeSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timeSheetIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.logoBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  timeSheetHeading: {
    flex: 1,
  },
  timeSheetEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1,
    color: Colors.secondary,
    marginBottom: 2,
  },
  timeSheetTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: Colors.dark,
  },
  timeSheetSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    marginTop: 12,
    marginBottom: 16,
  },
  timePickerPanel: {
    backgroundColor: Colors.inputBackground,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  timeStepperBtn: {
    width: 48,
    height: 30,
    borderRadius: 9,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeInputsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  timeInputCol: {
    alignItems: "center",
  },
  timeInputLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: Colors.secondary,
    marginBottom: 8,
  },
  timeValueBox: {
    width: 56,
    height: 46,
    backgroundColor: Colors.logoBackground,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  timeValueText: {
    textAlign: "center",
    fontFamily: FontFamily.bold,
    fontSize: 21,
    color: Colors.dark,
  },
  timeSeparator: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    color: Colors.secondary,
    marginTop: 28,
  },
  ampmToggleWrap: {
    flexDirection: "column",
    backgroundColor: Colors.white,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 11,
    padding: 3,
    marginTop: 21,
    marginLeft: 2,
  },
  ampmBtn: {
    minWidth: 48,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  ampmBtnActive: {
    backgroundColor: Colors.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
    elevation: 1,
  },
  ampmText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.secondary,
  },
  ampmTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  timeModalButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  timeCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 13,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  timeCancelBtnText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.secondary,
  },
  timeConfirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  timeConfirmBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
});
