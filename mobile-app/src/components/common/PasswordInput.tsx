import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";

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
        style={[styles.icon, props.compact && { top: 26, height: 50, width: 44, right: 6, alignItems: "center", justifyContent: "center" }]}
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

});
