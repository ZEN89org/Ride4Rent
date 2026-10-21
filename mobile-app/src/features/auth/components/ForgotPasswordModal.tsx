import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import { ActivityIndicator, Animated, Dimensions, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import AppInput from "@/components/common/AppInput";
import PasswordInput from "@/components/common/PasswordInput";
import PrimaryButton from "@/components/common/PrimaryButton";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Radius, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import { forgotPassword, resetPassword, verifyOtp } from "@/features/auth/services/authService";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ForgotPasswordModal({
  visible,
  onClose,
  onSuccess,
}: ForgotPasswordModalProps) {
  const { showModal } = useAppToast();
  // Step 1: Enter Email
  // Step 2: Enter 6-digit OTP
  // Step 3: Enter New Password & Confirm
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState("");

  const otpInputRefs = useRef<(TextInput | null)[]>([]);
  const [sheetTranslateY] = useState(
    () => new Animated.Value(SCREEN_HEIGHT)
  );
  const [backdropOpacity] = useState(
    () => new Animated.Value(0)
  );

  const resetForm = useCallback(() => {
    setStep(1);
    setEmail("");
    setOtp(["", "", "", "", "", ""]);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setCountdown(60);
  }, []);

  const closeSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(sheetTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      resetForm();
      onClose();
    });
  }, [backdropOpacity, onClose, resetForm, sheetTranslateY]);

  useEffect(() => {
    if (visible) {
      sheetTranslateY.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
      ]).start();
    }
  }, [backdropOpacity, sheetTranslateY, visible]);

  useEffect(() => {
    if (!visible || step !== 2) {
      return;
    }

    const focusTimer = setTimeout(() => {
      otpInputRefs.current[0]?.focus();
    }, 300);

    return () => clearTimeout(focusTimer);
  }, [visible, step]);

  useEffect(() => {
    if (!visible || step !== 2 || countdown <= 0) {
      return;
    }

    const countdownTimer = setInterval(() => {
      setCountdown((previous) => previous - 1);
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [visible, step, countdown]);

  const handleOtpChange = (text: string, index: number) => {
    setError("");
    const digits = text.replace(/[^0-9]/g, "").slice(0, 6);
    const nextOtp = [...otp];

    if (digits.length > 1) {
      digits.split("").forEach((digit, offset) => {
        if (index + offset < nextOtp.length) {
          nextOtp[index + offset] = digit;
        }
      });
      setOtp(nextOtp);
      otpInputRefs.current[Math.min(index + digits.length, 5)]?.focus();
      return;
    }

    nextOtp[index] = digits;
    setOtp(nextOtp);
    if (digits && index < nextOtp.length - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (event: any, index: number) => {
    if (event.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      const nextOtp = [...otp];
      nextOtp[index - 1] = "";
      setOtp(nextOtp);
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Step 1: Send OTP to Email
  const handleSendCode = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Please enter your registered Gmail address.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await forgotPassword(trimmedEmail);
      setStep(2);
      setCountdown(60);
    } catch (e: any) {
      const message =
        e.response?.data?.message ||
        (e.code === "ECONNABORTED"
          ? "The password reset request timed out. Please try again."
          : e.message === "Network Error"
          ? "Could not connect to the password reset service. Check your connection and try again."
          : "Could not send the reset code. Please try again.");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendCode = async () => {
    if (countdown > 0 || resending) return;
    try {
      setResending(true);
      setError("");
      await forgotPassword(email.trim().toLowerCase());
      setCountdown(60);
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  // Step 2: Validate OTP entered -> proceed to Step 3
  const handleConfirmOtp = async () => {
    const fullOtp = otp.join("");
    if (fullOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      await verifyOtp(email.trim().toLowerCase(), fullOtp);
      setStep(3);
    } catch (error: any) {
      setError(error.response?.data?.message || "Invalid or expired code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set new password and submit to backend
  const handleResetPassword = async () => {
    setError("");

    if (!newPassword) {
      setError("New password is required.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const fullOtp = otp.join("");
      await resetPassword({
        email: email.trim().toLowerCase(),
        otp: fullOtp,
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      resetForm();
      showModal(
        "Password Reset Successful",
        "Your password has been reset. You can now sign in with your new password.",
        [
          {
            text: "Sign In Now",
            onPress: () => {
              onSuccess();
            },
          },
        ],
        "success"
      );
    } catch (e: any) {
      const backendErrors = e.response?.data?.errors;
      if (backendErrors) {
        const errorText = Object.values(backendErrors).flat().join("\n");
        setError(errorText);
      } else {
        setError(e.response?.data?.message || "Failed to reset password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent={true} onRequestClose={closeSheet}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
        </Animated.View>
        <Animated.View
          style={[
            styles.card,
            { transform: [{ translateY: sheetTranslateY }] },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            automaticallyAdjustKeyboardInsets={true}
            bounces={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Ionicons
                  name={
                    step === 1
                      ? "lock-open-outline"
                      : step === 2
                      ? "mail-unread-outline"
                      : "shield-checkmark-outline"
                  }
                  size={28}
                  color={Colors.primary}
                />
              </View>
              <TouchableOpacity onPress={closeSheet} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.secondary} />
              </TouchableOpacity>
            </View>

            {/* STEP 1: Enter Email */}
            {step === 1 && (
              <View>
                <Text style={styles.title}>Forgot Password</Text>
                <Text style={styles.subtitle}>
                  Enter your registered Gmail address and we&apos;ll send you a 6-digit confirmation code to reset your password.
                </Text>

                <View style={styles.inputContainer}>
                  <AppInput
                    label="Email Address"
                    placeholder="email"
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      setError("");
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.buttonWrap}>
                  <PrimaryButton
                    title={loading ? "Sending Code..." : "Send Verification Code"}
                    onPress={handleSendCode}
                    loading={loading}
                  />
                </View>
              </View>
            )}

            {/* STEP 2: Enter 6-digit OTP */}
            {step === 2 && (
              <View>
                <Text style={styles.title}>Enter Reset Code</Text>
                <Text style={styles.subtitle}>
                  We sent a 6-digit confirmation code to:
                </Text>
                <Text style={styles.emailHighlight}>{email.trim().toLowerCase()}</Text>

                <Pressable
                  style={styles.otpRow}
                  onPress={() => otpInputRefs.current[0]?.focus()}
                >
                  {otp.map((digit, index) => {
                    const filledCount = otp.join("").length;
                    const isActive = index === Math.min(filledCount, 5);
                    return (
                      <View
                        key={index}
                        style={[
                          styles.otpInput,
                          styles.otpBox,
                          digit ? styles.otpInputFilled : null,
                          isActive ? styles.otpInputActive : null,
                          error ? styles.otpInputError : null,
                        ]}
                      >
                        <Text style={styles.otpDigit}>{digit}</Text>
                      </View>
                    );
                  })}
                  <TextInput
                    ref={(ref) => {
                      otpInputRefs.current[0] = ref;
                    }}
                    style={styles.otpHiddenInput}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp.join("")}
                    onChangeText={(value) => {
                      setError("");
                      const digits = value.replace(/[^0-9]/g, "").slice(0, 6);
                      setOtp(Array.from({ length: 6 }, (_, i) => digits[i] || ""));
                    }}
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    caretHidden
                    accessibilityLabel="6-digit reset code"
                  />
                </Pressable>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.resendRow}>
                  <Text style={styles.resendPrompt}>Didn&apos;t receive code? </Text>
                  {countdown > 0 ? (
                    <Text style={styles.countdownText}>Resend in {countdown}s</Text>
                  ) : (
                    <TouchableOpacity onPress={handleResendCode} disabled={resending}>
                      {resending ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : (
                        <Text style={styles.resendBtnText}>Resend Code</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.buttonWrap}>
                  <PrimaryButton
                    title="Confirm Code"
                    loading={loading}
                    onPress={handleConfirmOtp}
                  />
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setError("");
                    setStep(1);
                  }}
                  style={styles.backStepBtn}
                >
                  <Text style={styles.backStepText}>Change Email Address</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 3: Enter New Password */}
            {step === 3 && (
              <View>
                <Text style={styles.title}>Create New Password</Text>
                <Text style={styles.subtitle}>
                  Please choose a strong password that is at least 8 characters long.
                </Text>

                <View style={styles.inputContainer}>
                  <PasswordInput
                    label="New Password"
                    placeholder="Enter new password "
                    value={newPassword}
                    onChangeText={(val: string) => {
                      setNewPassword(val);
                      setError("");
                    }}
                  />

                  <PasswordInput
                    label="Confirm New Password"
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChangeText={(val: string) => {
                      setConfirmPassword(val);
                      setError("");
                    }}
                  />
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.buttonWrap}>
                  <PrimaryButton
                    title={loading ? "Resetting Password..." : "Reset Password"}
                    onPress={handleResetPassword}
                    loading={loading}
                  />
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    maxHeight: "92%",
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.logoBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: {
    padding: 6,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
    color: Colors.dark,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    marginTop: 4,
    lineHeight: 19,
  },
  emailHighlight: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
    marginTop: 2,
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginVertical: Spacing.md,
  },
  otpInput: {
    flex: 1,
    height: 54,
    borderRadius: Radius.md,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1.5,
    borderColor: Colors.border,
    textAlign: "center",
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Colors.dark,
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.logoBackground,
  },
  otpInputError: {
    borderColor: Colors.error,
  },
  otpBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  otpInputActive: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  otpDigit: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Colors.dark,
  },
  otpHiddenInput: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0,
    color: "transparent",
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.error,
    textAlign: "center",
    marginVertical: Spacing.xs,
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: Spacing.sm,
  },
  resendPrompt: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
  },
  countdownText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.secondary,
  },
  resendBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.primary,
  },
  buttonWrap: {
    marginTop: Spacing.md,
  },
  backStepBtn: {
    alignItems: "center",
    marginTop: Spacing.md,
    padding: Spacing.xs,
  },
  backStepText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.primary,
  },
});
