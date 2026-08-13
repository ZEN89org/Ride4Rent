import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import {
    FontFamily,
    FontSize
} from "@/constants/theme";

type RegistrationHeaderProps = {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onCancel: () => void;
};

export default function RegistrationHeader({
  currentStep,
  totalSteps,
  onBack,
  onCancel,
}: RegistrationHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        style={styles.actionButton}
        onPress={onBack}
        hitSlop={10}
      >
        <Ionicons
          name="arrow-back"
          size={23}
          color={Colors.dark}
        />
      </Pressable>

      <Text style={styles.step}>
        {currentStep} of {totalSteps}
      </Text>

      <Pressable
        style={styles.cancelButton}
        onPress={onCancel}
        hitSlop={10}
      >
        <Text style={styles.cancelText}>
          Cancel
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 90,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  actionButton: {
    width: 40,
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },

  step: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.dark,
  },

  cancelButton: {
    minWidth: 55,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  cancelText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.primary,
  },
});
