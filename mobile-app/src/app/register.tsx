import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppInput from "@/components/common/AppInput";
import PrimaryButton from "@/components/common/PrimaryButton";
import ScreenContainer from "@/components/common/ScreenContainer";
import SecondaryButton from "@/components/common/SecondaryButton";
import { Colors } from "@/constants/colors";
import { FontSize, Spacing } from "@/constants/theme";
import { register } from "@/features/auth/services/authService";

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sex, setSex] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !dateOfBirth.trim() ||
      !sex.trim() ||
      !email.trim() ||
      !mobileNumber.trim() ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert(
        "Missing Information",
        "Please complete all required fields."
      );

      return;
    }

    if (password.length < 8) {
      Alert.alert(
        "Invalid Password",
        "Password must be at least 8 characters."
      );

      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Password Mismatch",
        "Passwords do not match."
      );

      return;
    }

    try {
      setLoading(true);

      await register({
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        suffix,
        date_of_birth: dateOfBirth,
        sex,
        email,
        mobile_number: mobileNumber,
        password,
        password_confirmation: confirmPassword,
      });

      Alert.alert(
        "Success",
        "Your account has been created successfully.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/login"),
          },
        ]
      );
    } catch (error: any) {
      let message = "Registration failed.";

      if (error.response?.data?.message) {
        message = error.response.data.message;
      }

      if (error.response?.data?.errors) {
        const errors = Object.values(
          error.response.data.errors
        )
          .flat()
          .join("\n");

        message = errors;
      }

      Alert.alert(
        "Registration Failed",
        message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <Text style={styles.title}>
            Create Account
          </Text>

          <Text style={styles.subtitle}>
            Register as a renter to continue.
          </Text>

          <Text style={styles.sectionTitle}>
            Personal Information
          </Text>

          <AppInput
            label="First Name"
            placeholder="Enter your first name"
            value={firstName}
            onChangeText={setFirstName}
          />

          <AppInput
            label="Middle Name (Optional)"
            placeholder="Enter your middle name"
            value={middleName}
            onChangeText={setMiddleName}
          />

          <AppInput
            label="Last Name"
            placeholder="Enter your last name"
            value={lastName}
            onChangeText={setLastName}
          />

          <AppInput
            label="Suffix (Optional)"
            placeholder="Jr., Sr., III"
            value={suffix}
            onChangeText={setSuffix}
          />

          <AppInput
            label="Date of Birth"
            placeholder="YYYY-MM-DD"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
          />

          <AppInput
            label="Sex"
            placeholder="Male or Female"
            value={sex}
            onChangeText={setSex}
          />

          <Text style={styles.sectionTitle}>
            Contact Information
          </Text>

          <AppInput
            label="Mobile Number"
            placeholder="09XXXXXXXXX"
            keyboardType="phone-pad"
            value={mobileNumber}
            onChangeText={setMobileNumber}
          />

          <AppInput
            label="Email Address"
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.sectionTitle}>
            Account Security
          </Text>

          <AppInput
            label="Password"
            placeholder="Create a password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <AppInput
            label="Confirm Password"
            placeholder="Confirm your password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <PrimaryButton
            title={
              loading
                ? "Creating Account..."
                : "Create Account"
            }
            disabled={loading}
            onPress={handleRegister}
          />

          <View style={styles.spacing} />

          <SecondaryButton
            title="Back to Login"
            onPress={() =>
              router.replace("/login")
            }
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },

  container: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },

  title: {
    fontSize: FontSize.heading,
    fontWeight: "700",
    color: Colors.dark,
    textAlign: "center",
    marginBottom: 10,
  },

  subtitle: {
    textAlign: "center",
    color: Colors.secondary,
    marginBottom: Spacing.xl,
  },

  sectionTitle: {
    fontSize: FontSize.body,
    fontWeight: "700",
    color: Colors.dark,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },

  spacing: {
    height: Spacing.md,
  },
});
