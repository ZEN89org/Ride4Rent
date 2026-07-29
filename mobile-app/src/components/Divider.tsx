import {
  View,
  Text,
  StyleSheet,
} from "react-native";

import { Colors } from "@/constants/colors";

export default function Divider() {

  return (

    <View style={styles.container}>

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

  },

});