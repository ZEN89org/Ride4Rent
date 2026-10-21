import {
  StyleSheet,
  StyleProp,
  TextStyle,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  FontFamily,
  FontSize,
  Radius,
  Spacing,
} from "@/constants/theme";

import { Colors } from "@/constants/colors";

interface Props {
  textStyle?: StyleProp<TextStyle>;
  compact?: boolean;

  title: string;

  icon: React.ReactNode;

  onPress: () => void;

}

export default function SocialButton({

  title,

  icon,

  onPress,
  compact = false,
  textStyle,

}: Props) {

  return (

    <TouchableOpacity
      style={[styles.button, compact && { paddingVertical: 12, minHeight: 50, marginBottom: 12 }]}
      onPress={onPress}
      activeOpacity={0.8}
    >

      <View style={styles.content}>

        {icon}

        <Text style={[styles.text, textStyle]}>

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

  fontFamily: FontFamily.regular,

  fontSize: FontSize.small,

  },

});
