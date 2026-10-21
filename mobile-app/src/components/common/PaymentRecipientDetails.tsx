import { Ionicons } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import { copyToClipboard } from "@/utils/clipboard";

export default function PaymentRecipientDetails({ accountName, accountNumber, qrUrl, onViewQr, qrExpanded, children }: {
  accountName?: string | null; accountNumber?: string | null; qrUrl?: string | null;
  onViewQr: (url: string) => void; qrExpanded?: boolean; children?: ReactNode;
}) {
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const { showInfo } = useAppToast();
  const copied = !!accountNumber && copiedNumber === accountNumber;
  return <View style={styles.recipient}>
    <View style={styles.row}><Text style={styles.label}>Pay to</Text><Text style={styles.value}>{accountName || "Ask your operator"}</Text></View>
    <View style={styles.row}>
      <Text selectable style={styles.number}>{accountNumber || "GCash number unavailable"}</Text>
      {!!accountNumber && <Pressable accessibilityRole="button" accessibilityLabel="Copy payment account number" style={styles.copy} onPress={async () => {
        if (await copyToClipboard(accountNumber)) setCopiedNumber(accountNumber);
        else showInfo("Copy unavailable", "Select the account number to copy it manually.");
      }}><Ionicons name={copied ? "checkmark" : "copy-outline"} size={17} color={Colors.dark} /><Text style={styles.value}>{copied ? "Copied" : "Copy"}</Text></Pressable>}
    </View>
    {!!qrUrl && <Pressable accessibilityRole="button" accessibilityState={qrExpanded === undefined ? undefined : { expanded: qrExpanded }} style={styles.qr} onPress={() => onViewQr(qrUrl)}><Ionicons name="qr-code-outline" size={19} color={Colors.dark} /><Text style={styles.qrText}>View payment QR code</Text><Ionicons name={qrExpanded === undefined ? "chevron-forward" : qrExpanded ? "chevron-up" : "chevron-down"} size={16} color={Colors.secondary} /></Pressable>}
    {children}
  </View>;
}
const styles = StyleSheet.create({
  recipient: { backgroundColor: "#F8FAFC", borderRadius: 12, padding: 12, gap: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  label: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.secondary },
  value: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.dark, flexShrink: 1 },
  number: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.dark, flexShrink: 1 },
  copy: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, minHeight: 44, paddingHorizontal: 10, borderWidth: 1, borderColor: Colors.border, borderRadius: 10 },
  qr: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8 },
  qrText: { flex: 1, fontFamily: FontFamily.medium, fontSize: 12, color: Colors.dark },
});
