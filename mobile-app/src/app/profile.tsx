import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import {
    FontFamily,
    FontSize,
    Spacing,
} from "@/constants/theme";

export default function Profile() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        My Profile
      </Text>

      <Text style={styles.text}>
        Profile information will appear here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
    color: Colors.dark,
  },

  text: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondary,
    textAlign: "center",
  },
});
