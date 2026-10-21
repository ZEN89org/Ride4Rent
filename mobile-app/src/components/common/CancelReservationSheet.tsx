import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AppBottomSheet } from "./AppBottomSheet";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";

export default function CancelReservationSheet({ visible, vehicleName, busy, error, onClose, onConfirm, action = "cancel" }: {
  visible: boolean; vehicleName: string; busy: boolean; error: string;
  onClose: () => void; onConfirm: () => void;
  action?: "cancel" | "delete";
}) {
  const deleting = action === "delete";
  return (
    <AppBottomSheet visible={visible} onClose={() => { if (!busy) onClose(); }} dismissOnBackdrop={!busy}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel={deleting ? "Close delete prompt" : "Close cancellation prompt"} onPress={onClose} style={styles.close} hitSlop={8}>
          <Ionicons name="close" size={22} color={Colors.dark} />
        </Pressable>
        <View style={styles.icon}><Ionicons name={deleting ? "trash-outline" : "calendar-clear-outline"} size={32} color={Colors.dark} /></View>
        <Text style={styles.title}>{deleting ? "Delete Booking?" : "Cancel Reservation?"}</Text>
        <Text style={styles.description}>{deleting ? `Remove the booking for ${vehicleName} from your list? This cannot be undone.` : `Cancel your reservation for ${vehicleName}?`}</Text>
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <Pressable disabled={busy} accessibilityRole="button" onPress={onConfirm} style={({ pressed }) => [styles.confirm, (pressed || busy) && { opacity: 0.65 }]}>
          {busy ? <ActivityIndicator color={Colors.dark} /> : <Ionicons name={deleting ? "trash-outline" : "close-circle-outline"} size={20} color={Colors.dark} />}
          <Text style={styles.confirmText}>{busy ? deleting ? "Deleting…" : "Cancelling…" : deleting ? "Delete Booking" : "Cancel Reservation"}</Text>
        </Pressable>
        <Pressable disabled={busy} accessibilityRole="button" onPress={onClose} style={styles.keep}><Text style={styles.keepText}>Keep Booking</Text></Pressable>
      </ScrollView>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingBottom: 8 },
  close: { position: "absolute", top: 0, right: 0, width: 44, height: 44, alignItems: "center", justifyContent: "center", zIndex: 1 },
  icon: { width: 64, height: 64, borderRadius: 22, backgroundColor: "#FFF5CC", alignSelf: "center", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  title: { fontFamily: FontFamily.bold, fontSize: 24, color: Colors.dark, textAlign: "center" },
  description: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22, color: Colors.secondary, textAlign: "center", marginTop: 10, marginHorizontal: 12 },
  confirm: { minHeight: 52, borderRadius: 16, backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 24, padding: 14 },
  confirmText: { fontFamily: FontFamily.semiBold, fontSize: 16, color: Colors.dark },
  keep: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 6 },
  keepText: { fontFamily: FontFamily.medium, fontSize: 14, color: Colors.secondary },
  error: { fontFamily: FontFamily.regular, color: "#B91C1C", fontSize: 13, textAlign: "center", marginTop: 12 },
});
