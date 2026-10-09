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
  FontFamily
} from "@/constants/theme";

export interface TopRatedVehicle {
  id: string;
  name: string;
  price: number;
  rating?: number | null;
  image: ImageSourcePropType;
  ratingCount?: number;
}

interface Props {
  vehicle: TopRatedVehicle;
  onViewPress?: (vehicle: TopRatedVehicle) => void;
}

export default function TopRatedVehicleCard({
  vehicle,
  onViewPress,
}: Props) {
  const hasRating = vehicle.rating !== null && vehicle.rating !== undefined && Number(vehicle.rating) > 0;
  const ratingVal = hasRating ? Number(vehicle.rating).toFixed(1) : null;
  const countVal = (vehicle.ratingCount ?? 0) > 0 ? `(${vehicle.ratingCount})` : "";

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onViewPress?.(vehicle)}
      activeOpacity={0.9}
    >
      {/* Fixed-size image container with background fill */}
      <View style={styles.imageContainer}>
        <Image
          source={vehicle.image}
          contentFit="cover"
          style={styles.carImage}
        />
      </View>

      {/* Right side vehicle details */}
      <View style={styles.infoWrap}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceText} numberOfLines={1}>
            PHP {vehicle.price.toLocaleString()}
          </Text>
          <Text style={styles.pricePer}> / day</Text>
        </View>

        <Text style={styles.vehicleName} numberOfLines={1}>
          {vehicle.name}
        </Text>

        <View style={styles.bottomRow}>
          <View style={styles.ratingRow}>
            {hasRating ? (
              <>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  {ratingVal} <Text style={styles.ratingCount}>{countVal}</Text>
                </Text>
              </>
            ) : (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>New Listing</Text>
              </View>
            )}
          </View>

          {/* View Action Pill Button */}
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => onViewPress?.(vehicle)}
            activeOpacity={0.8}
          >
            <Text style={styles.viewButtonText}>View</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 285,
    height: 104,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  imageContainer: {
    width: 88,
    height: 84,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  carImage: {
    width: "100%",
    height: "100%",
  },
  infoWrap: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
    height: 84,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.dark,
  },
  pricePer: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
  },
  vehicleName: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: "#374151",
    marginTop: -2,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },
  ratingCount: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
  },
  newBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newBadgeText: {
    fontFamily: FontFamily.medium,
    fontSize: 10.5,
    color: Colors.secondary,
  },
  viewButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  viewButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 11.5,
    color: Colors.white,
  },
});
