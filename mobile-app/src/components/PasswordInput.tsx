import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import {
  FontFamily,
  FontSize,
} from "@/constants/theme";

import { Ionicons } from "@expo/vector-icons";

import AppInput from "./AppInput";

import { Colors } from "@/constants/colors";

export default function PasswordInput(props: any) {

  const [hidden, setHidden] = useState(true);

  return (

    <View>

      <AppInput
        {...props}
        secureTextEntry={hidden}
      />

      <Pressable
        style={styles.icon}
        onPress={() => setHidden(!hidden)}
      >

        <Ionicons
          name={
            hidden
              ? "eye-off-outline"
              : "eye-outline"
          }
          size={22}
          color={Colors.secondary}
        />

      </Pressable>

    </View>

  );

}

const styles = StyleSheet.create({

  icon: {

    position: "absolute",

    right: 18,

    top: 48,

  },

  text: {

    fontFamily: FontFamily.bold,

    fontSize: FontSize.regular,

  },

});
