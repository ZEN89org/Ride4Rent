import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAppToast } from "@/context/ToastContext";

export default function ProfileLogoutButton() {
  const { logout } = useAuth();
  const { showError } = useAppToast();
  const [busy, setBusy] = useState(false);
  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await logout();
      if (router.canDismiss()) router.dismissAll();
      router.replace("/auth");
    } catch { showError("Unable to log out", "Please try again."); }
    finally { setBusy(false); }
  };
  return <Pressable accessibilityRole="button" disabled={busy} style={({ pressed }) => [styles.button, pressed && { opacity: 0.6 }]} onPress={signOut}>
    {busy ? <ActivityIndicator color={Colors.dark} /> : <Ionicons name="log-out-outline" size={21} color={Colors.dark} />}
    <Text style={styles.text}>{busy ? "Logging out…" : "Log Out"}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, marginTop: 24, padding: 14, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: "center" },
  text: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.dark },
});
