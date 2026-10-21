import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";

interface Props { currentPage: number; totalItems: number; pageSize?: number; onPageChange: (page: number) => void; itemName?: string; containerStyle?: StyleProp<ViewStyle> }
export default function ListPagination({ currentPage, totalItems, pageSize = 15, onPageChange, containerStyle }: Props) {
  const size = Math.max(1, Math.floor(pageSize));
  const pages = Math.max(1, Math.ceil(totalItems / size));
  const page = Math.min(pages, Math.max(1, Math.floor(currentPage) || 1));
  if (pages <= 1) return null;
  return <View style={[styles.container, containerStyle]}>

    <View style={styles.row}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous page" accessibilityState={{ disabled: page === 1 }} disabled={page === 1} onPress={() => onPageChange(page - 1)} style={[styles.button, page === 1 && styles.disabled]}><Ionicons name="chevron-back" size={20} color={Colors.dark} /></TouchableOpacity>
      <View style={styles.page}><Text accessibilityLiveRegion="polite" style={styles.pageText}>{page} / {pages}</Text></View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Next page" accessibilityState={{ disabled: page === pages }} disabled={page === pages} onPress={() => onPageChange(page + 1)} style={[styles.button, page < pages && styles.next, page === pages && styles.disabled]}><Ionicons name="chevron-forward" size={20} color={Colors.dark} /></TouchableOpacity>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  container: { width: "100%", maxWidth: "100%", alignSelf: "center", paddingVertical: 4, marginTop: 8, marginBottom: 8 },
  caption: { fontFamily: FontFamily.regular, fontSize: 11, lineHeight: 18, color: Colors.secondary, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  button: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  next: { backgroundColor: Colors.primary },
  disabled: { opacity: 0.35 },
  page: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center" },
  pageText: { fontFamily: FontFamily.semiBold, fontSize: 12, lineHeight: 18, color: Colors.dark, textAlign: "center" },
});
