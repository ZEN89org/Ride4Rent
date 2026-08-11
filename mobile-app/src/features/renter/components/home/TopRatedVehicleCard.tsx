import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
    ImageSourcePropType,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from "react-native";

import { Colors } from "@/constants/colors";
import {
    FontFamily,
    FontSize,
    Spacing,
} from "@/constants/theme";

export interface TopRatedVehicle {
  id: string;
  name: string;
  price: number;
  rating: number;
  image: ImageSourcePropType;
}

interface Props {
  vehicle: TopRatedVehicle;
  onViewPress?: (vehicle: TopRatedVehicle) => void;
}

export default function TopRatedVehicleCard({
  vehicle,
  onViewPress,
}: Props) {
  const { width } = useWindowDimensions();

  const cardWidth = width - Spacing.lg * 2;

  return (
    <View
      style={[
        styles.card,
        {
          width: cardWidth,
        },
      ]}
    >
      <View style={styles.imageContainer}>
        <Image
          source={vehicle.image}
          contentFit="cover"
          style={styles.image}
        />
      </View>

      <View style={styles.details}>
        <Text style={styles.price}>
          PHP {vehicle.price.toLocaleString()} | day
        </Text>

        <Text
          style={styles.name}
          numberOfLines={1}
        >
          {vehicle.name}
        </Text>

        <View style={styles.ratingRow}>
          <Ionicons
            name="star"
            size={15}
            color={Colors.primary}
          />

          <Text style={styles.rating}>
            {vehicle.rating.toFixed(1)}
          </Text>

          <Text style={styles.ratingCount}>
            (27)
          </Text>
        </View>

        <TouchableOpacity
          style={styles.viewButton}
          activeOpacity={0.8}
          onPress={() => onViewPress?.(vehicle)}
        >
          <Text style={styles.viewButtonText}>
            View
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    aspectRatio: 2 / 1,
    flexDirection: "row",
    overflow: "hidden",
    backgroundColor: Colors.white,
    marginTop: -5,
  },

  imageContainer: {
    width: "55%",
    height: "80%",
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 15,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  details: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.md,
  },

  price: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.dark,
  },

  name: {
    marginTop: 2,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.dark,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },

  rating: {
    marginLeft: 4,
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.dark,
  },

  ratingCount: {
    marginLeft: 3,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.dark,
  },

  viewButton: {
    marginTop: 5,
    paddingVertical: 4,
    paddingHorizontal: 17,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: Colors.dark,
  },

  viewButtonText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.dark,
  },
});
