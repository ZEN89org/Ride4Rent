import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";

import { Colors } from "@/constants/colors";

import {
  FontFamily,
  FontSize,
  Radius,
  Spacing,
} from "@/constants/theme";

interface Props {

  title: string;

  onPress: () => void;

  loading?: boolean;

  disabled?: boolean;

  style?: StyleProp<ViewStyle>;

}

export default function SecondaryButton({

  title,

  onPress,

  loading = false,

  disabled = false,

  style,

}: Props) {

  return (

    <TouchableOpacity

      activeOpacity={0.8}

      disabled={loading || disabled}

      style={[
        styles.button,
        style,
        (loading || disabled) && styles.disabled,
      ]}

      onPress={onPress}

    >

      {loading ? (

        <ActivityIndicator color={Colors.primary} />

      ) : (

        <Text style={styles.text}>

          {title}

        </Text>

      )}

    </TouchableOpacity>

  );

}

const styles = StyleSheet.create({

  button: {

    backgroundColor: Colors.white,

    borderWidth: 1,

    borderColor: Colors.primary,

    borderRadius: Radius.full,

    alignItems: "center",

    justifyContent: "center",

    paddingVertical: Spacing.md,

  },

  text: {

    color: Colors.primary,

    fontFamily: FontFamily.regular,

    fontSize: FontSize.body,

  },

  disabled: {

    opacity: 0.6,

  },

});
