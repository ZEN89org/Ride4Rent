import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";
import { resolveImageUrl } from "@/services/api";
import ProfileInformation from "./ProfileInformation";
import { ProfileSummary } from "./ProfileSummary";

export interface RenterViewProfile {
  id: number; first_name?: string; middle_name?: string; last_name?: string; suffix?: string; email?: string; mobile_number?: string;
  profile_photo?: string; date_of_birth?: string; sex?: string; is_drivers_license_verified?: boolean;
  license_verification_status?: string; can_review_license?: boolean;
  drivers_license_front_url?: string; drivers_license_back_url?: string;
  drivers_license_front?: string; drivers_license_back?: string;
}

export default function RenterProfileContent({ renter, onMessage, onCall, onInspect }: {
  renter: RenterViewProfile; onMessage: () => void; onCall: () => void; onInspect: (uri: string) => void;
}) {
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const name = [renter.first_name, renter.middle_name, renter.last_name, renter.suffix].filter(Boolean).join(" ") || "Renter";
  const verified = renter.is_drivers_license_verified;
  const licenseBadge = verified ? "Verified Driver" : renter.license_verification_status === "pending" ? "License Under Review" : renter.license_verification_status === "rejected" ? "License Update Required" : "Renter";
  const birthday = renter.date_of_birth?.slice(0, 10);
  return <View>
    <ProfileSummary image={resolveImageUrl(renter.profile_photo)} title={name} email={renter.email} badge={licenseBadge} badgeColor={verified ? "#047857" : "#92400E"} badgeBackground={verified ? "#ECFDF5" : "#FFF6DA"} />
    <View style={styles.actions}>
      <TouchableOpacity style={styles.primary} onPress={onMessage}><Ionicons name="chatbubble-outline" size={18} color={Colors.dark} /><Text style={styles.buttonText}>Message</Text></TouchableOpacity>
      <TouchableOpacity style={styles.secondary} onPress={onCall}><Ionicons name="call-outline" size={18} color={Colors.dark} /><Text style={styles.buttonText}>Call</Text></TouchableOpacity>
    </View>
    <ProfileInformation title="Personal Information" rows={[
      { icon: "person-outline", label: "Full Name", value: name },
      { icon: "mail-outline", label: "Email Address", value: renter.email || "Not provided" },
      { icon: "call-outline", label: "Mobile Number", value: renter.mobile_number || "Not provided" },
      ...(birthday ? [{ icon: "calendar-outline" as const, label: "Date of Birth", value: new Date(`${birthday}T12:00:00+08:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }) }] : []),
      ...(renter.sex ? [{ icon: "male-female-outline" as const, label: "Gender", value: renter.sex.charAt(0).toUpperCase() + renter.sex.slice(1) }] : []),
    ]} />
    {renter.can_review_license !== false && <View style={{ gap: 12 }}>
      <Text style={styles.heading}>Driver’s License</Text>
      <View style={styles.photos}>{(["front", "back"] as const).map(side => {
        const uri = resolveImageUrl(renter[`drivers_license_${side}_url`] || renter[`drivers_license_${side}`]);
        return <TouchableOpacity key={side} accessibilityLabel={`View ${side} license photo`} disabled={!uri || failed[side]} style={styles.photoCard} onPress={() => uri && onInspect(uri)}>
          <Text style={styles.photoLabel}>{side === "front" ? "Front" : "Back"}</Text>
          {uri && !failed[side] ? <Image source={{ uri }} style={styles.photo} contentFit="contain" onError={() => setFailed(previous => ({ ...previous, [side]: true }))} /> : <View style={[styles.photo, styles.placeholder]}><Ionicons name="image-outline" size={24} color={Colors.secondary} /><Text style={styles.caption}>Photo unavailable</Text></View>}
        </TouchableOpacity>;
      })}</View>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10, marginBottom: 24 },
  primary: { flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: Colors.primary, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  secondary: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  buttonText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.dark },
  heading: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.dark },
  photos: { flexDirection: "row", gap: 12 },
  photoCard: { flex: 1, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14, padding: 10 },
  photoLabel: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.dark, marginBottom: 8 },
  photo: { width: "100%", height: 110, borderRadius: 8 },
  placeholder: { alignItems: "center", justifyContent: "center", gap: 8 },
  caption: { fontFamily: FontFamily.regular, fontSize: 10, color: Colors.secondary },
});
