import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";

interface Props {
  url: string;
  expanded: boolean;
  onToggle: () => void;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}

export default function PaymentQrAccordion({ url, expanded, onToggle, saving, saved, onSave }: Props) {
  return (
    <View style={[styles.card, expanded && styles.expanded]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Pay with QR code" accessibilityHint={expanded ? "Hide the payment QR code" : "Show the payment QR code"} accessibilityState={{ expanded }} onPress={onToggle} style={({ pressed }) => [styles.toggle, pressed && { opacity: 0.7 }]}>
        <View style={styles.icon}><Ionicons name="qr-code-outline" size={23} color={Colors.dark} /></View>
        <View style={styles.heading}>
          <Text style={styles.title}>Pay with QR Code</Text>
          <Text style={styles.subtitle}>{expanded ? "Save and open in GCash" : "View your operator’s payment QR"}</Text>
        </View>
        <View style={[styles.chevron, expanded && styles.chevronActive]}><Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={Colors.dark} /></View>
      </Pressable>
      {expanded && <QrPreview key={url} url={url} saving={saving} saved={saved} onSave={onSave} />}
    </View>
  );
}

function QrPreview({ url, saving, saved, onSave }: Pick<Props, "url" | "saving" | "saved" | "onSave">) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  return (
    <View style={styles.body}>
      <View style={styles.preview}>
        <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="contain" accessibilityLabel="Operator GCash payment QR code" onLoad={() => { setLoading(false); setFailed(false); }} onError={() => { setLoading(false); setFailed(true); }} />
        {loading && <View style={styles.imageState}><ActivityIndicator color={Colors.dark} /><Text style={styles.subtitle}>Loading QR code…</Text></View>}
        {failed && <View style={styles.imageState}><Ionicons name="image-outline" size={28} color={Colors.secondary} /><Text style={styles.error}>QR code unavailable. Use the account number above.</Text></View>}
      </View>
      <Pressable accessibilityRole="button" disabled={saving || loading || failed} onPress={onSave} style={({ pressed }) => [styles.save, saved && styles.saved, (pressed || saving || loading || failed) && { opacity: 0.6 }]}>
        {saving ? <ActivityIndicator color={Colors.dark} /> : <Ionicons name={saved ? "checkmark-circle-outline" : "download-outline"} size={19} color={Colors.dark} />}
        <Text style={styles.saveText}>{saving ? "Saving…" : saved ? "Saved to Gallery" : "Save QR Code"}</Text>
      </Pressable>
      <Text style={styles.instructions}>In GCash, open Scan QR and select the saved image.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: Colors.border, borderRadius: 16, overflow: "hidden", backgroundColor: Colors.white, marginTop: 4 },
  expanded: { borderColor: "#E9D17D" },
  toggle: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  icon: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#FFF5CC", alignItems: "center", justifyContent: "center" },
  heading: { flex: 1, minWidth: 0, gap: 3 },
  title: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.dark },
  subtitle: { fontFamily: FontFamily.regular, fontSize: 11, lineHeight: 17, color: Colors.secondary },
  chevron: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  chevronActive: { backgroundColor: "#FFF5CC" },
  body: { borderTopWidth: 1, borderTopColor: "#F1E8CB", backgroundColor: "#FFFEF9", padding: 16, alignItems: "center" },
  preview: { width: "100%", maxWidth: 240, aspectRatio: 1, backgroundColor: Colors.white, borderRadius: 12, overflow: "hidden", marginBottom: 16 },
  imageState: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: Colors.white, alignItems: "center", justifyContent: "center", padding: 16, gap: 10 },
  error: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 18, color: Colors.secondary, textAlign: "center" },
  save: { width: "100%", minHeight: 48, padding: 12, borderRadius: 12, backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saved: { backgroundColor: "#FFF0B3" },
  saveText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.dark },
  instructions: { fontFamily: FontFamily.regular, fontSize: 11, lineHeight: 17, color: Colors.secondary, textAlign: "center", marginTop: 10 },
});
