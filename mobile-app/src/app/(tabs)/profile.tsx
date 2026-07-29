import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";

import ScreenContainer from "@/components/ScreenContainer";
import PrimaryButton from "@/components/PrimaryButton";

import { useAuth } from "@/hooks/useAuth";

import { Colors } from "@/constants/colors";
import { FontSize, Spacing } from "@/constants/theme";

export default function Profile() {

  const auth = useAuth();

  useEffect(() => {

    if (auth.isGuest) {

      router.replace("/auth");

    }

  }, []);

  if (auth.isGuest) {

    return null;

  }

    const logout = async () => {

    await auth.logout();

    router.replace("/");

    };

  return (

    <ScreenContainer>

      <View style={styles.container}>

        <Text style={styles.title}>
          {auth.user.name}
        </Text>

        <Text style={styles.info}>
          {auth.user.email}
        </Text>

        <Text style={styles.info}>
          {auth.user.phone_number || "No phone number"}
        </Text>

        <Text style={styles.info}>
          Role: {auth.user.role}
        </Text>

        <View style={{ height: 30 }} />

        <PrimaryButton
          title="Logout"
          onPress={logout}
        />

      </View>

    </ScreenContainer>

  );

}

const styles = StyleSheet.create({

  container: {

    flex: 1,

    justifyContent: "center",

    padding: Spacing.lg,

  },

  title: {

    fontSize: FontSize.heading,

    fontWeight: "700",

    textAlign: "center",

    marginBottom: 30,

    color: Colors.dark,

  },

  info: {

    fontSize: FontSize.body,

    marginBottom: 10,

    color: Colors.secondary,

  },

});