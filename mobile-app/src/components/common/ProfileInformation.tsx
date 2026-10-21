import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";

export type ProfileInformationRow = { icon: ComponentProps<typeof Ionicons>["name"]; label: string; value: string };

export default function ProfileInformation({ title, rows }: { title: string; rows: ProfileInformationRow[] }) {
  return <View style={styles.section}>
    <Text style={styles.title}>{title}</Text>
    <View style={styles.list}>{rows.map(row => <View key={row.label} style={styles.row}>
      <View style={styles.icon}><Ionicons name={row.icon} size={18} color={Colors.dark} /></View>
      <View style={styles.copy}><Text style={styles.label}>{row.label}</Text><Text style={styles.value}>{row.value}</Text></View>
    </View>)}</View>
  </View>;
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  title: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.dark, marginBottom: 14 },
  list: { gap: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  icon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#F6F6F6", alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, minWidth: 0 },
  label: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.secondary },
  value: { fontFamily: FontFamily.semiBold, fontSize: 14, lineHeight: 22, color: Colors.dark, marginTop: 2 },
});
