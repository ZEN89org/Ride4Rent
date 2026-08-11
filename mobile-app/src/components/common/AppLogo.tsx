import { Image, StyleSheet } from "react-native";

interface AppLogoProps {
  size?: number;
}

export default function AppLogo({
  size = 180,
}: AppLogoProps) {

  return (

    <Image
      source={require("../../../assets/img/ride4rent.png")}
      style={[
        styles.logo,
        {
          width: size,
          height: size,
        },
      ]}
      resizeMode="contain"
    />

  );

}

const styles = StyleSheet.create({

  logo: {

    alignSelf: "center",

  },

});
