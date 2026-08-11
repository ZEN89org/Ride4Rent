import { View, StyleSheet } from "react-native";

import { Colors } from "@/constants/colors";
import { Spacing } from "@/constants/theme";

interface Props {
  currentIndex: number;
  total: number;
}

export default function Pagination({
  currentIndex,
  total,
}: Props) {

  return (

    <View style={styles.container}>

      {Array.from({ length: total }).map((_, index) => (

        <View
          key={index}
          style={[
            styles.dot,
            currentIndex === index && styles.active,
          ]}
        />

      ))}

    </View>

  );

}

const styles = StyleSheet.create({

  container: {

    flexDirection: "row",

    justifyContent: "center",

    marginBottom: Spacing.lg,

  },

  dot: {

    width: 10,

    height: 10,

    borderRadius: 5,

    backgroundColor: "#D0D0D0",

    marginHorizontal: 4,

  },

  active: {

    width: 28,

    backgroundColor: Colors.primary,

  },

});