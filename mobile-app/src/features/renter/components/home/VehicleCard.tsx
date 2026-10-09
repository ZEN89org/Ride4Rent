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
  transmission?: string;
  seats?: number;
  fuel_type?: string;
  brand?: string;
  quantity?: number;
  available_units?: number;
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
  const unitsLeft = vehicle.available_units ?? 1;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onViewPress(vehicle)}
      activeOpacity={0.9}
    >
      {/* Top Media Showcase */}
      <View style={styles.imageContainer}>
        <Image
          source={vehicle.image}
          contentFit="cover"
          style={styles.vehicleImage}
        />

        {/* Favorite Button */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => onFavoritePress(vehicle)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={18}
            color={isFavorite ? Colors.primary : Colors.dark}
          />
        </TouchableOpacity>

        {/* Rating Floating Pill */}
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={12} color={Colors.primary} />
          <Text style={styles.ratingText}>
            {Number(vehicle.rating || 5.0).toFixed(1)}
          </Text>
        </View>
      </View>

      {/* Card Info Area */}
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.vehicleName} numberOfLines={1}>
            {vehicle.name}
          </Text>
        </View>

        <Text style={styles.brandSubtitle} numberOfLines={1}>
          {vehicle.brand || "Sedan"} • {vehicle.transmission || "Automatic"}
        </Text>

        {/* Specs Highlights */}
        <View style={styles.specsRow}>
          <View style={styles.specPill}>
            <MaterialCommunityIcons name="car-seat" size={13} color={Colors.dark} />
            <Text style={styles.specText}>{vehicle.seats || 5} Seats</Text>
          </View>

          <View style={styles.specPill}>
            <MaterialCommunityIcons name="gas-station-outline" size={13} color={Colors.dark} />
            <Text style={styles.specText}>{vehicle.fuel_type || "Gasoline"}</Text>
          </View>

          {unitsLeft > 1 && (
            <View style={styles.unitsPill}>
              <Text style={styles.unitsText}>{unitsLeft} units left</Text>
            </View>
          )}
        </View>

        {/* Bottom Price & Booking CTA */}
        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceAmount}>
              ₱{vehicle.pricePerDay.toLocaleString()}
            </Text>
            <Text style={styles.pricePeriod}> / day</Text>
          </View>

          <View style={styles.bookButton}>
            <Text style={styles.bookButtonText}>View Details</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 270,
    backgroundColor: Colors.white,
    borderRadius: 22,
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: 140,
    backgroundColor: Colors.inputBackground,
    position: "relative",
  },
  vehicleImage: {
    width: "100%",
    height: "100%",
  },
  favoriteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingBadge: {
    position: "absolute",
    bottom: 10,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  ratingText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.dark,
  },
  content: {
    padding: Spacing.md,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vehicleName: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
    flex: 1,
  },
  brandSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
  },
  specsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  specPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  specText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.dark,
  },
  unitsPill: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unitsText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: "#2563EB",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
  },
  pricePeriod: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
  },
  bookButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
  },
  bookButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.white,
  },
});
