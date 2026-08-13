  import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

  import AppFooter from "@/components/common/AppFooter";
import AppLogo from "@/components/common/AppLogo";
import PrimaryButton from "@/components/common/PrimaryButton";
import ScreenContainer from "@/components/common/ScreenContainer";
import SecondaryButton from "@/components/common/SecondaryButton";

  import RegistrationRoleBottomSheet from "@/features/auth/components/RegistrationRoleBottomSheet";

  import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";

  export default function Auth() {
    const [showRegistrationSheet, setShowRegistrationSheet] =
      useState(false);

    const handleRenterRegistration = () => {
      setShowRegistrationSheet(false);
      router.push("/register");
    };

    const handleOperatorRegistration = () => {
      setShowRegistrationSheet(false);
    };

    return (
      <ScreenContainer>
        <View style={styles.container}>
          <View style={styles.centerContent}>
            <AppLogo />

            <Text style={styles.brand}>
              Ride4Rent
            </Text>
          </View>

          <View style={styles.bottomContent}>
            <Text style={styles.tagline}>
              Find your perfect ride
            </Text>

            <PrimaryButton
              title="Sign In"
              onPress={() => router.push("/login")}
            />

            <View style={styles.spacing} />

            <SecondaryButton
              title="Create Account"
              onPress={() => setShowRegistrationSheet(true)}
            />

            <AppFooter />
          </View>
        </View>

        <RegistrationRoleBottomSheet
          visible={showRegistrationSheet}
          onClose={() => setShowRegistrationSheet(false)}
          onSelectRenter={handleRenterRegistration}
          onSelectOperator={handleOperatorRegistration}
        />
      </ScreenContainer>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "space-between",
      padding: Spacing.lg,
    },

    centerContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },

    brand: {
      marginTop: -20,
      fontSize: FontSize.heading,
      fontFamily: FontFamily.medium,
      color: Colors.dark,
    },

    bottomContent: {
      marginTop: 65,
    },

    tagline: {
      textAlign: "center",
      marginBottom: Spacing.lg,
      color: Colors.secondary,
      fontSize: FontSize.body,
    },

    spacing: {
      height: Spacing.md,
    },
  });
