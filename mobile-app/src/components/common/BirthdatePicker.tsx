import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";

import AppBottomSheet from "@/components/common/AppBottomSheet";
import PrimaryButton from "@/components/common/PrimaryButton";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Radius, Spacing } from "@/constants/theme";

interface BirthdatePickerProps {
  label?: string;
  value?: string; // YYYY-MM-DD format
  onChange: (date: string, parts: { year: string; month: string; day: string }) => void;
  error?: string;
  placeholder?: string;
  minAge?: number;
  maxAge?: number;
  style?: StyleProp<ViewStyle>;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const FULL_MONTH_NAMES = [
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

export default function BirthdatePicker({
  label = "Date of Birth",
  value,
  onChange,
  error,
  placeholder = "Select date",
  minAge = 18,
  maxAge = 100,
  style,
}: BirthdatePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const maxValidYear = currentYear - minAge;
  const minValidYear = currentYear - maxAge;

  // Initial state derived from value (default to 18 years ago)
  const parsedValue = useMemo(() => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return {
        year: String(maxValidYear),
        month: "01",
        day: "01",
      };
    }
    const [y, m, d] = value.split("-");
    return {
      year: y,
      month: m,
      day: d,
    };
  }, [value, maxValidYear]);

  const [tempYear, setTempYear] = useState(parsedValue.year);
  const [tempMonth, setTempMonth] = useState(parsedValue.month);
  const [tempDay, setTempDay] = useState(parsedValue.day);

  const years = useMemo(() => {
    const list: string[] = [];
    for (let y = maxValidYear; y >= minValidYear; y--) {
      list.push(String(y));
    }
    return list;
  }, [maxValidYear, minValidYear]);

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  }, []);

  const daysInMonth = useMemo(() => {
    const y = parseInt(tempYear, 10) || maxValidYear;
    const m = parseInt(tempMonth, 10) || 1;
    return new Date(y, m, 0).getDate();
  }, [tempYear, tempMonth, maxValidYear]);

  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) =>
      String(i + 1).padStart(2, "0")
    );
  }, [daysInMonth]);

  const handleOpen = () => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-");
      setTempYear(y);
      setTempMonth(m);
      setTempDay(d);
    } else {
      setTempYear(String(maxValidYear));
      setTempMonth("01");
      setTempDay("01");
    }
    setModalVisible(true);
  };

  const handleConfirm = () => {
    // Ensure day does not exceed days in month
    let safeDay = tempDay;
    if (parseInt(safeDay, 10) > daysInMonth) {
      safeDay = String(daysInMonth).padStart(2, "0");
    }

    const formatted = `${tempYear}-${tempMonth}-${safeDay}`;
    onChange(formatted, {
      year: tempYear,
      month: tempMonth,
      day: safeDay,
    });
    setModalVisible(false);
  };

  // Formatted display text on the form field
  const displayLabel = useMemo(() => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }
    const [y, m, d] = value.split("-");
    const monthIndex = parseInt(m, 10) - 1;
    const monthName = FULL_MONTH_NAMES[monthIndex] || m;
    return `${monthName} ${parseInt(d, 10)}, ${y}`;
  }, [value]);

  // Selected date preview for the bottom sheet
  const previewDateText = useMemo(() => {
    const monthIndex = parseInt(tempMonth, 10) - 1;
    const monthName = FULL_MONTH_NAMES[monthIndex] || tempMonth;
    const dayInt = parseInt(tempDay, 10) || 1;
    return `${monthName} ${dayInt}, ${tempYear}`;
  }, [tempMonth, tempDay, tempYear]);

  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      {/* Standard Rectangular Form Input — Consistent with all other inputs */}
      <Pressable
        style={[styles.inputContainer, error && styles.inputError]}
        onPress={handleOpen}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.dropdownText,
            !displayLabel && styles.placeholder,
          ]}
        >
          {displayLabel || placeholder}
        </Text>

        <Ionicons name="chevron-down" size={19} color={Colors.secondary} />
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Modern 3-Column Dropdown Option Bottom Sheet */}
      <AppBottomSheet
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        showHandle={true}
      >
        <View style={styles.sheetContent}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderText}>
              <Text style={styles.sheetTitle}>Date of Birth</Text>
              <Text style={styles.sheetSubtitle}>
                Select your birth date
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeBtn}
              hitSlop={8}
            >
              <Ionicons name="close" size={20} color={Colors.secondary} />
            </TouchableOpacity>
          </View>

          {/* 3 Modern Columns: Month | Day | Year */}
          <View style={styles.columnsWrapper}>
            {/* Column 1: Month */}
            <View style={styles.columnCard}>
              <View style={styles.columnHeader}>
                <Text style={styles.columnHeaderText}>Month</Text>
              </View>
              <ScrollView
                style={styles.columnScroll}
                showsVerticalScrollIndicator={false}
              >
                {months.map((m, idx) => {
                  const isSelected = m === tempMonth;
                  return (
                    <Pressable
                      key={m}
                      style={[
                        styles.itemRow,
                        isSelected && styles.itemRowActive,
                      ]}
                      onPress={() => setTempMonth(m)}
                    >
                      <Text
                        style={[
                          styles.itemText,
                          isSelected && styles.itemTextActive,
                        ]}
                      >
                        {MONTH_NAMES[idx]}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Column 2: Day */}
            <View style={styles.columnCard}>
              <View style={styles.columnHeader}>
                <Text style={styles.columnHeaderText}>Day</Text>
              </View>
              <ScrollView
                style={styles.columnScroll}
                showsVerticalScrollIndicator={false}
              >
                {days.map((d) => {
                  const isSelected = d === tempDay;
                  return (
                    <Pressable
                      key={d}
                      style={[
                        styles.itemRow,
                        isSelected && styles.itemRowActive,
                      ]}
                      onPress={() => setTempDay(d)}
                    >
                      <Text
                        style={[
                          styles.itemText,
                          isSelected && styles.itemTextActive,
                        ]}
                      >
                        {d}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Column 3: Year */}
            <View style={styles.columnCard}>
              <View style={styles.columnHeader}>
                <Text style={styles.columnHeaderText}>Year</Text>
              </View>
              <ScrollView
                style={styles.columnScroll}
                showsVerticalScrollIndicator={false}
              >
                {years.map((y) => {
                  const isSelected = y === tempYear;
                  return (
                    <Pressable
                      key={y}
                      style={[
                        styles.itemRow,
                        isSelected && styles.itemRowActive,
                      ]}
                      onPress={() => setTempYear(y)}
                    >
                      <Text
                        style={[
                          styles.itemText,
                          isSelected && styles.itemTextActive,
                        ]}
                      >
                        {y}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          {/* Action Buttons */}
          <PrimaryButton
            title="Confirm Date"
            onPress={handleConfirm}
            style={styles.confirmBtn}
          />

          <Pressable
            style={styles.cancelBtn}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </AppBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: Spacing.sm,
  },
  label: {
    marginBottom: 5,
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.dark,
  },
  inputContainer: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E2E2",
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
  },
  inputError: {
    borderColor: "#E53935",
  },
  dropdownText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.dark,
  },
  placeholder: {
    color: "#A0A0A0",
  },
  errorText: {
    marginTop: 4,
    fontFamily: FontFamily.regular,
    fontSize: 11,
    lineHeight: 15,
    color: "#E53935",
  },

  /* Bottom sheet styles */
  sheetContent: {
    paddingBottom: Spacing.xs,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  sheetHeaderText: {
    flex: 1,
  },
  sheetTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    color: Colors.dark,
  },
  sheetSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: Radius.full,
    backgroundColor: "#F3F4F6",
  },

  /* Selected Date Preview Bar */
  previewBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: Spacing.md,
  },
  previewLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewDateText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.dark,
  },
  eligiblePill: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  eligiblePillText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#059669",
  },

  /* 3 Column Grid */
  columnsWrapper: {
    flexDirection: "row",
    gap: 8,
    height: 220,
    marginBottom: Spacing.md,
  },
  columnCard: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  columnHeader: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 7,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  columnHeaderText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  columnScroll: {
    flex: 1,
  },
  itemRow: {
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
    marginVertical: 2,
    borderRadius: 6,
  },
  itemRowActive: {
    backgroundColor: "#FFF8E7",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  itemText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.dark,
  },
  itemTextActive: {
    fontFamily: FontFamily.bold,
    color: "#B45309",
  },

  /* Action Buttons */
  confirmBtn: {
    marginTop: Spacing.xs,
  },
  cancelBtn: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  cancelBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.primary,
  },
});
