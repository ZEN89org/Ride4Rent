import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";

export default function About() {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Ride4Rent</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Brand Banner */}
        <View style={styles.brandBox}>
          <View style={styles.logoWrap}>
            <Ionicons name="car-sport" size={40} color={Colors.dark} />
          </View>
          <Text style={styles.brandTitle}>Ride4Rent</Text>
          <Text style={styles.brandTagline}>Your trusted peer-to-peer car rental platform</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>Version 1.0.0 (Build 2026)</Text>
          </View>
        </View>

        {/* Mission / Overview */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>About the Platform</Text>
          <Text style={styles.cardText}>
            Ride4Rent bridges the gap between vehicle operators and prospective renters across the Philippines. We provide a seamless, secure environment for car hosts to manage fleets and for renters to find reliable transport at competitive rates.
          </Text>
        </View>

        {/* Key Features */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Why Choose Ride4Rent?</Text>
          
          <View style={styles.featureRow}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
            <Text style={styles.featureText}>Verified Operators & Vehicles</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="navigate" size={20} color={Colors.primary} />
            <Text style={styles.featureText}>Location-based Nearby Discovery</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="chatbubbles" size={20} color={Colors.primary} />
            <Text style={styles.featureText}>Direct Renter-to-Host Messaging</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="lock-closed" size={20} color={Colors.primary} />
            <Text style={styles.featureText}>Protected Documents & Verification</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>© 2026 Ride4Rent Inc. All rights reserved.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
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
  brandBox: {
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  brandTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    color: Colors.dark,
  },
  brandTagline: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.secondary,
    textAlign: "center",
    marginTop: 4,
  },
  versionBadge: {
    marginTop: 10,
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  versionText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.secondary,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  cardText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: 10,
  },
  featureText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.dark,
  },
  footerText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    textAlign: "center",
    marginTop: Spacing.md,
  },
});
