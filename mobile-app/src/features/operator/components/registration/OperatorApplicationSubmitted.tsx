import { AppBottomSheet } from "@/components/common/AppBottomSheet";
import RentalSheetHeader from "@/components/common/RentalSheetHeader";
import { rentalSheetStyle } from "@/constants/rentalDesign";
import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import PrimaryButton from "@/components/common/PrimaryButton";
import { Colors } from "@/constants/colors";
import {
    FontFamily,
    FontSize,
    Radius,
    Spacing,
} from "@/constants/theme";

type OperatorApplicationSubmittedBottomSheetProps = {
  visible: boolean;
  onExploreDashboard: () => void;
  onBackToLogin: () => void;
};


export default function OperatorApplicationSubmittedBottomSheet({
  visible,
  onExploreDashboard,
  onBackToLogin,
}: OperatorApplicationSubmittedBottomSheetProps) {
  return (
    <AppBottomSheet visible={visible} onClose={() => {}} dismissOnBackdrop={false} sheetStyle={rentalSheetStyle}>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
        <RentalSheetHeader title="Application Submitted" subtitle="Your operator account is under review." icon="checkmark-circle-outline" />
          <Text style={styles.description}>We’ll review your permits and identification. You can preview your dashboard while waiting for verification.</Text>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>
              Estimated review time
            </Text>

            <Text style={styles.reviewTime}>
              12–24 Hours
            </Text>
          </View>

          <PrimaryButton
            title="Explore Operator Dashboard"
            onPress={onExploreDashboard}
            style={styles.button}
          />

          <TouchableOpacity
            onPress={onBackToLogin}
            style={styles.secondaryButton}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Back to Login</Text>
          </TouchableOpacity>
      </ScrollView>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({






  description: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 21,
    color: Colors.secondary,
    textAlign: "center",
  },

  reviewCard: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: "#F7F7F7",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  reviewLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.secondary,
  },

  reviewTime: {
    marginTop: 4,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.dark,
  },



  button: {
    marginTop: Spacing.lg,
  },

  secondaryButton: {
    marginTop: Spacing.xs,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.secondary,
  },
});
