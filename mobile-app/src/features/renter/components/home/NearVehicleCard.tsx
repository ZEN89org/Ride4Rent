import {
  Ionicons,
} from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

import { Colors } from "@/constants/colors";
import {
  FontFamily
} from "@/constants/theme";
import { resolveImageUrl } from "@/services/api";

export interface NearVehicleItem {
  id: string;
  name: string;
  image: any;
  pricePerDay: number;
  rating: number;
  ratingCount?: number;
  transmission?: string;
  seats?: number;
  fuel_type?: string;
  brand?: string;
  distance_km?: number | null;
  available_units?: number;
  availability_status?: string;
  demand_badge?: string;
  demand_level?: string;
}

interface Props {
  vehicle: NearVehicleItem;
  isFavorite: boolean;
  onViewPress: (vehicle: NearVehicleItem) => void;
  onFavoritePress: (vehicle: NearVehicleItem) => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function NearVehicleCard({
  vehicle,
  isFavorite,
  onViewPress,
  onFavoritePress,
  containerStyle,
}: Props) {
  const hasRating = (vehicle.ratingCount ?? 0) > 0 && vehicle.rating !== null && vehicle.rating !== undefined && Number(vehicle.rating) > 0;
  const ratingVal = hasRating ? Number(vehicle.rating).toFixed(1) : null;
  const ratingCountVal = (vehicle.ratingCount ?? 0) > 0 ? `(${vehicle.ratingCount})` : "";

  const rawUri =
    typeof vehicle.image === "string"
      ? vehicle.image
      : vehicle.image?.uri;
  const resolvedSource = rawUri
    ? { uri: resolveImageUrl(rawUri) || rawUri }
    : vehicle.image;

  return (
    <TouchableOpacity
      style={[styles.card, containerStyle]}
      onPress={() => onViewPress(vehicle)}
      activeOpacity={0.92}
    >
      {/* Full Card Background Photo */}
      <Image
        source={resolvedSource}
        contentFit="cover"
        style={styles.backgroundImage}
      />

      {vehicle.availability_status === "maintenance" && <View style={{ position: "absolute", top: 12, left: 12, backgroundColor: "#FFF4CE", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, zIndex: 2 }}><Text style={{ fontFamily: FontFamily.semiBold, fontSize: 11, color: "#92400E" }}>Under Maintenance</Text></View>}
      {/* Top Left Dynamic Demand Badge */}
      {vehicle.availability_status !== "maintenance" && vehicle.demand_badge && vehicle.demand_level !== "Normal" && (
        <View style={styles.demandBadgeContainer}>
          <Text style={styles.demandBadgeText}>{vehicle.demand_badge}</Text>
        </View>
      )}

      {/* Top Floating Favorite Button */}
      <TouchableOpacity
        style={styles.favoriteButton}
        onPress={() => onFavoritePress(vehicle)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isFavorite ? "heart" : "heart-outline"}
          size={22}
          color={isFavorite ? Colors.primary : Colors.white}
        />
      </TouchableOpacity>

      {/* Smooth Faded Gradient Overlay at the bottom */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.92)"]}
        locations={[0, 0.45, 1]}
        style={styles.overlayContainer}
      >
        <View style={styles.infoLeft}>
          <Text style={styles.vehicleName} numberOfLines={1}>
            {vehicle.name}
          </Text>

          <Text style={styles.priceText} numberOfLines={1}>
            PHP {vehicle.pricePerDay.toLocaleString()} <Text style={styles.pricePer}>| day</Text>
          </Text>

          {hasRating ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={13} color={Colors.primary} />
              <Text style={styles.ratingText}>
                {ratingVal} {ratingCountVal}
              </Text>
            </View>
          ) : (
            <View style={styles.ratingRow}>
              <Text style={styles.newBadgeText}>New Listing</Text>
            </View>
          )}
        </View>

        {/* View Action Pill */}
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => onViewPress(vehicle)}
          activeOpacity={0.85}
        >
          <Text style={styles.viewButtonText}>View</Text>
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 250,
    height: 180,
    borderRadius: 22,
    marginRight: 10,
    backgroundColor: "#1A1A1A",
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  demandBadgeContainer: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.72)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    zIndex: 10,
  },
  demandBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: "#FDE047",
  },
  favoriteButton: {
    position: "absolute",
    top: 12,
    right: 14,
    zIndex: 10,
    padding: 4,
  },
  overlayContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 110,
    paddingHorizontal: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  infoLeft: {
    flex: 1,
    paddingRight: 10,
  },
  vehicleName: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.white,
    letterSpacing: 0.2,
  },
  priceText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.white,
    marginTop: 2,
  },
  pricePer: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: "#D1D5DB",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  ratingText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.white,
  },
  newBadgeText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.primary,
  },
  viewButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 7,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  viewButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
});
