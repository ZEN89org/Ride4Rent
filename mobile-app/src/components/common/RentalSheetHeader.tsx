import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";

/** Shared header for the renter and operator rental sheet design. */
export default function RentalSheetHeader({ title, subtitle, icon, onClose, disabled = false }: {
  title: string;
  subtitle?: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  onClose?: () => void;
  disabled?: boolean;
}) {
  return <View style={styles.header}>
    <View style={styles.icon}><Ionicons name={icon} size={22} color={Colors.dark} /></View>
    <View style={styles.copy}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
    {!!onClose && <Pressable accessibilityRole="button" accessibilityLabel={`Close ${title.toLowerCase()}`} disabled={disabled} onPress={onClose} style={({ pressed }) => [styles.close, (pressed || disabled) && { opacity: 0.5 }]}>
      <Ionicons name="close" size={22} color={Colors.dark} />
    </Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  header: { width: "100%", flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 18 },
  icon: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#FFF4CC", alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  title: { fontFamily: FontFamily.bold, fontSize: 18, lineHeight: 25, color: Colors.dark },
  subtitle: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 18, color: Colors.secondary, marginTop: 2 },
  close: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
});
