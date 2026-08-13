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

type RenterRegistrationIntroProps = {
  onContinue: () => void;
  onBack: () => void;
  onCancel: () => void;
};

export default function RenterRegistrationIntro({
  onContinue,
  onBack,
  onCancel,
}: RenterRegistrationIntroProps) {
  return (
    <ScreenContainer>
      <View style={styles.container}>
        <RegistrationHeader
          currentStep={1}
          totalSteps={2}
          onBack={onBack}
          onCancel={onCancel}
        />

        <View style={styles.content}>
          <Text style={styles.title}>
            Welcome to Ride4Rent!
          </Text>

          <Text style={styles.description}>
            Create your account to discover rental vehicles,
            reserve your preferred ride, and enjoy a faster
            and more convenient rental experience.{" "}
            <Text style={styles.learnMore}>
              Learn more
            </Text>
          </Text>

          <View style={styles.benefits}>
            <BenefitItem text="Browse vehicle rentals near you" />
            <BenefitItem text="Compare trusted operators" />
            <BenefitItem text="Book in minutes" />
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
