import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useRef } from "react";
import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppBottomSheet } from "@/components/common/AppBottomSheet";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";

interface AuthRequiredBottomSheetProps { visible: boolean; onClose: () => void; }

export default function AuthRequiredBottomSheet({ visible, onClose }: AuthRequiredBottomSheetProps) {
  const navigateAfterClose = useRef(false);
  return (
    <AppBottomSheet visible={visible} onClose={onClose} onClosed={() => {
      if (!navigateAfterClose.current) return;
      navigateAfterClose.current = false;
      router.push("/login");
    }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close sign-in prompt" onPress={onClose} style={styles.close} hitSlop={8}>
          <Ionicons name="close" size={22} color={Colors.dark} />
        </Pressable>
        <View style={styles.icon}><Ionicons name="log-in-outline" size={32} color={Colors.dark} /></View>
        <Text style={styles.title}>Sign In Required</Text>
        <Text style={styles.description}>Sign in to book a vehicle, message an operator, and manage your trips.</Text>
        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.signIn, pressed && styles.pressed]} onPress={() => {
          if (navigateAfterClose.current) return;
          navigateAfterClose.current = true;
          onClose();
        }}>
          <Text style={styles.signInText}>Sign In</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.dark} />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.browse}><Text style={styles.browseText}>Keep Browsing</Text></Pressable>
      </ScrollView>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingBottom: 8 },
  close: { position: "absolute", top: 0, right: 0, width: 44, height: 44, alignItems: "center", justifyContent: "center", zIndex: 1 },
  icon: { width: 64, height: 64, borderRadius: 22, backgroundColor: "#FFF5CC", alignSelf: "center", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  title: { fontFamily: FontFamily.bold, fontSize: 24, color: Colors.dark, textAlign: "center" },
  description: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22, color: Colors.secondary, textAlign: "center", marginTop: 10, marginHorizontal: 12 },
  signIn: { minHeight: 52, borderRadius: 16, backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 24, padding: 14 },
  signInText: { fontFamily: FontFamily.semiBold, fontSize: 16, color: Colors.dark },
  pressed: { opacity: 0.75 },
  browse: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 6 },
  browseText: { fontFamily: FontFamily.medium, fontSize: 14, color: Colors.secondary },
});
