import { StyleSheet, Text, View } from "react-native";

import ScreenContainer from "@/components/ScreenContainer";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize } from "@/constants/theme";

export default function Favorites() {
  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.title}>Favorites</Text>
        <Text style={styles.subtitle}>
          Your favorite vehicles will appear here.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: FontSize.heading,
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  subtitle: {
    marginTop: 12,
    fontFamily: FontFamily.regular,
    color: Colors.secondary,
  },
});
