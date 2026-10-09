import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";

const FAQS = [
  {
    q: "How do I book a vehicle on Ride4Rent?",
    a: "Browse available vehicles, select your preferred car, choose your rental dates, and click 'Book Vehicle'. You will need a verified account and driver's license.",
  },
  {
    q: "What are the requirements for renting?",
    a: "You must be at least 18-21 years old (depending on the vehicle operator), hold a valid government-issued driver's license, and provide a valid ID.",
  },
  {
    q: "How does payment and reservation work?",
    a: "Operators set daily rates and reservation fees. Payment terms and security deposits are coordinated directly with the verified vehicle host/operator.",
  },
  {
    q: "Can I cancel a reservation?",
    a: "Cancellation policies vary by operator. Review the specific cancellation policy listed on each vehicle's details page before booking.",
  },
  {
    q: "How do I become an Operator / Host?",
    a: "Register as an Operator in the app, submit your business or vehicle documents, and once approved by Admin, you can list unlimited vehicles.",
  },
];

export default function FAQScreen() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Frequently Asked Questions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.introText}>
          Got questions? Here are the most common questions about renting and listing vehicles on Ride4Rent.
        </Text>

        {FAQS.map((faq, index) => {
          const isOpen = expanded === index;
          return (
            <TouchableOpacity
              key={index}
              style={styles.card}
              onPress={() => setExpanded(isOpen ? null : index)}
              activeOpacity={0.8}
            >
              <View style={styles.qRow}>
                <Text style={styles.qText}>{faq.q}</Text>
                <Ionicons
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={Colors.secondary}
                />
              </View>
              {isOpen && <Text style={styles.aText}>{faq.a}</Text>}
            </TouchableOpacity>
          );
        })}
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
  introText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.secondary,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  qRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  qText: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    color: Colors.dark,
    marginRight: Spacing.sm,
  },
  aText: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.sm,
  },
});
