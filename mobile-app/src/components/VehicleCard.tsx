import {
    Ionicons,
    MaterialCommunityIcons,
} from "@expo/vector-icons";
import { Image } from "expo-image";
import {
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

interface Vehicle {
  id: string;
  name: string;
  image: any;
  pricePerDay: number;
  rating: number;
  ratingCount: number;
}

interface Props {
  vehicle: Vehicle;
  isFavorite: boolean;
  onViewPress: (vehicle: Vehicle) => void;
  onFavoritePress: (vehicle: Vehicle) => void;
}

export default function VehicleCard({
  vehicle,
  isFavorite,
  onViewPress,
  onFavoritePress,
}: Props) {
  return (
    <View style={styles.card}>

      <Image
        source={vehicle.image}
        contentFit="cover"
        style={styles.vehicleImage}
      />

      <View style={styles.favoriteContainer}>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => onFavoritePress(vehicle)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={
              isFavorite
                ? "heart"
                : "heart-outline"
            }
            size={22}
            color={
              isFavorite
                ? Colors.primary
                : Colors.dark
            }
          />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomOverlay}>

        <View style={styles.vehicleInfo}>

          <Text
            style={styles.vehicleName}
            numberOfLines={1}
          >
            {vehicle.name}
          </Text>

          <Text style={styles.price}>
            ₱{vehicle.pricePerDay.toLocaleString()} / day
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
              ({vehicle.ratingCount})
            </Text>

          </View>

        </View>

        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => onViewPress(vehicle)}
          activeOpacity={0.8}
        >
          <Text style={styles.viewText}>
            View
          </Text>

          <MaterialCommunityIcons
            name="arrow-right"
            size={17}
            color={Colors.dark}
          />
        </TouchableOpacity>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({

  card: {
    width: 300,
    height: 230,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: Colors.secondary,
    marginBottom: Spacing.md,
  },

  vehicleImage: {
    width: "100%",
    height: "100%",
  },

  favoriteContainer: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
  },

  favoriteButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
  },

  bottomOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  vehicleInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },

  vehicleName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    color: Colors.white,
  },

  price: {
    marginTop: 3,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.white,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  rating: {
    marginLeft: 4,
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.white,
  },

  ratingCount: {
    marginLeft: 3,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.white,
  },

  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: 28,
  },

  viewText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
    marginRight: 4,
  },

});
