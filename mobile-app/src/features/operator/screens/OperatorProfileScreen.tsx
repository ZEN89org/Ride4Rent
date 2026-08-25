import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/hooks/useAuth";
import OperatorShell from "@/features/operator/components/navigation/OperatorShell";
import { StyleSheet, Text, View } from "react-native";

export default function OperatorProfileScreen() {
  const { user } = useAuth();
  const profile = user?.operatorProfile ?? user?.operator_profile;
  return <OperatorShell activeRoute="profile"><View style={styles.content}><Text style={styles.eyebrow}>Business account</Text><Text style={styles.title}>Profile</Text><View style={styles.card}><Text style={styles.business}>{profile?.business_name ?? "Your business"}</Text><Text style={styles.line}>{profile?.business_email ?? user?.email}</Text><Text style={styles.line}>{profile?.business_contact_number ?? "No contact number"}</Text><Text style={styles.line}>{[profile?.street_address, profile?.barangay, profile?.municipality].filter(Boolean).join(", ") || "No address provided"}</Text></View></View></OperatorShell>;
}
const styles = StyleSheet.create({ content: { padding: Spacing.lg }, eyebrow: { color: Colors.secondary, fontFamily: FontFamily.medium, fontSize: FontSize.small }, title: { color: Colors.dark, fontFamily: FontFamily.bold, fontSize: FontSize.heading, marginTop: Spacing.xs }, card: { backgroundColor: Colors.inputBackground, borderRadius: 18, marginTop: Spacing.xl, padding: Spacing.lg }, business: { color: Colors.dark, fontFamily: FontFamily.bold, fontSize: FontSize.title }, line: { color: Colors.secondary, fontFamily: FontFamily.regular, marginTop: Spacing.md } });
