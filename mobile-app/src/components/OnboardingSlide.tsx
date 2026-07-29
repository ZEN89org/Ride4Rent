import { View, Text, StyleSheet, Dimensions } from "react-native";

import { Colors } from "@/constants/colors";
import { FontSize, Spacing } from "@/constants/theme";

const { width } = Dimensions.get("window");

interface Props {
  title: string;
  description: string;
}

export default function OnboardingSlide({
  title,
  description,
}: Props) {

  return (

    <View style={[styles.container, { width }]}>

      <View style={styles.imagePlaceholder} />

      <Text style={styles.title}>
        {title}
      </Text>

      <Text style={styles.description}>
        {description}
      </Text>

    </View>

  );

}

const styles = StyleSheet.create({

  container: {

    flex: 1,

    justifyContent: "center",

    alignItems: "center",

    paddingHorizontal: Spacing.xl,

  },

  imagePlaceholder: {

    width: 220,

    height: 220,

    borderRadius: 110,

    backgroundColor: "#ECECEC",

    marginBottom: 40,

  },

  title: {

    fontSize: FontSize.heading,

    fontWeight: "700",

    color: Colors.dark,

    textAlign: "center",

  },

  description: {

    marginTop: 18,

    textAlign: "center",

    color: Colors.secondary,

    lineHeight: 24,

    fontSize: FontSize.body,

  },

});