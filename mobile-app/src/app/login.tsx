import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import AppFooter from "@/components/common/AppFooter";
import AppInput from "@/components/common/AppInput";
import Divider from "@/components/common/Divider";
import PasswordInput from "@/components/common/PasswordInput";
import PrimaryButton from "@/components/common/PrimaryButton";
import ScreenContainer from "@/components/common/ScreenContainer";
import AuthCard from "@/features/auth/components/AuthCard";
import SocialButton from "@/features/auth/components/SocialButton";

import { FontFamily } from "@/constants/theme";

import { Colors } from "@/constants/colors";
import { login } from "@/features/auth/services/authService";
import { resetFirstLaunch } from "@/features/auth/storage/authStorage";

import { useAuth } from "@/features/auth/hooks/useAuth";

import {
  MaterialCommunityIcons
} from "@expo/vector-icons";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loginError, setLoginError] = useState("");

  const { login: signIn } = useAuth();

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailError("");
    setLoginError("");
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordError("");
    setLoginError("");
  };

  const handleLogin = async () => {
    setEmailError("");
    setPasswordError("");
    setLoginError("");

    let hasError = false;

    if (!email.trim()) {
      setEmailError("Email address is required.");
      hasError = true;
    }

    if (!password) {
      setPasswordError("Password is required.");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    try {
      setLoading(true);

      const response = await login({
        email: email.trim(),
        password,
      });

      await signIn(
        response.data.user,
        response.data.token
      );

      router.replace("/(tabs)/home");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        "Invalid email or password.";

      setLoginError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    await resetFirstLaunch();
    router.replace("/");
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
        keyboardVerticalOffset={
          Platform.OS === "ios" ? 20 : 0
        }
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
        >
          <View style={styles.container}>
            <AuthCard>

              <AppInput
                label="Email Address"
                placeholder="johndoe@example.com"
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {emailError ? (
                <Text style={styles.errorText}>
                  {emailError}
                </Text>
              ) : null}

              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={handlePasswordChange}
              />

              {passwordError ? (
                <Text style={styles.errorText}>
                  {passwordError}
                </Text>
              ) : null}

              {loginError ? (
                <Text style={styles.errorText}>
                  {loginError}
                </Text>
              ) : null}

              <PrimaryButton
                title="Sign In"
                loading={loading}
                onPress={handleLogin}
              />

              <Pressable>
                <Text style={styles.forgot}>
                  Forgot Password?
                </Text>
              </Pressable>

              <Divider />

              <SocialButton
                title="Continue with Google"
                icon={
                  <MaterialCommunityIcons
                    name="gmail"
                    size={25}
                    color="#EA4335"
                  />
                }
                onPress={async () => {
                  await resetFirstLaunch();
                  router.replace("/");
                }}
              />

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Don’t have an account?
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    router.push("/register")
                  }
                >
                  <Text style={styles.footerLink}>
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>


            </AuthCard>
          </View>
        </ScrollView>
        <AppFooter />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  container: {
    flex: 1,
    justifyContent: "flex-end",
  },

  logoContainer: {
    position: "absolute",
    top: -35,
    left: 30,
    zIndex: 100,
  },

  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.logoBackground,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },

  forgot: {
    color: Colors.primary,
    textAlign: "center",
    marginTop: 15,
    fontFamily: FontFamily.regular,
  },

  errorText: {
    color: "#D32F2F",
    fontSize: 13,
    fontFamily: FontFamily.regular,
    textAlign: "center",
    marginTop: -20,
    marginBottom: 10,
  },

googleIcon: {
  width: 22,
  height: 22,
  alignItems: "center",
  justifyContent: "center",
},

googleG: {
  fontSize: 20,
  fontWeight: "700",
  color: "#4285F4",
},

  placeholderStyle: {
    fontFamily: FontFamily.regular,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  footerText: {
    color: Colors.secondary,
    fontFamily: FontFamily.regular,
  },

  footerLink: {
    color: Colors.primary,
    fontFamily: FontFamily.semiBold,
    marginLeft: 4,
  },



});
