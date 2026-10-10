import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import AppInput from "@/components/common/AppInput";
import PasswordInput from "@/components/common/PasswordInput";
import PrimaryButton from "@/components/common/PrimaryButton";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Radius, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import { forgotPassword, resetPassword } from "@/features/auth/services/authService";

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

  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (visible) {
      setStep(1);
      setEmail("");
      setOtp(["", "", "", "", "", ""]);
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setCountdown(60);
    }
  }, [visible]);

  useEffect(() => {
    let timer: any;
    if (visible && step === 2) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);

      if (countdown > 0) {
        timer = setInterval(() => {
          setCountdown((prev) => prev - 1);
        }, 1000);
      }
    }
    return () => clearInterval(timer);
  }, [visible, step, countdown]);

  const handleOtpChange = (text: string, index: number) => {
    setError("");
    const cleaned = text.replace(/[^0-9]/g, "");
    if (cleaned.length > 1) {
      const digits = cleaned.slice(0, 6).split("");
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleaned;
    setOtp(newOtp);

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
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
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
    } catch (e: any) {
      const message =
        e.response?.data?.message ||
        "Could not send reset code. Please check your email.";
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
  const handleConfirmOtp = () => {
    const fullOtp = otp.join("");
    if (fullOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }
    setError("");
    setStep(3);
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
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <View style={styles.card}>
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
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.secondary} />
              </TouchableOpacity>
            </View>

            {/* STEP 1: Enter Email */}
            {step === 1 && (
              <View>
                <Text style={styles.title}>Forgot Password</Text>
                <Text style={styles.subtitle}>
                  Enter your registered Gmail address and we'll send you a 6-digit confirmation code to reset your password.
                </Text>

                <View style={styles.inputContainer}>
                  <AppInput
                    label="Email Address"
                    placeholder="johndoe@gmail.com"
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

                <View style={styles.otpRow}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => {
                        inputRefs.current[index] = ref;
                      }}
                      style={[
                        styles.otpInput,
                        digit ? styles.otpInputFilled : null,
                        error ? styles.otpInputError : null,
                      ]}
                      keyboardType="number-pad"
                      maxLength={1}
                      value={digit}
                      onChangeText={(val) => handleOtpChange(val, index)}
                      onKeyPress={(e) => handleOtpKeyPress(e, index)}
                      selectTextOnFocus
                    />
                  ))}
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.resendRow}>
                  <Text style={styles.resendPrompt}>Didn't receive code? </Text>
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
                    placeholder="Enter new password (min. 8 chars)"
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
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
