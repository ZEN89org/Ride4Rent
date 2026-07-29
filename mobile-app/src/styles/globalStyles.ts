import { StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";
import { FontSize, Radius, Spacing } from "@/constants/theme";

export const GlobalStyles = StyleSheet.create({

  screen: {

    flex: 1,

    backgroundColor: Colors.white,

    padding: Spacing.lg,

  },

  center: {

    flex: 1,

    justifyContent: "center",

    alignItems: "center",

  },

  title: {

    fontSize: FontSize.heading,

    fontWeight: "700",

    color: Colors.text,

  },

  subtitle: {

    fontSize: FontSize.body,

    color: Colors.secondary,

    textAlign: "center",

  },

  card: {

    backgroundColor: Colors.white,

    borderRadius: Radius.md,

    padding: Spacing.lg,

  },

  devContainer: {

  marginTop: 50,

  borderTopWidth: 1,

  borderColor: "#e5e5e5",

  paddingTop: 20,

},

devTitle: {

  textAlign: "center",

  marginBottom: 12,

  color: "#888",

  fontSize: 13,

},

});