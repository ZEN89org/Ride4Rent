import { router } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import { Animated, Dimensions, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AppInput from "@/components/common/AppInput";
import Divider from "@/components/common/Divider";
import PasswordInput from "@/components/common/PasswordInput";
import PrimaryButton from "@/components/common/PrimaryButton";
import ForgotPasswordModal from "@/features/auth/components/ForgotPasswordModal";
import RegistrationRoleBottomSheet from "@/features/auth/components/RegistrationRoleBottomSheet";
import SocialButton from "@/features/auth/components/SocialButton";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { login } from "@/features/auth/services/authService";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function Login() {
  const insets = useSafeAreaInsets();
  const { height, fontScale } = useWindowDimensions();
  const compactHeader = height < 740;
  const [sheetHeight, setSheetHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [showRegistrationSheet, setShowRegistrationSheet] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const { login: signIn, isAuthenticated, logout } = useAuth();
  const { showSuccess, showInfo } = useAppToast();

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
    if (loading || guestLoading) return;
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
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          <Animated.View style={[styles.welcomeHeader, {
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }],
          }]}>
            <Text style={[styles.welcomeTitle, compactHeader && { fontSize: 30, lineHeight: 38 }]}>Welcome Back</Text>
            <Text style={styles.welcomeSubtitle}>Sign in and find your next ride.</Text>
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
              scrollEnabled={contentHeight > sheetHeight + 1}
              onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)}
              onContentSizeChange={(_, contentSizeHeight) => setContentHeight(contentSizeHeight)}
              style={styles.sheetScroll}
              contentContainerStyle={[styles.sheetScrollContent, { paddingBottom: Math.max(insets.bottom, 16) }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.formContent}>
              <View style={styles.sheetHandle} />

              <AppInput
                compact
                label="Email Address"
                placeholder="johndoe@gmail.com"
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <PasswordInput
                compact
                style={{ paddingRight: 50 }}
                label="Password"
                placeholder="password"
                value={password}
                onChangeText={handlePasswordChange}
                error={loginError || undefined}
              />

              <PrimaryButton
                style={styles.signInButton}
                title="Sign In"
                loading={loading}
                loadingLabel="Logging in..."
                onPress={handleLogin}
              />

              <Pressable
                onPress={() => setShowForgotPasswordModal(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.accountTextSize, styles.forgot]}>Forgot Password?</Text>
              </Pressable>

              <Divider compact />

              <SocialButton
                compact
                textStyle={styles.guestText}
                title="Continue with Google"
                icon={
                  <Image
                    source={require("../../assets/img/google.png")}
                    style={styles.googleIcon}
                    resizeMode="contain"
                  />
                }
                onPress={() => {
                  showInfo("Google Sign-In", "Google sign-in is currently unavailable. Sign in with your email or continue as a guest.");
                }}
              />

              <Pressable
                accessibilityRole="button"
                disabled={loading || guestLoading}
                style={({ pressed }) => [styles.guestButton, (pressed || loading || guestLoading) && { opacity: 0.5 }]}
                onPress={async () => {
                  if (loading || guestLoading) return;
                  setGuestLoading(true);
                  Keyboard.dismiss();
                  try {
                    if (isAuthenticated) await logout();
                    if (router.canDismiss()) router.dismissAll();
                    router.replace("/(tabs)/home");
                  } catch {
                    setLoginError("Unable to continue as a guest. Please try again.");
                  } finally {
                    setGuestLoading(false);
                  }
                }}
              >
                <Text style={styles.guestText}>{guestLoading ? "Opening…" : "Continue as Guest"}</Text>
              </Pressable>

              <View style={styles.footerRow}>
                <Text style={[styles.accountTextSize, styles.footerText]}>Don’t have an account?</Text>
                <TouchableOpacity
                  onPress={() => setShowRegistrationSheet(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.footerLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.legalFooter, compactHeader && { marginTop: 40 }]}>
                <Text style={[styles.legalText, fontScale > 1.2 && { lineHeight: undefined }]}>
                  By signing in, you agree to our <Text accessibilityRole="link" onPress={() => router.push("/terms")} style={styles.legalLink}>Terms & Conditions</Text> and acknowledge our <Text accessibilityRole="link" onPress={() => router.push("/privacy" as any)} style={styles.legalLink}>Privacy Policy</Text>.
                </Text>
              </View>
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
    justifyContent: "flex-end",
  },

  welcomeHeader: {
    flexShrink: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  accountTextSize: { fontSize: FontSize.small, lineHeight: 22 },

  welcomeTitle: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: 40,
    lineHeight: 48,
  },

  welcomeSubtitle: {
    color: Colors.white,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    lineHeight: 22,
    marginTop: 8,
  },

  bottomSheetContainer: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
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
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  sheetScroll: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  formContent: { flexShrink: 0 },
  legalText: {
    textAlign: "center",
    color: Colors.secondary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FontFamily.regular,
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
    marginTop: 0,
    marginBottom: 0,
    paddingVertical: 8,
    fontFamily: FontFamily.medium,
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
    marginBottom: 0,
    flexWrap: "wrap",
    rowGap: 4,
  },

  guestButton: {
    minHeight: 50,
    marginTop: 0,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  guestText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.dark,
  },

  footerText: {
    color: Colors.secondary,
    fontFamily: FontFamily.regular,
  },

  footerLink: {
    color: Colors.primary,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.small,
    marginLeft: 5,
  },

  legalFooter: {
    marginTop: 64,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },
  legalLink: {
    color: Colors.dark,
    fontFamily: FontFamily.medium,
    textDecorationLine: "none",
  },

  googleIcon: {
    width: 20,
    height: 20,
  },
  signInButton: { minHeight: 50, paddingVertical: 12 },
});
