import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";

export default function TripTimePickerContent({ value, date, target, onSave, onClose }: {
  value: string; date: Date; target: "pickup" | "return"; onSave: (value: string) => void; onClose: () => void;
}) {
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const [hour, setHour] = useState(Math.min(12, Math.max(1, Number(match?.[1]) || 10)));
  const [minute, setMinute] = useState(Math.min(59, Math.max(0, Number(match?.[2]) || 0)));
  const [period, setPeriod] = useState<"AM" | "PM">(match?.[3]?.toUpperCase() === "PM" ? "PM" : "AM");
  const formatted = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
  const title = target === "return" ? "Return Time" : "Pickup Time";
  return (
    <View style={styles.content}>
      <View style={styles.header}>
        <View style={styles.icon}><Ionicons name="time-outline" size={22} color={Colors.dark} /></View>
        <View style={{ flex: 1 }}><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close time setup" onPress={onClose} style={styles.close}><Ionicons name="close" size={20} color={Colors.dark} /></Pressable>
      </View>
      <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
        <View style={styles.preview}><Text style={styles.previewLabel}>Selected {target} time</Text><Text style={styles.previewValue}>{formatted}</Text></View>
        <View style={styles.columns}>
          {(["Hour", "Minute"] as const).map((label) => {
            const isHour = label === "Hour";
            const change = (direction: number) => isHour ? setHour((current) => ((current - 1 + direction + 12) % 12) + 1) : setMinute((current) => (current + direction + 60) % 60);
            return <View key={label} style={styles.stepper}>
              <Text style={styles.controlLabel}>{label}</Text>
              <View style={styles.stepperRow}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${label.toLowerCase()}`} onPress={() => change(-1)} style={styles.stepButton}><Ionicons name="remove" size={20} color={Colors.dark} /></Pressable>
                <Text style={styles.number}>{String(isHour ? hour : minute).padStart(2, "0")}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${label.toLowerCase()}`} onPress={() => change(1)} style={styles.stepButton}><Ionicons name="add" size={20} color={Colors.dark} /></Pressable>
              </View>
            </View>;
          })}
        </View>
        <View style={styles.periods}>{(["AM", "PM"] as const).map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: period === item }} onPress={() => setPeriod(item)} style={[styles.period, period === item && styles.selected]}><Text style={styles.periodText}>{item}</Text></Pressable>)}</View>
        <Text style={styles.controlLabel}>Quick minutes</Text>
        <View style={styles.minutes}>{[0, 15, 30, 45].map((item) => <Pressable key={item} accessibilityRole="button" accessibilityLabel={`Set minute to ${item}`} accessibilityState={{ selected: minute === item }} onPress={() => setMinute(item)} style={[styles.minute, minute === item && styles.selected]}><Text style={styles.periodText}>:{String(item).padStart(2, "0")}</Text></Pressable>)}</View>
      </ScrollView>
      <View style={styles.footer}><Pressable accessibilityRole="button" onPress={() => onSave(formatted)} style={styles.save}><Text style={styles.saveText}>Save {title}</Text></Pressable></View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexShrink: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 12 },
  icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFF5CC", alignItems: "center", justifyContent: "center" },
  title: { fontFamily: FontFamily.bold, fontSize: 18, color: Colors.dark },
  subtitle: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.secondary, marginTop: 3 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.inputBackground, alignItems: "center", justifyContent: "center" },
  preview: { backgroundColor: "#FFFCF0", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#F1E7C6", alignItems: "center" },
  previewLabel: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.secondary },
  previewValue: { fontFamily: FontFamily.bold, fontSize: 30, color: Colors.dark, marginTop: 4 },
  columns: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  stepper: { flex: 1, minWidth: 130, padding: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: 14 },
  controlLabel: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.secondary, marginBottom: 8 },
  stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.inputBackground, alignItems: "center", justifyContent: "center" },
  number: { fontFamily: FontFamily.semiBold, fontSize: 22, color: Colors.dark },
  periods: { flexDirection: "row", gap: 8, marginBottom: 16 },
  period: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", backgroundColor: Colors.inputBackground, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  selected: { backgroundColor: "#FFF0B3", borderColor: Colors.primary },
  periodText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.dark },
  minutes: { flexDirection: "row", gap: 8 },
  minute: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  footer: { paddingTop: 14, borderTopWidth: 1, borderTopColor: Colors.border },
  save: { minHeight: 52, borderRadius: 16, backgroundColor: Colors.primary, padding: 14, alignItems: "center", justifyContent: "center" },
  saveText: { fontFamily: FontFamily.semiBold, fontSize: 16, color: Colors.dark },
});
