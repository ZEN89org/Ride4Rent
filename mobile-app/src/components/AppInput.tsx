import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import {
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

        {...props}

        placeholderTextColor={Colors.secondary}

        style={[
          styles.input,
          error && styles.errorInput,
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

    fontWeight: "600",

    fontSize: FontSize.body,

  },

  input: {

    backgroundColor: Colors.inputBackground,

    borderRadius: Radius.full,

    paddingHorizontal: Spacing.lg,

    paddingVertical: Spacing.md,

    fontSize: FontSize.body,
  },

  errorInput: {

    borderColor: "#ff4d4f",

  },

  errorText: {

    color: "#ff4d4f",

    marginTop: 6,

    marginLeft: 12,

    fontSize: 12,

  },

});
