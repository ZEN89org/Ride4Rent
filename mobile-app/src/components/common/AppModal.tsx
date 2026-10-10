import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Radius, Spacing } from "@/constants/theme";

import { AppBottomSheet } from "./AppBottomSheet";

export interface ModalButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

export interface AppModalProps {
  visible: boolean;
  title: string;
  message?: string;
  type?: "info" | "success" | "warning" | "error" | "confirm";
  buttons?: ModalButton[];
  onClose: () => void;
}

export function AppModal({
  visible,
  title,
  message,
  type = "info",
  buttons = [{ text: "OK", style: "default" }],
  onClose,
}: AppModalProps) {
  const getTypeConfig = () => {
    switch (type) {
      case "success":
        return {
          icon: <Ionicons name="checkmark-circle" size={28} color="#10B981" />,
          glowBg: "#ECFDF5",
          borderColor: "#A7F3D0",
          accentColor: "#10B981",
        };
      case "error":
        return {
          icon: <Ionicons name="close-circle" size={28} color="#EF4444" />,
          glowBg: "#FEF2F2",
          borderColor: "#FECACA",
          accentColor: "#EF4444",
        };
      case "warning":
        return {
          icon: <Ionicons name="warning" size={26} color="#F59E0B" />,
          glowBg: "#FFFBEB",
          borderColor: "#FDE68A",
          accentColor: "#F59E0B",
        };
      case "confirm":
        return {
          icon: <Ionicons name="shield-checkmark" size={26} color="#1E293B" />,
          glowBg: "#F8FAFC",
          borderColor: "#E2E8F0",
          accentColor: Colors.dark,
        };
      default:
        return {
          icon: <Ionicons name="information-circle" size={28} color="#3B82F6" />,
          glowBg: "#EFF6FF",
          borderColor: "#BFDBFE",
          accentColor: "#3B82F6",
        };
    }
  };

  const cfg = getTypeConfig();

  const handleButtonPress = (btn: ModalButton) => {
    onClose();
    if (btn.onPress) {
      btn.onPress();
    }
  };

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      position="bottom"
      showHandle={true}
      sheetStyle={styles.sheetCard}
    >
      <View style={styles.contentWrap}>
        {/* Minimal Accent Glow Header */}
        <View style={[styles.iconContainer, { backgroundColor: cfg.glowBg, borderColor: cfg.borderColor }]}>
          {cfg.icon}
        </View>

        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.buttonRow}>
          {buttons.map((btn, index) => {
            const isCancel = btn.style === "cancel";
            const isDestructive = btn.style === "destructive";

            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.85}
                onPress={() => handleButtonPress(btn)}
                style={[
                  styles.button,
                  isCancel && styles.buttonCancel,
                  isDestructive && styles.buttonDestructive,
                  !isCancel && !isDestructive && styles.buttonDefault,
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    isCancel && styles.buttonCancelText,
                    isDestructive && styles.buttonDestructiveText,
                    !isCancel && !isDestructive && styles.buttonDefaultText,
                  ]}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  contentWrap: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    width: "100%",
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 38 : 28,
    alignItems: "center",
    elevation: 24,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
  },
  sheetHandle: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
    marginBottom: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 18.5,
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  message: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    justifyContent: "center",
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDefault: {
    backgroundColor: "#0F172A",
  },
  buttonCancel: {
    backgroundColor: "#F1F5F9",
  },
  buttonDestructive: {
    backgroundColor: "#EF4444",
  },
  buttonText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  buttonDefaultText: {
    color: Colors.white,
  },
  buttonCancelText: {
    color: "#64748B",
  },
  buttonDestructiveText: {
    color: Colors.white,
  },
});
