import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";

export default function AppFooter() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        @2026 Ride4Rent
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 8,

  },

  text: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
  },
});
