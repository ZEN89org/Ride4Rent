import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";

import { Colors } from "@/constants/colors";

interface Props {

  text: string;

  actionText: string;

  onPress: () => void;

}

export default function AuthFooter({

  text,

  actionText,

  onPress,

}: Props) {

  return (

    <View style={styles.container}>

      <Text style={styles.text}>

        {text}

      </Text>

      <Pressable onPress={onPress}>

        <Text style={styles.action}>

          {actionText}

        </Text>

      </Pressable>

    </View>

  );

}

const styles = StyleSheet.create({

  container: {

    flexDirection: "row",

    justifyContent: "center",

    marginTop: 20,

  },

  text: {

    color: Colors.secondary,

  },

  action: {

    color: Colors.primary,

    fontWeight: "700",

    marginLeft: 5,

  },

});