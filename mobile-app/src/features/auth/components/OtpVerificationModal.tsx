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

import PrimaryButton from "@/components/common/PrimaryButton";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Radius, Spacing } from "@/constants/theme";
import { sendVerificationOtp, verifyOtp } from "@/features/auth/services/authService";

interface OtpVerificationModalProps {
  visible: boolean;
  email: string;
  initialOtp?: string;
  onClose: () => void;
  onVerified: (otp: string) => void;
}

export default function OtpVerificationModal({
  visible,
  email,
  initialOtp,
  onClose,
  onVerified,
}: OtpVerificationModalProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState<string | undefined>(initialOtp);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (visible) {
      setOtp(["", "", "", "", "", ""]);
      setError("");
      setCountdown(60);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
    }
  }, [visible]);

  useEffect(() => {
    let timer: any;
    if (visible && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [visible, countdown]);

  const handleChange = (text: string, index: number) => {
    setError("");
    const cleaned = text.replace(/[^0-9]/g, "");
    if (cleaned.length > 1) {
      // Handle paste
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

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    try {
      setResending(true);
      setError("");
      await sendVerificationOtp(email);
      setCountdown(60);
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  const handleConfirm = async () => {
    const fullOtp = otp.join("");
    if (fullOtp.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await verifyOtp(email, fullOtp);
      onVerified(fullOtp);
    } catch (e: any) {
      setError(e.response?.data?.message || "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            bounces={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Ionicons name="mail-unread-outline" size={28} color={Colors.primary} />
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>Confirm Your Gmail</Text>
            <Text style={styles.subtitle}>
              We have sent a 6-digit confirmation code to:
            </Text>
            <Text style={styles.emailHighlight}>{email}</Text>

            {/* 6-Digit Inputs */}
            <View style={styles.otpRow}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={[
                    styles.otpInput,
                    digit ? styles.otpInputFilled : null,
                    error ? styles.otpInputError : null,
                  ]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(val) => handleChange(val, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  selectTextOnFocus
                />
              ))}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Resend Timer */}
            <View style={styles.resendRow}>
              <Text style={styles.resendPrompt}>Didn't receive the code? </Text>
              {countdown > 0 ? (
                <Text style={styles.countdownText}>Resend in {countdown}s</Text>
              ) : (
                <TouchableOpacity onPress={handleResend} disabled={resending}>
                  {resending ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Text style={styles.resendBtnText}>Resend Code</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Confirm Button */}
            <View style={styles.buttonWrap}>
              <PrimaryButton
                title={loading ? "Verifying..." : "Verify & Create Account"}
                onPress={handleConfirm}
                loading={loading}
              />
            </View>
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
    paddingBottom: Platform.OS === "ios" ? Spacing.xl + 20 : Spacing.xl,
    maxHeight: "90%",
  },
  scrollContent: {
    paddingBottom: Spacing.sm,
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
  },
  emailHighlight: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
    marginTop: 2,
    marginBottom: Spacing.lg,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: Spacing.md,
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
    marginBottom: Spacing.sm,
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: Spacing.md,
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
    marginTop: Spacing.sm,
  },
});
