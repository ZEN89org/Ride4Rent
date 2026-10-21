import { useEffect, useState } from "react";
import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Booking, earlyReturnAction } from "@/services/bookingService";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";
import { AppBottomSheet } from "./AppBottomSheet";
import TripTimePickerContent from "./TripTimePickerContent";

const phtDay = (value: Date) => new Date(value.getTime() + 8 * 3600000).toISOString().slice(0, 10);
const scheduled = (booking: Booking) => booking.return_at || `${booking.end_date.slice(0, 10)}T10:00:00+08:00`;
const stamp = (value?: string) => value ? new Date(value).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const money = (value: unknown) => `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function EarlyReturnPanel({ booking, operator = false, onChanged }: {
  booking: Booking; operator?: boolean; onChanged: (booking: Booking) => void;
}) {
  const [clock, setClock] = useState(Date.now);
  const [mode, setMode] = useState<"request" | "review" | "refund" | "details" | null>(null);
  const [day, setDay] = useState(() => phtDay(new Date(Date.now() + 30 * 60000)));
  const [time, setTime] = useState(() => new Date(Date.now() + 30 * 60000).toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hour12: true }));
  const [timeOpen, setTimeOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("gcash");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const active = ["trip_in_progress", "ongoing", "return_pending"].includes(booking.status);
  useEffect(() => { if (!active) return; const timer = setInterval(() => setClock(Date.now()), 30000); return () => clearInterval(timer); }, [active]);
  const openRequest = ["pending", "approved"].includes(booking.early_return_status || "");
  const hasRefund = !!booking.early_return_refund_recorded_at;
  const open = (next: typeof mode) => {
    setError(""); setReason("");
    if (next === "request") {
      const nextTime = new Date(Math.min(clock + 30 * 60000, new Date(scheduled(booking)).getTime() - 60000));
      setDay(phtDay(nextTime));
      setTime(nextTime.toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hour12: true }));
    }
    setMode(next);
  };
  const close = () => { if (!busy) { setTimeOpen(false); setMode(null); } };
  const act = async (action: Parameters<typeof earlyReturnAction>[1], data: Record<string, unknown> = {}) => {
    if (busy) return;
    setError(""); setBusy(true);
    try { const updated = await earlyReturnAction(booking.id, action, data); setMode(null); onChanged(updated); }
    catch (e: any) { setError(e?.response?.data?.message || "Unable to save. Check your connection and try again."); }
    finally { setBusy(false); }
  };
  const request = () => {
    const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) { setError("Select a return time."); return; }
    const hour = Number(match[1]) % 12 + (match[3].toUpperCase() === "PM" ? 12 : 0);
    const proposed = new Date(`${day}T${String(hour).padStart(2, "0")}:${match[2]}:00+08:00`);
    if (!Number.isFinite(proposed.getTime()) || proposed.getTime() <= clock || proposed >= new Date(scheduled(booking))) {
      setError("Choose a future time before your scheduled return."); return;
    }
    void act("request", { requested_for: proposed.toISOString(), reason: reason.trim() });
  };
  const dates: string[] = [];
  const firstDay = phtDay(new Date(clock));
  const lastDay = phtDay(new Date(scheduled(booking)));
  for (let value = firstDay; value <= lastDay && dates.length < 366; value = phtDay(new Date(new Date(`${value}T12:00:00+08:00`).getTime() + 86400000))) dates.push(value);
  if (!active && !(booking.status === "completed" && booking.returned_early)) return null;
  const canRequest = active && !openRequest && !["pending", "payment_required", "pending_verification"].includes(booking.extension_status || "") && new Date(scheduled(booking)).getTime() > clock;
  const button = (label: string, onPress: () => void, secondary = false) => <Pressable disabled={busy} accessibilityRole="button" onPress={onPress} style={[styles.button, secondary && styles.secondary, busy && { opacity: 0.6 }]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
  if (active && !openRequest && (operator || !canRequest)) return null;
  const actionTitle = booking.returned_early ? "Returned early" : openRequest ? (operator && booking.early_return_status === "pending" ? "Review early return" : `Early return · ${booking.early_return_status === "approved" ? "Agreed" : "Pending"}`) : "Early return";
  return <View style={styles.panel}>
    <Pressable accessibilityRole="button" onPress={() => open(!operator && canRequest ? "request" : operator && booking.early_return_status === "pending" ? "review" : "details")} style={styles.cardAction}>
      <Ionicons name="return-down-back-outline" size={14} color={Colors.dark} /><Text style={styles.buttonText}>{actionTitle}</Text>
    </Pressable>

    <AppBottomSheet visible={!!mode} onClose={close} sheetStyle={styles.sheet}>
      <View style={styles.header}><View style={styles.icon}><Ionicons name="return-down-back-outline" size={23} color={Colors.dark} /></View><View style={{ flex: 1 }}><Text style={styles.title}>{mode === "refund" ? "Agreed Refund" : mode === "review" ? "Review Return" : "Early Return"}</Text><Text style={styles.caption}>{booking.vehicle?.name || "Your rental"}</Text></View><Pressable disabled={busy} accessibilityLabel="Close early return" onPress={close}><Ionicons name="close" size={22} color={Colors.dark} /></Pressable></View>
      <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 16 }}>
        <View style={styles.summary}>
          {!!booking.booked_return_at && booking.booked_return_at !== booking.return_at && <Text style={styles.caption}>Originally booked: {stamp(booking.booked_return_at)}</Text>}
          <Text style={styles.body}>Scheduled return: {stamp(scheduled(booking))}</Text>
          {mode !== "request" && !!booking.early_return_requested_for && <Text style={styles.body}>Proposed return: {stamp(booking.early_return_requested_for)}</Text>}
          {!!booking.actual_end_time && <Text style={styles.body}>Actual return: {stamp(booking.actual_end_time)}</Text>}
          <Text style={styles.label}>Rental total: {money(booking.total_price)}</Text>
        </View>
        <Text style={styles.caption}>The rental was paid before handover. Discuss any refund face to face with the operator and record it here once paid. The original rental total stays unchanged. GPS remains active until return inspection is completed.</Text>
        {mode === "request" && <>
          <Text style={styles.label}>Return date · Philippine time</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{dates.map(value => <Pressable key={value} onPress={() => setDay(value)} style={[styles.date, day === value && styles.selected]}><Text style={styles.body}>{new Date(`${value}T12:00:00+08:00`).toLocaleDateString("en-US", { timeZone: "Asia/Manila", month: "short", day: "numeric" })}</Text></Pressable>)}</ScrollView>
          {button(`Return time: ${time}`, () => setTimeOpen(true), true)}
          <Text style={styles.label}>Reason (optional)</Text>
          <TextInput value={reason} onChangeText={setReason} maxLength={500} multiline placeholder="Tell the operator about your plans" style={styles.input} />
        </>}
        {(mode === "review" || mode === "details") && <>
          {!!booking.early_return_reason && <Text style={styles.body}>Renter: {booking.early_return_reason}</Text>}
          {!!booking.early_return_response && <Text style={styles.body}>Operator: {booking.early_return_response}</Text>}
        </>}
        {mode === "review" && <><Text style={styles.label}>Response (required when declining)</Text><TextInput value={reason} onChangeText={setReason} maxLength={500} multiline placeholder="Add a message for the renter" style={styles.input} /></>}
        {mode === "refund" && <>
          <Text style={styles.caption}>Record only a refund you have already sent or handed over. This does not transfer money or change the original rental ledger.</Text>
          <Text style={styles.label}>Refund amount</Text><TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" style={styles.input} />
          <Text style={styles.label}>Method</Text><View style={styles.row}>{["gcash", "cash", "bank"].map(value => <Pressable key={value} onPress={() => setMethod(value)} style={[styles.date, method === value && styles.selected]}><Text style={styles.body}>{value === "gcash" ? "GCash" : value === "cash" ? "Cash" : "Bank"}</Text></Pressable>)}</View>
          <Text style={styles.label}>Transfer / handover reference</Text><TextInput value={reference} onChangeText={setReference} maxLength={255} placeholder="Reference or cash handover record" style={styles.input} />
          <Text style={styles.label}>Agreed reason</Text><TextInput value={reason} onChangeText={setReason} maxLength={500} multiline placeholder="Why was this refund agreed?" style={styles.input} />
        </>}
        {hasRefund && mode === "details" && <View style={styles.summary}><Text style={styles.label}>Agreed refund: {money(booking.early_return_refund_amount)}</Text><Text style={styles.body}>{booking.early_return_refund_method?.toUpperCase()} · {booking.early_return_refund_reference}</Text><Text style={styles.body}>{booking.early_return_refund_reason}</Text><Text style={styles.caption}>Recorded: {stamp(booking.early_return_refund_recorded_at)}</Text><Text style={styles.caption}>{booking.early_return_refund_received_at ? `Received: ${stamp(booking.early_return_refund_received_at)}` : "Confirm only after the money has reached you."}</Text></View>}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      </ScrollView>
      {busy && <ActivityIndicator color={Colors.dark} />}
      {mode === "request" && button("Send return request", request)}
      {mode === "review" && <View style={styles.row}><View style={{ flex: 1 }}>{button("Decline", () => { if (!reason.trim()) { setError("Add a reason for declining."); return; } void act("review", { decision: "declined", response: reason.trim() }); }, true)}</View><View style={{ flex: 1 }}>{button("Approve time", () => { void act("review", { decision: "approved", response: reason.trim() }); })}</View></View>}
      {mode === "details" && active && openRequest && !operator && button("Withdraw request", () => { void act("withdraw"); }, true)}
      {mode === "details" && operator && booking.returned_early && !hasRefund && button("Record agreed refund", () => open("refund"))}
      {mode === "refund" && button("Record refund sent", () => {
        if (!Number.isFinite(Number(amount)) || Number(amount) <= 0 || Number(amount) > Number(booking.total_price) || !reference.trim() || !reason.trim()) { setError("Enter a valid amount within the rental total, reference and reason."); return; }
        void act("refund", { amount: Number(amount), method, reference: reference.trim(), reason: reason.trim() });
      })}
      {mode === "details" && hasRefund && !operator && !booking.early_return_refund_received_at && button("I received this refund", () => { void act("confirm", { received: true }); })}
      <AppBottomSheet visible={timeOpen} onClose={() => setTimeOpen(false)} renderAsOverlay sheetStyle={styles.sheet}><TripTimePickerContent key={`${day}-${time}`} value={time} date={new Date(`${day}T12:00:00+08:00`)} target="return" onClose={() => setTimeOpen(false)} onSave={value => { setTime(value); setTimeOpen(false); }} /></AppBottomSheet>
    </AppBottomSheet>
  </View>;
}

const styles = StyleSheet.create({
  panel: { marginTop: 8, alignSelf: "flex-start" },
  cardAction: { minHeight: 36, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  sheet: { paddingHorizontal: 20, paddingTop: 8, maxHeight: "90%" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 18 },
  icon: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#FFF4CC", alignItems: "center", justifyContent: "center" },
  title: { fontFamily: FontFamily.bold, fontSize: 19, color: Colors.dark },
  label: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.dark },
  body: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.dark, lineHeight: 19 },
  caption: { fontFamily: FontFamily.regular, fontSize: 11, color: "#64748B", lineHeight: 18 },
  summary: { padding: 14, borderRadius: 14, backgroundColor: "#F8FAFC", gap: 8 },
  button: { minHeight: 44, borderRadius: 12, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, paddingVertical: 10 },
  secondary: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  buttonText: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.dark, textAlign: "center" },
  date: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF" },
  selected: { backgroundColor: "#FFF4CC", borderColor: Colors.primary },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", padding: 12, fontFamily: FontFamily.regular, fontSize: 13, color: Colors.dark },
  error: { color: "#B91C1C", fontFamily: FontFamily.medium, fontSize: 12 },
});
