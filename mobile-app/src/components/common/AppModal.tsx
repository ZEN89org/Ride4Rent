import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Radius, Spacing } from "@/constants/theme";

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
  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return <Ionicons name="checkmark-circle" size={44} color="#10B981" />;
      case "error":
        return <Ionicons name="close-circle" size={44} color={Colors.error} />;
      case "warning":
        return <Ionicons name="alert-circle" size={44} color="#F59E0B" />;
      case "confirm":
        return <Ionicons name="help-circle" size={44} color={Colors.primary} />;
      default:
        return <Ionicons name="information-circle" size={44} color={Colors.primary} />;
    }
  };

  const handleButtonPress = (btn: ModalButton) => {
    onClose();
    if (btn.onPress) {
      btn.onPress();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.card}>
              <View style={styles.iconContainer}>{getIcon()}</View>
              <Text style={styles.title}>{title}</Text>
              {message ? <Text style={styles.message}>{message}</Text> : null}

              <View style={styles.buttonRow}>
                {buttons.map((btn, index) => {
                  const isCancel = btn.style === "cancel";
                  const isDestructive = btn.style === "destructive";

                  return (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.8}
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
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  iconContainer: {
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    color: Colors.dark,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  message: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    width: "100%",
    justifyContent: "center",
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDefault: {
    backgroundColor: Colors.primary,
  },
  buttonCancel: {
    backgroundColor: Colors.inputBackground,
  },
  buttonDestructive: {
    backgroundColor: Colors.error,
  },
  buttonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.small,
  },
  buttonDefaultText: {
    color: Colors.white,
  },
  buttonCancelText: {
    color: Colors.secondary,
  },
  buttonDestructiveText: {
    color: Colors.white,
  },
});
