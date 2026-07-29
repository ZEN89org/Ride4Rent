import { ReactNode } from "react";
import {
  StyleSheet,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import { Radius, Spacing } from "@/constants/theme";

interface AuthCardProps {
  children: ReactNode;
}

export default function AuthCard({
  children,
}: AuthCardProps) {

  return (

    <View style={styles.card}>

      {children}

    </View>

  );

}

const styles = StyleSheet.create({

card: {

  backgroundColor: Colors.white,

  borderTopLeftRadius: Radius.xl,

  borderTopRightRadius: Radius.xl,

  paddingHorizontal: Spacing.xl,

  paddingTop: 60,

  paddingBottom: 35,

  height: "85%",

  elevation: 10,

  shadowColor: "#000",

  shadowOpacity: 0.12,

  shadowRadius: 10,

  shadowOffset: {
    width: 0,
    height: -3,
  },

}
});
