import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";

export default function Divider({ compact = false }: { compact?: boolean }) {

  return (

    <View style={[styles.container, compact && { marginVertical: 12 }]}>

      <View style={styles.line} />

      <Text style={styles.text}>
        Or
      </Text>

      <View style={styles.line} />

    </View>

  );

}

const styles = StyleSheet.create({

  container: {

    flexDirection: "row",

    alignItems: "center",

    marginVertical: 24,

  },

  line: {

    flex: 1,

    height: 1,

    backgroundColor: Colors.divider,

  },

text: {

  marginHorizontal: 15,

  color: Colors.secondary,

  fontFamily: FontFamily.regular,

},

});
