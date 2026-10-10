import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";

export interface ToastProps {
  visible: boolean;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
  onDismiss: () => void;
}

export function AppToast({
  visible,
  type,
  title,
  message,
  onDismiss,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      handleDismiss();
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return <Ionicons name="checkmark-circle" size={22} color="#10B981" />;
      case "error":
        return <Ionicons name="alert-circle" size={22} color={Colors.error} />;
      case "warning":
        return <Ionicons name="warning" size={22} color="#F59E0B" />;
      default:
        return <Ionicons name="information-circle" size={22} color={Colors.primary} />;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.modalOverlay} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <View style={styles.iconWrap}>{getIcon()}</View>
          <View style={styles.textWrap}>
            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
          <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn}>
            <Ionicons name="close" size={18} color={Colors.secondary} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
  },
  container: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    zIndex: 999999,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 999,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconWrap: {
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  message: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
  },
});
