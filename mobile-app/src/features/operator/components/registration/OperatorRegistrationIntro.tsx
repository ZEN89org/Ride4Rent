import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import PrimaryButton from "@/components/common/PrimaryButton";
import ScreenContainer from "@/components/common/ScreenContainer";
import { Colors } from "@/constants/colors";
import {
    FontFamily,
    FontSize,
    Spacing,
} from "@/constants/theme";
import RegistrationHeader from "./RegistrationHeader";

type OperatorRegistrationIntroProps = {
  onContinue: () => void;
  onBack: () => void;
  onCancel: () => void;
};

export default function OperatorRegistrationIntro({
  onContinue,
  onBack,
  onCancel,
}: OperatorRegistrationIntroProps) {
  return (
    <ScreenContainer>
      <View style={styles.container}>
        <RegistrationHeader
          currentStep={1}
          totalSteps={4}
          onBack={onBack}
          onCancel={onCancel}
        />

        <View style={styles.content}>
          <Text style={styles.title}>
            Welcome to Ride4Rent!
          </Text>

          <Text style={styles.description}>
            Create your business account to list your rental
            vehicles, manage bookings, and connect with
            customers through a streamlined rental platform.{" "}
            <Text style={styles.learnMore}>
              Learn more
            </Text>
          </Text>

          <View style={styles.benefits}>
            <BenefitItem
              text="List and manage your rental vehicles"
            />

            <BenefitItem
              text="Reach customers in your service area"
            />

            <BenefitItem
              text="Manage bookings with ease"
            />
          </View>
        </View>

        <View style={styles.bottomContent}>
          <PrimaryButton
            title="Continue"
            onPress={onContinue}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

function BenefitItem({
  text,
}: {
  text: string;
}) {
  return (
    <View style={styles.benefit}>
      <View style={styles.checkContainer}>
        <Ionicons
          name="checkmark"
          size={17}
          color={Colors.primary}
        />
      </View>

      <Text style={styles.benefitText}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },

  content: {
    paddingTop: Spacing.xl,
  },

  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
    color: Colors.dark,
  },

  description: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    lineHeight: 24,
    color: Colors.secondary,
  },

  learnMore: {
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },

  benefits: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },

  benefit: {
    flexDirection: "row",
    alignItems: "center",
  },

  checkContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF4E8",
  },

  benefitText: {
    flex: 1,
    marginLeft: Spacing.md,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.dark,
  },

  bottomContent: {
    marginTop: "auto",
    paddingBottom: Spacing.md,
  },
});
