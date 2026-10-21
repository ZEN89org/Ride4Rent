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
  compact?: boolean;

  label?: string;

  error?: string;

}

export default function AppInput({

  label,

  error,
  compact = false,

  ...props

}: AppInputProps) {

  return (

    <View style={[styles.container, compact && styles.compactContainer]}>

      {label && (

        <Text style={[styles.label, compact && styles.compactLabel]}>

          {label}

        </Text>

      )}

      <TextInput
        placeholderTextColor={Colors.secondary}
        {...props}
        onChangeText={(value) => {
          if (["number-pad", "numeric"].includes(props.keyboardType || "")) props.onChangeText?.(value.replace(/\D/g, ""));
          else if (props.keyboardType === "decimal-pad") { const [whole, ...fraction] = value.replace(/[^\d.]/g, "").split("."); props.onChangeText?.(whole + (fraction.length ? "." + fraction.join("").slice(0, 2) : "")); }
          else props.onChangeText?.(value);
        }}
        style={[
          styles.input,
          compact && styles.compactInput,
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
  compactContainer: { marginBottom: 16 },
  compactLabel: { marginBottom: 6, fontSize: 14, lineHeight: 20 },
  compactInput: { minHeight: 50, paddingVertical: 12, paddingHorizontal: 18, fontSize: 16 },

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

    borderWidth: 1,

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
