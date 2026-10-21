import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";

export default function TermsScreen() {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.updatedDate}>Last updated: October 2026</Text>

        <Text style={styles.sectionHeader}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By registering, accessing, or using the Ride4Rent mobile platform, you
          agree to comply with and be legally bound by these Terms and
          Conditions.
        </Text>

        <Text style={styles.sectionHeader}>
          2. Renter Eligibility & Requirements
        </Text>
        <Text style={styles.paragraph}>
          Renters must possess a valid government-issued driver&apos;s license
          matching the minimum driving experience requirements set by individual
          vehicle operators. Users agree not to sublease or assign vehicles to
          unauthorized drivers.
        </Text>

        <Text style={styles.sectionHeader}>3. Vehicle Operation & Care</Text>
        <Text style={styles.paragraph}>
          Renters are expected to operate vehicles responsibly, adhere to local
          traffic laws, and return vehicles in the condition received with fuel
          levels restored as agreed upon with the operator.
        </Text>

        <Text style={styles.sectionHeader}>Early Return</Text>
        <Text style={styles.paragraph}>Request an early return time from an active booking and coordinate with the operator. The trip and location sharing remain active until actual handover, inspection and final settlement. The agreed rental total remains unchanged; unused rental days have no automatic refund. Any separately agreed refund is recorded after completion and confirmed by the renter once received.</Text>

        <Text style={styles.sectionHeader}>4. Operator Responsibilities</Text>
        <Text style={styles.paragraph}>
          Operators warrant that listed vehicles are registered, roadworthy,
          insured, and accurately represented with legitimate pricing and safety
          specifications.
        </Text>

        <Text style={styles.sectionHeader}>5. Cancellations & Disputes</Text>
        <Text style={styles.paragraph}>
          Ride4Rent serves as an intermediary connection platform. Cancellation
          rules, refund criteria, and security deposit terms are governed by
          individual vehicle listings and confirmed booking agreements.
        </Text>
        <Text style={styles.sectionHeader}>Reservation, handover and extensions</Text>
        <Text style={styles.paragraph}>The reservation fee is 50% of the rental booking total and is credited toward that total. Pay the remaining 50% to the operator before vehicle handover. Approved extensions are paid in full through GCash and take effect after the operator verifies payment. Bookings without pickup or handover are automatically closed as a no-show 24 hours after scheduled pickup; the reservation fee is retained. Contact support to request admin review of a disputed no-show.</Text>
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
  updatedDate: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
    marginTop: Spacing.md,
    marginBottom: 6,
  },
  paragraph: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
});
