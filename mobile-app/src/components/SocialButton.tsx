import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
} from "react-native";

import {
  Radius,
  Spacing,
} from "@/constants/theme";

import { Colors } from "@/constants/colors";

interface Props {

  title: string;

  icon: React.ReactNode;

  onPress: () => void;

}

export default function SocialButton({

  title,

  icon,

  onPress,

}: Props) {

  return (

    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.8}
    >

      <View style={styles.content}>

        {icon}

        <Text style={styles.text}>

          {title}

        </Text>

      </View>

    </TouchableOpacity>

  );

}

const styles = StyleSheet.create({

  button: {

    backgroundColor: Colors.inputBackground,

    borderRadius: Radius.full,

    paddingVertical: Spacing.md,

    marginBottom: Spacing.md,

  },

  content: {

    flexDirection: "row",

    justifyContent: "center",

    alignItems: "center",

  },

  text: {

    marginLeft: 10,

    color: Colors.dark,

    fontWeight: "600",

  },

});