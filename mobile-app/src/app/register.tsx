import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from "react-native";
import { router } from "expo-router";

import ScreenContainer from "@/components/ScreenContainer";
import AppInput from "@/components/AppInput";
import PrimaryButton from "@/components/PrimaryButton";
import SecondaryButton from "@/components/SecondaryButton";
import { Colors } from "@/constants/colors";
import { FontSize, Spacing } from "@/constants/theme";
import { register } from "@/services/authService";

export default function Register() {

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {

    if (
      !name.trim() ||
      !email.trim() ||
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
        name,
        email,
        phone_number: phoneNumber,
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

      <View style={styles.container}>

        <Text style={styles.title}>
          Create Account
        </Text>

        <Text style={styles.subtitle}>
          Register as a renter to continue.
        </Text>

        <AppInput
          label="Full Name"
          placeholder="Enter your full name"
          value={name}
          onChangeText={setName}
        />

        <AppInput
          label="Email Address"
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <AppInput
          label="Phone Number"
          placeholder="09XXXXXXXXX"
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
        />

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
          onPress={() => router.replace("/login")}
        />

      </View>

    </ScreenContainer>

  );

}

const styles = StyleSheet.create({

  container: {

    flex: 1,

    justifyContent: "center",

    padding: Spacing.lg,

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

    marginBottom: 35,

  },

  spacing: {

    height: Spacing.md,

  },

});