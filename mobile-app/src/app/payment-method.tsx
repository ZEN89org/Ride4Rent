import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "@/components/common/KeyboardAwareScrollView";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import api from "@/services/api";

type Method = { account_name: string; account_number: string };
export default function PaymentMethodScreen() {
  const { user, isGuest } = useAuth();
  const { showSuccess, showError, showModal } = useAppToast();
  const [saved, setSaved] = useState<Method | null>(null);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [reload, setReload] = useState(0);
  const allowed = !!user && !isGuest && user.role !== "operator";
  useEffect(() => {
    let active = true;
    if (!allowed) return;
    api.get<{ data: Method | null }>("/user/payment-method").then(response => {
      if (!active) return;
      const method = response.data.data;
      setSaved(method); setName(method?.account_name || ""); setNumber(method?.account_number || ""); setEditing(!method);
    }).catch(() => { if (active) setFailed(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed, reload, user?.id]);
  const cleanName = name.trim().replace(/\s+/g, " ");
  const cleanNumber = number.trim().replace(/^\+63/, "0");
  const nameError = cleanName.length < 2 || cleanName.length > 100 || !/^[\p{L}\p{M}][\p{L}\p{M} .'’\-]*$/u.test(cleanName);
  const numberError = !/^09\d{9}$/.test(cleanNumber);
  const save = async () => {
    setAttempted(true);
    if (nameError || numberError || busy) return;
    setBusy(true);
    try {
      const response = await api.put<{ data: Method }>("/user/payment-method", { account_name: cleanName, account_number: cleanNumber });
      setSaved(response.data.data); setName(cleanName); setNumber(cleanNumber); setEditing(false); setAttempted(false);
      showSuccess("Payment method saved", "Your GCash details have been updated.");
    } catch { showError("Could not save", "Please check your connection and try again."); }
    finally { setBusy(false); }
  };
  const remove = () => showModal("Remove payment method?", "You can add your GCash details again anytime.", [
    { text: "Keep", style: "cancel" },
    { text: "Remove", style: "destructive", onPress: async () => {
      setBusy(true);
      try { await api.delete("/user/payment-method"); setSaved(null); setName(""); setNumber(""); setEditing(true); setAttempted(false); showSuccess("Payment method removed"); }
      catch { showError("Could not remove", "Please try again."); }
      finally { setBusy(false); }
    } },
  ], "confirm");
  return <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
    <View style={styles.header}><Pressable accessibilityLabel="Go back" style={styles.back} onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color={Colors.dark} /></Pressable><Text style={styles.heading}>Payment Method</Text><View style={styles.back} /></View>
    <KeyboardAwareScrollView contentContainerStyle={styles.content}>
      {!allowed ? <Text style={styles.description}>Sign in as a renter to save a payment method.</Text> : loading ? <ActivityIndicator color={Colors.dark} /> : failed ? <View style={styles.card}><Text style={styles.description}>Could not load your payment method.</Text><Pressable style={styles.primary} onPress={() => { setLoading(true); setFailed(false); setReload(value => value + 1); }}><Text style={styles.buttonText}>Try again</Text></Pressable></View> : <>
        <View style={styles.intro}><View style={styles.icon}><Ionicons name="wallet-outline" size={28} color={Colors.dark} /></View><Text style={styles.title}>Your GCash account</Text><Text style={styles.description}>Keep your account details in one place.</Text></View>
        <View style={styles.card}>
          <View style={styles.cardHeader}><Text style={styles.cardTitle}>GCash</Text><Text style={styles.badge}>{saved ? "Saved account" : "Mobile wallet"}</Text></View>
          {editing ? <>
            <Text style={styles.label}>Account name</Text><TextInput accessibilityLabel="GCash account name" style={[styles.input, attempted && nameError && styles.invalid]} value={name} onChangeText={setName} placeholder="Name registered in GCash" placeholderTextColor="#94A3B8" autoCapitalize="words" maxLength={100} editable={!busy} />
            {attempted && nameError && <Text style={styles.error}>Enter your registered account name using letters.</Text>}
            <Text style={styles.label}>Mobile number</Text><TextInput accessibilityLabel="GCash mobile number" style={[styles.input, attempted && numberError && styles.invalid]} value={number} onChangeText={setNumber} placeholder="09XXXXXXXXX" placeholderTextColor="#94A3B8" keyboardType="phone-pad" autoComplete="tel" maxLength={13} editable={!busy} />
            {attempted && numberError && <Text style={styles.error}>Use 11 digits starting with 09, or +639.</Text>}
            <Pressable style={[styles.primary, busy && styles.disabled]} disabled={busy} onPress={save}>{busy ? <ActivityIndicator color={Colors.dark} /> : <Text style={styles.buttonText}>Save payment method</Text>}</Pressable>
            {!!saved && <Pressable disabled={busy} style={styles.secondary} onPress={() => { setName(saved.account_name); setNumber(saved.account_number); setAttempted(false); setEditing(false); }}><Text style={styles.buttonText}>Cancel</Text></Pressable>}
          </> : <>
            <View style={styles.detail}><Text style={styles.detailLabel}>Account name</Text><Text selectable style={styles.value}>{saved?.account_name}</Text></View>
            <View style={styles.detail}><Text style={styles.detailLabel}>Mobile number</Text><Text selectable style={styles.value}>{saved?.account_number}</Text></View>
            <Pressable disabled={busy} style={styles.primary} onPress={() => setEditing(true)}><Text style={styles.buttonText}>Edit details</Text></Pressable>
            <Pressable disabled={busy} style={styles.secondary} onPress={remove}>{busy ? <ActivityIndicator color={Colors.dark} /> : <Text style={styles.remove}>Remove payment method</Text>}</Pressable>
          </>}
        </View>
        <View style={styles.note}><Ionicons name="information-circle-outline" size={19} color={Colors.secondary} /><Text style={styles.noteText}>Saving details does not make a payment or change an existing booking. Never enter your GCash PIN or OTP.</Text></View>
      </>}
    </KeyboardAwareScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" }, header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.white }, back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, heading: { flex: 1, textAlign: "center", fontFamily: FontFamily.semiBold, fontSize: 18, color: Colors.dark },
  content: { padding: 20, gap: 20, paddingBottom: 32, width: "100%", maxWidth: 540, alignSelf: "center" }, intro: { alignItems: "center", gap: 8, paddingVertical: 8 }, icon: { width: 64, height: 64, borderRadius: 22, backgroundColor: Colors.logoBackground, alignItems: "center", justifyContent: "center", marginBottom: 6 }, title: { fontFamily: FontFamily.semiBold, fontSize: 21, color: Colors.dark }, description: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 21, color: Colors.secondary, textAlign: "center" },
  card: { backgroundColor: Colors.white, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#E2E8F0" }, cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 20 }, cardTitle: { fontFamily: FontFamily.semiBold, fontSize: 19, color: Colors.dark }, badge: { fontFamily: FontFamily.medium, fontSize: 11, color: Colors.dark, backgroundColor: Colors.logoBackground, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 }, label: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.dark, marginBottom: 8, marginTop: 10 }, input: { minHeight: 52, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, paddingHorizontal: 14, fontFamily: FontFamily.regular, fontSize: 15, color: Colors.dark }, invalid: { borderColor: "#DC2626" }, error: { fontFamily: FontFamily.regular, fontSize: 11, color: "#B91C1C", marginTop: 6 },
  primary: { minHeight: 50, borderRadius: 14, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", marginTop: 22, padding: 12 }, secondary: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 6 }, buttonText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.dark }, remove: { fontFamily: FontFamily.medium, fontSize: 13, color: "#B91C1C" }, disabled: { opacity: .6 }, detail: { flexDirection: "row", gap: 16, justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderColor: "#F1F5F9" }, detailLabel: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.secondary }, value: { flex: 1, textAlign: "right", fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.dark }, note: { flexDirection: "row", gap: 10 }, noteText: { flex: 1, fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 19, color: Colors.secondary },
});
