import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TextInput, View } from "react-native";

import { Colors } from "@/constants/colors";
import { FontFamily, Spacing } from "@/constants/theme";

interface Props {
  value: string;
  onChangeText: (value: string) => void;
}

export default function HomeSearchBar({
  value,
  onChangeText,
}: Props) {
  return (
    <View style={styles.container}>
      <Ionicons
        name="search-outline"
        size={21}
        color={Colors.dark}
      />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search vehicle, operator, or location..."
        placeholderTextColor={Colors.secondary}
        style={styles.input}
        returnKeyType="search"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    marginTop: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },

  input: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontFamily: FontFamily.regular,
    color: Colors.dark,
    fontSize: 10,
  },
});
