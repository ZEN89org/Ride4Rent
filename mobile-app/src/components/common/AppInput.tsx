import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";

import {
  FontFamily,
  FontSize,
  Radius,
  Spacing,
} from "@/constants/theme";

interface AppInputProps extends TextInputProps {

  label?: string;

  error?: string;

}

export default function AppInput({

  label,

  error,

  ...props

}: AppInputProps) {

  return (

    <View style={styles.container}>

      {label && (

        <Text style={styles.label}>

          {label}

        </Text>

      )}

      <TextInput
        placeholderTextColor={Colors.secondary}
        {...props}
        style={[
          styles.input,
          error ? styles.errorInput : null,
          props.style,
        ]}
      />

      {error && (

        <Text style={styles.errorText}>

          {error}

        </Text>

      )}

    </View>

  );

}

const styles = StyleSheet.create({

  container: {

    marginBottom: Spacing.xl,

  },

  label: {

    marginBottom: 8,

    color: Colors.dark,

    fontFamily: FontFamily.semiBold,

    fontSize: FontSize.body,

  },

  input: {
    backgroundColor: Colors.inputBackground,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.dark,
  },

  errorInput: {

    borderColor: "#ff4d4f",

  },

  errorText: {

    color: "#ff4d4f",

    marginTop: 6,

    marginLeft: 12,

    fontFamily: FontFamily.regular,

    fontSize: 12,

  },

});
