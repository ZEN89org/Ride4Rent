import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import OperatorShell from "@/features/operator/components/navigation/OperatorShell";
import { StyleSheet, Text, View } from "react-native";

export default function OperatorBookingsScreen() {
  return <OperatorShell activeRoute="bookings"><View style={styles.content}><Text style={styles.eyebrow}>Rental operations</Text><Text style={styles.title}>Bookings</Text><View style={styles.empty}><Text style={styles.emptyTitle}>No bookings yet</Text><Text style={styles.copy}>When renters book one of your vehicles, requests will appear here.</Text></View></View></OperatorShell>;
}
const styles = StyleSheet.create({ content: { padding: Spacing.lg }, eyebrow: { color: Colors.secondary, fontFamily: FontFamily.medium, fontSize: FontSize.small }, title: { color: Colors.dark, fontFamily: FontFamily.bold, fontSize: FontSize.heading, marginTop: Spacing.xs }, empty: { alignItems: "center", borderColor: Colors.border, borderRadius: 18, borderWidth: 1, marginTop: Spacing.xl, padding: Spacing.xl }, emptyTitle: { color: Colors.dark, fontFamily: FontFamily.semiBold, fontSize: FontSize.title }, copy: { color: Colors.secondary, fontFamily: FontFamily.regular, lineHeight: 21, marginTop: Spacing.sm, textAlign: "center" } });
