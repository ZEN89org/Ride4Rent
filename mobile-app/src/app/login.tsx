import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppFooter from "@/components/common/AppFooter";
import AppInput from "@/components/common/AppInput";
import Divider from "@/components/common/Divider";
import PasswordInput from "@/components/common/PasswordInput";
import PrimaryButton from "@/components/common/PrimaryButton";
import ForgotPasswordModal from "@/features/auth/components/ForgotPasswordModal";
import RegistrationRoleBottomSheet from "@/features/auth/components/RegistrationRoleBottomSheet";
import SocialButton from "@/features/auth/components/SocialButton";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { login } from "@/features/auth/services/authService";
import { resetFirstLaunch } from "@/features/auth/storage/authStorage";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function Login() {
  const [showRegistrationSheet, setShowRegistrationSheet] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const { login: signIn } = useAuth();
  const { showSuccess } = useAppToast();

  // Animation values for smooth entrance slide
  const sheetTranslateY = useState(
    () => new Animated.Value(SCREEN_HEIGHT * 0.7),
  )[0];
  const headerOpacity = useState(() => new Animated.Value(0))[0];
  const headerTranslateY = useState(() => new Animated.Value(20))[0];

  useEffect(() => {
    // 1st flow: Header appears & sheet slides up from bottom
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerOpacity, headerTranslateY, sheetTranslateY]);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setLoginError("");
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setLoginError("");
  };

  const handleLogin = async () => {
    setLoginError("");

    // All sign-in errors are shown as one message under the password field
    if (!email.trim() && !password) {
      setLoginError("Please enter your email and password.");
      return;
    }

    if (!email.trim()) {
      setLoginError("Please enter your email address.");
      return;
    }

    if (!password) {
      setLoginError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      const response = await login({
        email: email.trim(),
        password,
      });

      const loggedInUser = response.data.user;
      const loggedInToken = response.data.token;

      Keyboard.dismiss();

      // Sign-in auth transition runs with spinner cleanly inside the button
      await signIn(loggedInUser, loggedInToken);

      if (router.canDismiss()) router.dismissAll();

      if (loggedInUser.role === "operator") {
        if (loggedInUser.account_status === "rejected") {
          router.replace("/operator-rejected");
          return;
        }

        router.replace("/operator-home");
        return;
      }

      router.replace("/(tabs)/home");
    } catch (error: any) {
      const backendErrors = error?.response?.data?.errors;
      const message =
        backendErrors?.email?.[0] ??
        backendErrors?.password?.[0] ??
        error?.response?.data?.message ??
        "Invalid email or password.";
      setLoginError(message);
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.safeTop}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          {/* Top Primary Background Section with Welcome Animation */}
          <Animated.View
            style={[
              styles.topBanner,
              {
                opacity: headerOpacity,
                transform: [{ translateY: headerTranslateY }],
              },
            ]}
          >
            <Text style={styles.welcomeTitle}>Welcome{"\n"}Back</Text>
            <Text style={styles.welcomeSubtitle}>
              Please sign in to continue
            </Text>
          </Animated.View>

          {/* Bottom Sheet Card sliding up from bottom with integrated footer */}
          <Animated.View
            style={[
              styles.bottomSheetContainer,
              {
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            <ScrollView
              scrollEnabled={false}
              contentContainerStyle={styles.sheetScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.sheetHandle} />

              <AppInput
                label="Email Address"
                placeholder="johndoe@gmail.com"
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <PasswordInput
                label="Password"
                placeholder="password"
                value={password}
                onChangeText={handlePasswordChange}
                error={loginError || undefined}
              />

              <PrimaryButton
                title="Sign In"
                loading={loading}
                onPress={handleLogin}
              />

              <Pressable
                onPress={() => setShowForgotPasswordModal(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.forgot}>Forgot Password?</Text>
              </Pressable>

              <Divider />

              <SocialButton
                title="Continue with Google"
                icon={
                  <Image
                    source={require("../../assets/img/google.png")}
                    style={styles.googleIcon}
                    resizeMode="contain"
                  />
                }
                onPress={async () => {
                  await resetFirstLaunch();
                  router.replace("/");
                }}
              />

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Don’t have an account?</Text>
                <TouchableOpacity
                  onPress={() => setShowRegistrationSheet(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.footerLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>

              {/* Seamless Bottom-Pinned App Footer inside the Card */}
              <View style={styles.appFooterWrap}>
                <AppFooter />
              </View>
            </ScrollView>
          </Animated.View>

          <ForgotPasswordModal
            visible={showForgotPasswordModal}
            onClose={() => setShowForgotPasswordModal(false)}
            onSuccess={() => {
              setShowForgotPasswordModal(false);
              showSuccess(
                "Password Updated",
                "You can now log in with your new password.",
              );
            }}
          />

          <RegistrationRoleBottomSheet
            visible={showRegistrationSheet}
            onClose={() => setShowRegistrationSheet(false)}
            onSelectRenter={() => {
              setShowRegistrationSheet(false);
              router.push("/register");
            }}
            onSelectOperator={() => {
              setShowRegistrationSheet(false);
              router.push("/operator");
            }}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({

  root: {
    flex: 1,
    backgroundColor: Colors.primary,
  },

  safeTop: {
    flex: 1,
    backgroundColor: Colors.primary,
  },

  keyboardAvoid: {
    flex: 1,
  },

  topBanner: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === "ios" ? 15 : 20,
    paddingBottom: 22,
  },

  welcomeTitle: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: 32,
    lineHeight: 36,
  },

  welcomeSubtitle: {
    color: Colors.white,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.small,
    lineHeight: 18,
    marginTop: 6,
    opacity: 0.95,
  },

  bottomSheetContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
    overflow: "hidden",
  },

  sheetScrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 40 : 36,
    flexGrow: 1,
  },

  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 20,
  },

  forgot: {
    color: Colors.primary,
    textAlign: "center",
    marginTop: 14,
    marginBottom: 4,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.small,
  },

  errorText: {
    color: "#D32F2F",
    fontSize: 13,
    fontFamily: FontFamily.regular,
    textAlign: "center",
    marginTop: -8,
    marginBottom: 8,
  },

  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 10,
  },

  footerText: {
    color: Colors.secondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
  },

  footerLink: {
    color: Colors.primary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.small,
    marginLeft: 5,
  },

  appFooterWrap: {
    marginTop: 14,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    alignItems: "center",
  },

  googleIcon: {
    width: 20,
    height: 20,
  },
});
