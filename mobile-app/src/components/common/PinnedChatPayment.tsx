import PaymentRecipientDetails from "./PaymentRecipientDetails";
import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";
import type { BookingContext } from "@/services/messageService";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const currency = (value: unknown) => `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PinnedChatPayment({ context, kind, keyboardVisible, onViewQr }: {
  context: BookingContext; kind: "reservation" | "extension"; keyboardVisible: boolean; onViewQr: (url: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const info = context.operator_payment_info;
  const amount = kind === "extension" ? context.extension_price : context.reservation_fee;
  const open = expanded && !keyboardVisible;
  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel="Pinned payment details" onPress={() => setExpanded(!open)} style={styles.header}>
        <View style={styles.icon}><Ionicons name="wallet-outline" size={21} color={Colors.dark} /></View>
        <View style={styles.heading}>
          <Text style={styles.title}>{kind === "extension" ? "Extension payment" : "Reservation payment"}</Text>
          <Text style={styles.vehicle} numberOfLines={1}>{context.vehicle_name}</Text>
        </View>
        <View style={styles.amountGroup}><Text style={styles.amount}>{currency(amount)}</Text><Text style={styles.vehicle}>via GCash</Text></View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={17} color={Colors.secondary} />
      </Pressable>
      {open && <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        {kind === "reservation" && <>
          <View style={styles.row}><Text style={styles.label}>Rental total</Text><Text style={styles.value}>{currency(context.total_price)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Before pickup</Text><Text style={styles.value}>{currency(Math.max(0, Number(context.total_price) - Number(context.reservation_fee)))}</Text></View>
        </>}
        <PaymentRecipientDetails accountName={info?.account_name || info?.business_name} accountNumber={info?.account_number} qrUrl={info?.qr_code_url} onViewQr={onViewQr} />
      </ScrollView>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 14, marginTop: 8, marginBottom: 8, borderWidth: 0, borderColor: "#E9D89B", borderRadius: 16, backgroundColor: Colors.white, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: "#FFFCF0" },
  icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFF0B3", alignItems: "center", justifyContent: "center" },
  heading: { flex: 1, minWidth: 0, gap: 2 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  eyebrow: { fontFamily: FontFamily.medium, fontSize: 9, letterSpacing: 0.5, color: Colors.secondary },
  title: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.dark },
  vehicle: { fontFamily: FontFamily.regular, fontSize: 10, color: Colors.secondary },
  amountGroup: { alignItems: "flex-end", maxWidth: "34%" },
  amount: { fontFamily: FontFamily.bold, fontSize: 14, color: Colors.dark },
  body: { maxHeight: 240, borderTopWidth: 1, borderTopColor: "#F1E7C6" },
  bodyContent: { padding: 12, gap: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  label: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.secondary },
  value: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.dark, flexShrink: 1 },
});
