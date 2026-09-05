import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  ImageSourcePropType,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onViewPress?.(vehicle)}
      activeOpacity={0.88}
    >
      <View style={styles.imageContainer}>
        <Image
          source={vehicle.image}
          contentFit="cover"
          style={styles.image}
        />
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={11} color={Colors.primary} />
          <Text style={styles.ratingText}>{vehicle.rating.toFixed(1)}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={1}>
          {vehicle.name}
        </Text>

        <View style={styles.bottomRow}>
          <Text style={styles.price}>
            ₱{vehicle.price.toLocaleString()}
            <Text style={styles.period}>/day</Text>
          </Text>

          <View style={styles.viewPill}>
            <Text style={styles.viewText}>View</Text>
            <Ionicons name="chevron-forward" size={12} color={Colors.dark} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 220,
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  imageContainer: {
    width: "100%",
    height: 110,
    backgroundColor: Colors.inputBackground,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  ratingBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(26,26,26,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: Colors.white,
  },
  details: {
    padding: 10,
  },
  name: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  price: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
  period: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.secondary,
  },
  viewPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 2,
  },
  viewText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.dark,
  },
});
