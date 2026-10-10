import { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";

interface ScreenContainerProps {
  children: ReactNode;
  backgroundColor?: string;
  edges?: readonly Edge[];
}

export default function ScreenContainer({
  children,
  backgroundColor = Colors.white,
  edges = ["top"],
}: ScreenContainerProps) {
  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, { backgroundColor }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.content}>{children}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
