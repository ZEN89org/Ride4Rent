import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";

export default function PrivacyScreen() {
  const sections = [
    ["Account and rental information", "Ride4Rent uses your account, contact and booking information to provide rentals, messages and support. Driver’s licenses and operator verification documents are used to review eligibility."],
    ["Trip location", "During an active rental, location sharing lets the booking’s renter and operator view trip updates. Camera, photos, microphone and location features use the permissions you grant on your device."],
    ["Payments and communication", "Payment references, uploaded receipts and booking messages support manual payment verification and dispute review. Do not send passwords or payment account PINs in chat."],
    ["Your choices", "You can manage device permissions and notification preferences in Settings. Contact support through the app for questions about your information, corrections or account requests."],
  ];
  return <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }}>
    <View style={{ flexDirection: "row", gap: 16, alignItems: "center", padding: 20 }}><TouchableOpacity accessibilityLabel="Go back" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} /></TouchableOpacity><Text style={{ fontFamily: FontFamily.bold, fontSize: 20 }}>Privacy Policy</Text></View>
    <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>{sections.map(([title, body]) => <View key={title}><Text style={{ fontFamily: FontFamily.semiBold, fontSize: 16, marginBottom: 8 }}>{title}</Text><Text style={{ fontFamily: FontFamily.regular, color: Colors.secondary, lineHeight: 22 }}>{body}</Text></View>)}</ScrollView>
  </SafeAreaView>;
}
