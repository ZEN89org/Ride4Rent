import ScreenContainer from "@/components/ScreenContainer";
import { Colors } from "@/constants/colors";
import { FontSize } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { router } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function Bookings() {

  const {
    isGuest,
  } = useAuth();

  useEffect(() => {
    if (isGuest) {
      router.replace("/auth");
    }

  }, []);
  if (isGuest) {

    return null;

  }

  return (

    <ScreenContainer>

      <View style={styles.container}>

        <Text style={styles.title}>
          Booking Screen
        </Text>

        <Text style={styles.subtitle}>
          Booking module will be added next.
        </Text>

      </View>

    </ScreenContainer>

  );

}

const styles = StyleSheet.create({

  container: {

    flex: 1,

    justifyContent: "center",

    alignItems: "center",

  },

  title: {

    fontSize: FontSize.heading,

    fontWeight: "700",

    color: Colors.dark,

  },

  subtitle: {

    marginTop: 12,

    color: Colors.secondary,

  },

});
