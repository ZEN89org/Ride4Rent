import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import { Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import api from "@/services/api";
import PrimaryButton from "@/components/common/PrimaryButton";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";

export default function SupportScreen() {
  const { showWarning } = useAppToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [support, setSupport] = useState({ support_email: "support@ride4rent.ph", support_phone: "+63 917 123 4567" });
  useEffect(() => { api.get("/platform-settings").then((response) => setSupport(response.data.data)).catch(() => {}); }, []);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      showWarning("Missing Details", "Please provide a subject and message describing your inquiry.");
      return;
    }
    try {
      await Linking.openURL(`mailto:${support.support_email}?subject=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(message.trim())}`);
    } catch {
      showWarning("Email unavailable", `Please send your inquiry to ${support.support_email}.`);
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
      >
        {/* Support Direct Contacts */}
        <View style={styles.contactCard}>
          <Text style={styles.cardHeading}>Get in Touch</Text>
          <Text style={styles.cardSub}>Contact our team for help with rentals, operators, and payments.</Text>

          <View style={styles.channelRow}>
            <Ionicons name="mail-outline" size={20} color={Colors.dark} />
            <Text style={styles.channelText}>{support.support_email}</Text>
          </View>
          <View style={styles.channelRow}>
            <Ionicons name="call-outline" size={20} color={Colors.dark} />
            <Text style={styles.channelText}>{support.support_phone}</Text>
          </View>
          <View style={styles.channelRow}>
            <Ionicons name="location-outline" size={20} color={Colors.dark} />
            <Text style={styles.channelText}>Oriental Mindoro, Philippines</Text>
          </View>
        </View>

        {/* Message Form */}
        <Text style={styles.formTitle}>Send us a Message</Text>

        <Text style={styles.inputLabel}>Subject</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Booking Inquiry, Vehicle Issue"
          placeholderTextColor={Colors.secondary}
          value={subject}
          onChangeText={setSubject}
        />

        <Text style={styles.inputLabel}>Message</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe your issue or question in detail..."
          placeholderTextColor={Colors.secondary}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          value={message}
          onChangeText={setMessage}
        />

        <View style={styles.buttonWrap}>
          <PrimaryButton title="Open Email" onPress={handleSubmit} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    color: Colors.dark,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  contactCard: {
    backgroundColor: Colors.logoBackground,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  cardHeading: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
    marginBottom: 4,
  },
  cardSub: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.dark,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: 6,
  },
  channelText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.dark,
  },
  formTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.dark,
    marginBottom: 6,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.dark,
  },
  textArea: {
    minHeight: 120,
  },
  buttonWrap: {
    marginTop: Spacing.xl,
  },
});
