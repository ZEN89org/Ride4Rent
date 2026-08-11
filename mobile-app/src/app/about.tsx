import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import {
  FontFamily,
  FontSize,
  Spacing,
} from "@/constants/theme";

export default function About() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        About Ride4Rent
      </Text>

      <Text style={styles.text}>
        Ride4Rent
      </Text>

      <Text style={styles.version}>
        Version 1.0.0
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
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.dark,
  },

  version: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondary,
  },
});
