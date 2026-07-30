import {
  Dimensions,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import {
  FontFamily,
  FontSize,
  Spacing,
} from "@/constants/theme";
import { Image } from "expo-image";

const { width } = Dimensions.get("window");

interface Props {
  image: ImageSourcePropType;
  imageWidth: number;
  imageHeight: number;
  title: string;
  description: string;
}

export default function OnboardingSlide({
  image,
  imageWidth,
  imageHeight,
  title,
  description,
}: Props) {
  return (

    <View style={[styles.container, { width }]}>

    <Image
      source={image}
      contentFit="contain"
      style={{
        width: imageWidth,
        height: imageHeight,
        alignSelf: "center",
        marginBottom: 40,
      }}
    />

      <Text style={styles.title}>
        {title}
      </Text>

      <Text style={styles.description}>
        {description}
      </Text>

    </View>

  );

}

const styles = StyleSheet.create({


  container: {

    flex: 1,

    justifyContent: "center",

    alignItems: "center",

    paddingHorizontal: Spacing.xl,

  },


  title: {

    fontFamily: FontFamily.bold,

    fontSize: FontSize.heading,

    color: Colors.dark,

    textAlign: "center",

  },

description: {

  marginTop: 5,

  textAlign: "center",

  color: Colors.secondary,

  lineHeight: 24,

  fontFamily: FontFamily.regular,

  fontSize: FontSize.body,

},

});
