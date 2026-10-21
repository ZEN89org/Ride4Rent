import { useState } from "react";
import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Booking, approveBookingExtension, confirmExtensionPayment, rejectBookingExtension, rejectExtensionPayment, settleBookingExtensionPayment } from "@/services/bookingService";
import { resolveImageUrl } from "@/services/api";
import { copyToClipboard } from "@/utils/clipboard";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";
import { formatChatTime } from "@/utils/chatPayment";
import { AppBottomSheet } from "./AppBottomSheet";
import PaymentQrAccordion from "./PaymentQrAccordion";

const cash = (amount: unknown) => `₱${Number(amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (value?: string) => value ? new Date(`${value.slice(0, 10)}T12:00:00+08:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }) : "—";

export default function ExtensionFlowSheet({ booking, mode, onClose, onChanged, onSaveQr, savingQr = false, savedQr = false }: {
  booking: Booking | null; mode: "review" | "verify" | "pay"; onClose: () => void; onChanged: (booking: Booking) => void;
  onSaveQr?: (url: string) => void; savingQr?: boolean; savedQr?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const run = async (action: "approve" | "decline" | "verify" | "correct" | "pay") => {
    if (!booking || busy) return;
    setError("");
    if (["decline", "correct"].includes(action) && !reason.trim()) { setError("Add a reason so the renter knows what to correct."); return; }
    const cleaned = reference.replace(/[\s-]/g, "");
    if (action === "pay" && (!/^\d{13}$/.test(cleaned) || /^(\d)\1+$/.test(cleaned))) { setError("Enter the authentic 13-digit reference from your GCash receipt."); return; }
    if ((action === "verify" || action === "pay") && !confirmed) { setError(action === "pay" ? "Confirm that you have sent the full extension payment." : "Check your GCash account and confirm the payment was received."); return; }
    setBusy(true);
    try {
      const updated = action === "approve" ? await approveBookingExtension(booking.id)
        : action === "decline" ? await rejectBookingExtension(booking.id, reason.trim())
        : action === "correct" ? await rejectExtensionPayment(booking.id, reason.trim())
        : action === "verify" ? await confirmExtensionPayment(booking.id)
        : await settleBookingExtensionPayment(booking.id, { payment_method: "gcash", payment_reference: cleaned });
      onChanged(updated); onClose();
    } catch (e: any) { setError(e?.response?.data?.message || "Unable to save. Please try again."); }
    finally { setBusy(false); }
  };
  const profile = booking?.operator?.operator_profile || booking?.operator?.operatorProfile || booking?.vehicle?.operator?.operator_profile;
  const info = booking?.operator_payment_info;
  const accountName = info?.account_name || profile?.account_name || "Operator GCash";
  const accountNumber = info?.account_number || profile?.account_number;
  const qr = resolveImageUrl(info?.qr_code_url || profile?.qr_code);
  const title = mode === "review" ? "Review Extension" : mode === "verify" ? "Verify Payment" : "Extension Payment";
  const button = (text: string, action: Parameters<typeof run>[0], secondary = false) => <Pressable disabled={busy} onPress={() => { void run(action); }} style={[styles.button, secondary && styles.secondary, busy && { opacity: 0.6 }]}><Text style={styles.buttonText}>{text}</Text></Pressable>;
  return <AppBottomSheet visible={!!booking} onClose={() => { if (!busy) onClose(); }} dismissOnBackdrop={!busy} sheetStyle={styles.sheet}>
    <View style={styles.header}><View style={styles.icon}><Ionicons name={mode === "review" ? "calendar-outline" : "wallet-outline"} size={22} color={Colors.dark} /></View><View style={{ flex: 1 }}><Text style={styles.title}>{title}</Text><Text style={styles.caption}>{booking?.vehicle?.name || "Trip extension"}</Text></View><Pressable disabled={busy} accessibilityLabel="Close extension" onPress={onClose}><Ionicons name="close" size={22} color={Colors.dark} /></Pressable></View>
    <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 18 }}>
      <View style={styles.steps}>{["Request", "Approval", "Payment", "Verified"].map((step, index) => <Text key={step} style={[styles.step, index <= (mode === "review" ? 0 : mode === "pay" ? 1 : 2) && styles.stepActive]}>{index + 1}. {step}</Text>)}</View>
      <View style={styles.card}>
        <View style={styles.row}><Text style={styles.caption}>Current return</Text><Text style={styles.value}>{date(booking?.end_date)} · {formatChatTime(booking?.return_at) || "10:00 AM"}</Text></View>
        <View style={styles.row}><Text style={styles.caption}>Requested return</Text><Text style={styles.value}>{date(booking?.extension_end_date)} · {booking?.extension_return_time || formatChatTime(booking?.return_at) || "10:00 AM"}</Text></View>
        <View style={styles.row}><Text style={styles.caption}>Additional days</Text><Text style={styles.value}>{booking?.extension_days || 1}</Text></View>
        <View style={styles.rule} /><View style={styles.row}><Text style={styles.label}>Extension fee · 100%</Text><Text style={styles.amount}>{cash(booking?.extension_price)}</Text></View>
      </View>
      <Text style={styles.caption}>{mode === "review" ? "Approval lets the renter pay. The return date changes only after you verify the full extension payment." : mode === "verify" ? "Match the reference and amount against your GCash transaction history. Confirming applies the new return date and sends a confirmation receipt to chat." : "Pay the full extension fee after approval. There is no additional reservation fee. Your current return date stays in effect until the operator verifies payment."}</Text>
      {!!booking?.extension_notes && <Text style={styles.body}>Renter note: {booking.extension_notes}</Text>}
      {!!booking?.extension_payment_review_note && <Text style={styles.warning}>Payment correction: {booking.extension_payment_review_note}</Text>}
      {mode === "pay" && <>
        <Text style={styles.label}>Send payment to</Text>
        <View style={styles.card}><Text style={styles.label}>GCash · {accountName}</Text><View style={styles.row}><Text selectable style={styles.value}>{accountNumber || "Ask the operator for GCash details in chat"}</Text>{!!accountNumber && <Pressable onPress={async () => { setCopied(await copyToClipboard(accountNumber)); }}><Text style={styles.label}>{copied ? "Copied" : "Copy"}</Text></Pressable>}</View></View>
        {!!qr && <PaymentQrAccordion url={qr} expanded={qrOpen} onToggle={() => setQrOpen(value => !value)} saving={savingQr} saved={savedQr} onSave={() => onSaveQr?.(qr)} />}
        <Text style={styles.label}>GCash reference number</Text><TextInput style={styles.input} value={reference} onChangeText={value => setReference(value.replace(/[^\d]/g, "").slice(0, 13))} keyboardType="number-pad" maxLength={13} placeholder="13-digit reference number" />
      </>}
      {mode === "verify" && <View style={styles.card}><Text style={styles.label}>Submitted payment</Text><Text selectable style={styles.body}>GCash · {booking?.extension_payment_reference}</Text><Text style={styles.caption}>Submitted payment is not yet verified.</Text></View>}
      {mode !== "pay" && <><Text style={styles.label}>Reason if declining / requesting correction</Text><TextInput style={styles.input} multiline maxLength={500} value={reason} onChangeText={setReason} placeholder="Explain what the renter needs to know" /></>}
      {mode !== "review" && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }} style={styles.check} onPress={() => setConfirmed(value => !value)}><Ionicons name={confirmed ? "checkbox" : "square-outline"} size={22} color={Colors.dark} /><Text style={[styles.body, { flex: 1 }]}>{mode === "pay" ? "I sent the full extension payment to this operator." : "I verified the reference and received the full amount."}</Text></Pressable>}
      <Text style={styles.caption}>Payment submission and confirmation receipts are posted automatically in your conversation.</Text>
      {!!error && <Text accessibilityRole="alert" style={styles.warning}>{error}</Text>}
    </ScrollView>
    {busy && <ActivityIndicator color={Colors.dark} />}
    <View style={{ gap: 8 }}>
      {mode === "review" ? <>{button("Approve & request payment", "approve")}{button("Decline request", "decline", true)}</> : mode === "verify" ? <>{button("Confirm payment & extend trip", "verify")}{button("Request payment correction", "correct", true)}</> : button("Submit payment for verification", "pay")}
    </View>
  </AppBottomSheet>;
}

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: 20, paddingTop: 8, maxHeight: "90%" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 18 },
  icon: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#FFF4CC", alignItems: "center", justifyContent: "center" },
  title: { fontFamily: FontFamily.bold, fontSize: 19, color: Colors.dark },
  caption: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.secondary, lineHeight: 18 },
  body: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.dark, lineHeight: 19 },
  label: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.dark },
  value: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.dark, flexShrink: 1, textAlign: "right" },
  amount: { fontFamily: FontFamily.bold, fontSize: 20, color: Colors.dark },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  card: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 16, padding: 14, gap: 12 },
  rule: { height: 1, backgroundColor: "#E2E8F0" },
  input: { minHeight: 48, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", fontFamily: FontFamily.regular, fontSize: 13, color: Colors.dark },
  button: { minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: Colors.primary, padding: 12 },
  secondary: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  buttonText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.dark },
  warning: { fontFamily: FontFamily.medium, fontSize: 12, color: "#B45309", lineHeight: 19 },
  check: { flexDirection: "row", alignItems: "center", gap: 10 },
  steps: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  step: { fontFamily: FontFamily.medium, fontSize: 10, color: Colors.secondary, backgroundColor: "#F1F5F9", borderRadius: 8, padding: 6 },
  stepActive: { backgroundColor: "#FFF4CC", color: Colors.dark },
});
