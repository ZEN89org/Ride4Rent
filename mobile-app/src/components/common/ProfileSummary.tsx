import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";

export function ProfileSummary({ image, title, email, badge, badgeColor = "#16A34A", badgeBackground = "#ECFDF5", uploading = false, onEdit }: {
  image?: string | null; title: string; email?: string; badge: string;
  badgeColor?: string; badgeBackground?: string; uploading?: boolean; onEdit?: () => void;
}) {
  return <View style={styles.header}>
    <View>
      {image ? <Image source={{ uri: image }} style={styles.avatar} /> : <View style={[styles.avatar, styles.placeholder]}><Text style={styles.initial}>{title.charAt(0).toUpperCase()}</Text></View>}
      {!!onEdit && <TouchableOpacity accessibilityLabel="Change profile photo" style={styles.camera} onPress={onEdit} disabled={uploading}>{uploading ? <ActivityIndicator size="small" /> : <Ionicons name="camera" size={13} color={Colors.dark} />}</TouchableOpacity>}
    </View>
    <View style={{ flex: 1, minWidth: 0 }}><Text style={styles.title} numberOfLines={1}>{title}</Text><Text style={styles.email} numberOfLines={1}>{email}</Text><View style={[styles.badge, { backgroundColor: badgeBackground }]}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: badgeColor }} /><Text style={{ color: badgeColor, fontFamily: FontFamily.medium, fontSize: 11 }}>{badge}</Text></View></View>
  </View>;
}
const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 16, marginBottom: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  placeholder: { backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" },
  initial: { fontFamily: FontFamily.bold, color: Colors.dark, fontSize: 28 },
  camera: { position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary, borderWidth: 2, borderColor: Colors.white, justifyContent: "center", alignItems: "center" },
  title: { fontFamily: FontFamily.bold, fontSize: 18, color: Colors.dark },
  email: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.secondary, marginTop: 4 },
  badge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6, paddingHorizontal: 9, paddingVertical: 5, marginTop: 8, borderRadius: 20 },
});
