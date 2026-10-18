import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { FontFamily, Spacing } from "@/constants/theme";

interface TripDateCalendarProps {
  startDate: Date;
  endDate: Date;
  onDatesChange: (start: Date, end: Date) => void;
  minDate?: Date;
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

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const normalizeDate = (d: Date): Date => {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
};

export default function TripDateCalendar({
  startDate,
  endDate,
  onDatesChange,
  minDate = new Date(),
}: TripDateCalendarProps) {
  const today = normalizeDate(minDate);
  const [viewDate, setViewDate] = useState(() => {
    const initial = new Date(startDate);
    initial.setDate(1);
    initial.setHours(0, 0, 0, 0);
    return initial;
  });

  const [selectingStep, setSelectingStep] = useState<"start" | "end">("end");

  const normStart = normalizeDate(startDate);
  const normEnd = normalizeDate(endDate);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const handlePrevMonth = () => {
    const prev = new Date(viewYear, viewMonth - 1, 1);
    // Don't go before current month
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    if (prev < thisMonthStart) return;
    setViewDate(prev);
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleDayPress = (day: number) => {
    const selected = new Date(viewYear, viewMonth, day);
    selected.setHours(0, 0, 0, 0);

    if (selected < today) return;

    if (selectingStep === "start") {
      // Picked start date
      const nextDay = new Date(selected);
      nextDay.setDate(selected.getDate() + 1);
      onDatesChange(selected, nextDay);
      setSelectingStep("end");
    } else {
      // Picking end date
      if (selected.getTime() === normStart.getTime()) {
        // Same day rental (1 day)
        const nextDay = new Date(selected);
        nextDay.setDate(selected.getDate() + 1);
        onDatesChange(selected, nextDay);
        setSelectingStep("start");
      } else if (selected > normStart) {
        onDatesChange(normStart, selected);
        setSelectingStep("start");
      } else {
        // Tapped before start date, restart range from this date
        const nextDay = new Date(selected);
        nextDay.setDate(selected.getDate() + 1);
        onDatesChange(selected, nextDay);
        setSelectingStep("end");
      }
    }
  };

  const isPrevDisabled = (() => {
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return viewDate <= thisMonthStart;
  })();

  // Build grid items (padding cells + day cells)
  const gridCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    gridCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    gridCells.push(day);
  }

  return (
    <View style={styles.calendarCard}>
      {/* Calendar Header with Month Navigation */}
      <View style={styles.monthHeader}>
        <TouchableOpacity
          onPress={handlePrevMonth}
          disabled={isPrevDisabled}
          style={[styles.navBtn, isPrevDisabled && styles.navBtnDisabled]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={isPrevDisabled ? "#CBD5E1" : Colors.dark}
          />
        </TouchableOpacity>

        <Text style={styles.monthTitle}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>

        <TouchableOpacity
          onPress={handleNextMonth}
          style={styles.navBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-forward" size={18} color={Colors.dark} />
        </TouchableOpacity>
      </View>

      {/* Weekday Row */}
      <View style={styles.weekdayRow}>
        {DAY_LABELS.map((label, idx) => (
          <Text
            key={idx}
            style={[
              styles.weekdayLabel,
              (idx === 0 || idx === 6) && styles.weekendLabel,
            ]}
          >
            {label}
          </Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.daysGrid}>
        {gridCells.map((day, index) => {
          if (day === null) {
            return <View key={`pad-${index}`} style={styles.dayCell} />;
          }

          const cellDate = new Date(viewYear, viewMonth, day);
          cellDate.setHours(0, 0, 0, 0);

          const isPast = cellDate < today;
          const isStart = cellDate.getTime() === normStart.getTime();
          const isEnd = cellDate.getTime() === normEnd.getTime();
          const isInRange = cellDate > normStart && cellDate < normEnd;
          const isToday = cellDate.getTime() === today.getTime();

          return (
            <TouchableOpacity
              key={`day-${day}`}
              style={[
                styles.dayCell,
                isInRange && styles.dayCellInRange,
                isStart && styles.dayCellStartRange,
                isEnd && styles.dayCellEndRange,
              ]}
              disabled={isPast}
              onPress={() => handleDayPress(day)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.dayBadge,
                  isToday && !isStart && !isEnd && styles.todayBadge,
                  (isStart || isEnd) && styles.selectedDayBadge,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isPast && styles.pastDayText,
                    isToday && !isStart && !isEnd && styles.todayText,
                    (isStart || isEnd) && styles.selectedDayText,
                  ]}
                >
                  {day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Instruction Helper Text */}
      <View style={styles.helperRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
          <Text style={styles.legendText}>Pickup / Return</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#FEF3C7" }]} />
          <Text style={styles.legendText}>Trip Duration</Text>
        </View>
        <Text style={styles.stepIndicator}>
          {selectingStep === "start" ? "Tap pickup date" : "Tap return date"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calendarCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 4,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  monthTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  weekdayLabel: {
    width: 38,
    textAlign: "center",
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: "#64748B",
  },
  weekendLabel: {
    color: "#94A3B8",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  dayCell: {
    width: "14.285%",
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dayCellInRange: {
    backgroundColor: "#FEF3C7",
  },
  dayCellStartRange: {
    borderTopLeftRadius: 19,
    borderBottomLeftRadius: 19,
    backgroundColor: "#FEF3C7",
  },
  dayCellEndRange: {
    borderTopRightRadius: 19,
    borderBottomRightRadius: 19,
    backgroundColor: "#FEF3C7",
  },
  dayBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedDayBadge: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 3,
  },
  todayBadge: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  dayText: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    color: Colors.dark,
  },
  pastDayText: {
    color: "#CBD5E1",
  },
  todayText: {
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  selectedDayText: {
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  helperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: "#64748B",
  },
  stepIndicator: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10.5,
    color: Colors.primary,
  },
});
