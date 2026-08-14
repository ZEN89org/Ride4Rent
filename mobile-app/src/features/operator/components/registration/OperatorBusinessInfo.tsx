import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import PrimaryButton from "@/components/common/PrimaryButton";
import { Colors } from "@/constants/colors";
import {
  FontFamily,
  FontSize,
  Radius,
  Spacing,
} from "@/constants/theme";
import RegistrationHeader from "./RegistrationHeader";

type OperatorBusinessInfoProps = {
  onBack: () => void;
  onCancel: () => void;
  onContinue: (data: BusinessInfoData) => void;
};

export type BusinessInfoData = {
  businessName: string;
  streetAddress: string;
  barangay: string;
  municipality: string;
  businessContactNumber: string;
  businessEmail: string;
  password: string;
  confirmPassword: string;
};

type FormErrors = {
  businessName?: string;
  streetAddress?: string;
  barangay?: string;
  municipality?: string;
  businessContactNumber?: string;
  businessEmail?: string;
  password?: string;
  confirmPassword?: string;
};

export default function OperatorBusinessInfo({
  onBack,
  onCancel,
  onContinue,
}: OperatorBusinessInfoProps) {
  const [businessName, setBusinessName] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [barangay, setBarangay] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [businessContactNumber, setBusinessContactNumber] =
    useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [errors, setErrors] = useState<FormErrors>({});

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validateMobileNumber = (value: string) => {
    return /^(09\d{9}|\+639\d{9})$/.test(value);
  };

  const clearError = (
    field: keyof FormErrors
  ) => {
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const updated = { ...current };
      delete updated[field];

      return updated;
    });
  };

  const handleContinue = () => {
    const validationErrors: FormErrors = {};

    if (!businessName.trim()) {
      validationErrors.businessName =
        "Business name is required.";
    }

    if (!streetAddress.trim()) {
      validationErrors.streetAddress =
        "Business address is required.";
    }

    if (!barangay.trim()) {
      validationErrors.barangay =
        "Barangay is required.";
    }

    if (!municipality.trim()) {
      validationErrors.municipality =
        "Municipality is required.";
    }

    if (!businessContactNumber.trim()) {
      validationErrors.businessContactNumber =
        "Business contact number is required.";
    } else if (
      !validateMobileNumber(
        businessContactNumber.trim()
      )
    ) {
      validationErrors.businessContactNumber =
        "Use a valid Philippine mobile number.";
    }

    if (!businessEmail.trim()) {
      validationErrors.businessEmail =
        "Business email is required.";
    } else if (
      !validateEmail(businessEmail.trim())
    ) {
      validationErrors.businessEmail =
        "Please enter a valid email address.";
    }

    if (!password) {
      validationErrors.password =
        "Password is required.";
    } else if (password.length < 8) {
      validationErrors.password =
        "Password must be at least 8 characters.";
    }

    if (!confirmPassword) {
      validationErrors.confirmPassword =
        "Please confirm your password.";
    } else if (password !== confirmPassword) {
      validationErrors.confirmPassword =
        "Passwords do not match.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

  onContinue({
    businessName: businessName.trim(),
    streetAddress: streetAddress.trim(),
    barangay: barangay.trim(),
    municipality: municipality.trim(),
    businessContactNumber:
      businessContactNumber.trim(),
    businessEmail:
      businessEmail.trim().toLowerCase(),
    password,
    confirmPassword,
  });
};

  return (
    <View style={styles.container}>
      <RegistrationHeader
        currentStep={3}
        totalSteps={4}
        onBack={onBack}
        onCancel={onCancel}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.title}>
          Business & Account Information
        </Text>

        <Text style={styles.subtitle}>
          Tell us about your rental business.
        </Text>

        <FormField
          label="Business Name"
          placeholder="e.g. Juan's Car Rental"
          value={businessName}
          onChangeText={(value) => {
            setBusinessName(value);
            clearError("businessName");
          }}
          autoCapitalize="words"
          error={errors.businessName}
        />

        <FormField
          label="Business Address"
          placeholder="Street, Building, House No."
          value={streetAddress}
          onChangeText={(value) => {
            setStreetAddress(value);
            clearError("streetAddress");
          }}
          error={errors.streetAddress}
        />

        <FormField
          label="Barangay"
          placeholder="e.g. Marfrancisco"
          value={barangay}
          onChangeText={(value) => {
            setBarangay(value);
            clearError("barangay");
          }}
          autoCapitalize="words"
          error={errors.barangay}
        />

        <FormField
          label="Municipality"
          placeholder="e.g. Pinamalayan"
          value={municipality}
          onChangeText={(value) => {
            setMunicipality(value);
            clearError("municipality");
          }}
          autoCapitalize="words"
          error={errors.municipality}
        />

        <FormField
          label="Business Contact Number"
          placeholder="09XXXXXXXXX"
          value={businessContactNumber}
          onChangeText={(value) => {
            setBusinessContactNumber(value);
            clearError("businessContactNumber");
          }}
          keyboardType="phone-pad"
          autoCorrect={false}
          error={errors.businessContactNumber}
        />

        <FormField
          label="Business Email Address"
          placeholder="business@example.com"
          value={businessEmail}
          onChangeText={(value) => {
            setBusinessEmail(value);
            clearError("businessEmail");
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.businessEmail}
        />

        <FormField
          label="Password"
          placeholder="Create a password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            clearError("password");

            if (
              confirmPassword &&
              value === confirmPassword
            ) {
              clearError("confirmPassword");
            }
          }}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.password}
          rightIcon={
            <Pressable
              onPress={() =>
                setShowPassword(!showPassword)
              }
              hitSlop={10}
            >
              <Ionicons
                name={
                  showPassword
                    ? "eye-off-outline"
                    : "eye-outline"
                }
                size={21}
                color={Colors.secondary}
              />
            </Pressable>
          }
        />

        <FormField
          label="Confirm Password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            clearError("confirmPassword");
          }}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.confirmPassword}
          rightIcon={
            <Pressable
              onPress={() =>
                setShowConfirmPassword(
                  !showConfirmPassword
                )
              }
              hitSlop={10}
            >
              <Ionicons
                name={
                  showConfirmPassword
                    ? "eye-off-outline"
                    : "eye-outline"
                }
                size={21}
                color={Colors.secondary}
              />
            </Pressable>
          }
        />

        <PrimaryButton
          style={styles.continueButton}
          title="Continue"
          onPress={handleContinue}
        />

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

type FormFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?:
    | "default"
    | "email-address"
    | "phone-pad";
  secureTextEntry?: boolean;
  autoCapitalize?:
    | "none"
    | "sentences"
    | "words"
    | "characters";
  autoCorrect?: boolean;
  rightIcon?: React.ReactNode;
  error?: string;
};

function FormField({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  secureTextEntry = false,
  autoCapitalize = "sentences",
  autoCorrect = true,
  rightIcon,
  error,
}: FormFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
      </Text>

      <View
        style={[
          styles.inputContainer,
          error && styles.inputError,
        ]}
      >
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#A0A0A0"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          returnKeyType="next"
        />

        {rightIcon}
      </View>

      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },

  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
    color: Colors.dark,
  },

  subtitle: {
    marginTop: 4,
    marginBottom: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.secondary,
  },

  field: {
    marginBottom: Spacing.sm,
  },

  label: {
    marginBottom: 5,
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.dark,
  },

  inputContainer: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E2E2",
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
  },

  inputError: {
    borderColor: "#E53935",
  },

  input: {
    flex: 1,
    minHeight: 44,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.dark,
    paddingVertical: 0,
  },

  errorText: {
    marginTop: 4,
    fontFamily: FontFamily.regular,
    fontSize: 11,
    lineHeight: 15,
    color: "#E53935",
  },

  continueButton: {
    marginTop: 40,
  },

  bottomSpacing: {
    height: Spacing.md,
  },
});
