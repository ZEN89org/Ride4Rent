import {
  ActivityIndicator,
  View,
  StyleSheet,
} from "react-native";

import { Colors } from "@/constants/colors";

export default function Loading() {
  return (
    <View style={styles.container}>
      <ActivityIndicator
        size="large"
        color={Colors.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});