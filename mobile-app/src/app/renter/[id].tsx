import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import RenterProfileContent, { type RenterViewProfile } from "@/components/common/RenterProfileContent";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";
import { useCall } from "@/context/CallContext";
import { getRenterProfile } from "@/services/renterProfileService";

export default function RenterProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { startCall } = useCall();
  const [profile, setProfile] = useState<RenterViewProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true; setLoading(true); setError(false);
    getRenterProfile(String(id)).then(person => { if (active) setProfile(person); }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, retry]));
  return <SafeAreaView edges={["top", "bottom"]} style={styles.root}>
    <View style={styles.header}><TouchableOpacity accessibilityLabel="Back" style={styles.close} onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={Colors.dark} /></TouchableOpacity><Text style={styles.title}>Renter Profile</Text><View style={styles.close} /></View>
    {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} /> : error || !profile ? <View style={styles.empty}><Text style={styles.title}>Profile unavailable</Text><Text style={styles.caption}>You can view renters you have a booking or conversation with.</Text><TouchableOpacity onPress={() => setRetry(value => value + 1)}><Text style={styles.title}>Try Again</Text></TouchableOpacity></View> : <ScrollView contentContainerStyle={styles.content}><RenterProfileContent key={profile.id} renter={profile} onInspect={setPreview} onMessage={() => router.push({ pathname: "/chat/[id]", params: { id: String(profile.id), name: `${profile.first_name} ${profile.last_name}` } })} onCall={() => { void startCall({ id: profile.id, name: `${profile.first_name} ${profile.last_name}`, role: "customer", profile_photo: profile.profile_photo }); }} /></ScrollView>}
    <Modal visible={!!preview} transparent onRequestClose={() => setPreview(null)}><View style={styles.viewer}><TouchableOpacity accessibilityLabel="Close license photo" style={styles.viewerClose} onPress={() => setPreview(null)}><Ionicons name="close" size={26} color={Colors.white} /></TouchableOpacity>{!!preview && <Image source={{ uri: preview }} style={{ width: "100%", flex: 1 }} contentFit="contain" />}</View></Modal>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 }, close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, title: { fontFamily: FontFamily.semiBold, fontSize: 16, color: Colors.dark }, content: { paddingHorizontal: 24, paddingBottom: 32 }, empty: { padding: 24, alignItems: "center", gap: 16 }, caption: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 21, color: Colors.secondary, textAlign: "center" }, viewer: { flex: 1, paddingTop: 48, paddingBottom: 24, backgroundColor: "#000E" }, viewerClose: { height: 48, alignItems: "flex-end", justifyContent: "center", paddingHorizontal: 24 },
});
