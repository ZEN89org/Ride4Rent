import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import {
    FontFamily,
    FontSize,
    Spacing,
} from "@/constants/theme";

export default function Account() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Account
      </Text>

      <Text style={styles.description}>
        Manage your Ride4Rent account.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },

  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
    color: Colors.dark,
  },

  description: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondary,
  },
});
