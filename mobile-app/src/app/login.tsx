import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import AppInput from "@/components/AppInput";
import AppLogo from "@/components/AppLogo";
import AuthCard from "@/components/AuthCard";
import Divider from "@/components/Divider";
import PasswordInput from "@/components/PasswordInput";
import PrimaryButton from "@/components/PrimaryButton";
import ScreenContainer from "@/components/ScreenContainer";
import SocialButton from "@/components/SocialButton";

import { Colors } from "@/constants/colors";
import {
  FontSize
} from "@/constants/theme";
import { login } from "@/services/authService";
import { resetFirstLaunch } from "@/storage/authStorage";

import { useAuth } from "@/hooks/useAuth";

import {
  FontAwesome,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

export default function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login: signIn } = useAuth();
  const handleLogin = async () => {

    if (!email || !password) {

      Alert.alert(
        "Missing Information",
        "Please complete all fields."
      );

      return;

    }

    try {

      setLoading(true);

      const response = await login({
        email,
        password,
      });

    await signIn(
      response.data.user,
      response.data.token
    );

    router.replace("/(tabs)/home");

    } catch (error: any) {

      Alert.alert(
        "Login Failed",
        error?.response?.data?.message ??
          "Invalid email or password."
      );

    } finally {

      setLoading(false);

    }

  };

  const handleReset = async () => {

    await resetFirstLaunch();
    router.replace("/");

  };

  return (

    <ScreenContainer>

      <View style={styles.container}>
        <AuthCard>
        <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
                <AppLogo size={60} />
            </View>
        </View>
        <View style={styles.logoSpacer} />
        <AppInput
            label="Email Address"
            placeholder="johndoe@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <PasswordInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
          />

          <PrimaryButton
            title="Sign In"
            loading={loading}
            onPress={handleLogin}
          />

          <Pressable>
            <Text style={styles.forgot}>
              Forgot Password?
            </Text>
          </Pressable>

          <Divider />

          <SocialButton
            title="Continue with Google"
            icon={
              <MaterialCommunityIcons
                name="google"
                size={22}
                color="#DB4437"
              />
            }
            onPress={() => {}}
          />

          <SocialButton
            title="Continue with Facebook"
            icon={
              <FontAwesome
                name="facebook"
                size={22}
                color="#1877F2"
              />
            }
            onPress={() => {}}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don’t have an account?
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/register")}
            >
              <Text style={styles.footerLink}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.copyright}>
            ©2026 Ride4Rent
          </Text>

          {__DEV__ && (
            <View style={styles.devContainer}>
              <PrimaryButton
                title="Reset First Launch"
                onPress={handleReset}
              />
            </View>
          )}

        </AuthCard>

      </View>

    </ScreenContainer>

  );

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    justifyContent: "flex-end",
  },

    logoContainer: {
      position: "absolute",
      top: -35,
      left: 30,
      zIndex: 100,

    },

    logoCircle: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: Colors.logoBackground,

      justifyContent: "center",

      alignItems: "center",

      elevation: 8,

    },

  title: {

    fontSize: FontSize.heading,

    fontWeight: "700",

    color: Colors.dark,

    marginBottom: 8,

  },

  subtitle: {

    color: Colors.secondary,

    marginBottom: 25,

  },

  forgot: {

    color: Colors.primary,

    textAlign: "center",

    marginTop: 15,

    fontWeight: "600",

  },

  devContainer: {

    marginTop: 15,

  },


footer: {
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",


},

footerText: {
  color: Colors.secondary,

},

footerLink: {
  color: Colors.primary,
  fontWeight: "700",

  marginLeft: 4,
},

copyright: {

  marginTop: 60,

  color: Colors.secondary,

  fontSize: 12,

  textAlign: "center",

},

logoSpacer: {

  height: 40,

},

});
