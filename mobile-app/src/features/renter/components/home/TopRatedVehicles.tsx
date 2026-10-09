import { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import TopRatedVehicleCard, {
  TopRatedVehicle,
} from "@/features/renter/components/home/TopRatedVehicleCard";

import { Colors } from "@/constants/colors";
import {
  FontFamily,
  Spacing
} from "@/constants/theme";
import api from "@/services/api";

interface Props {
  onViewPress?: (vehicle: TopRatedVehicle) => void;
}

export default function TopRatedVehicles({
  onViewPress,
}: Props) {
  const { width } = useWindowDimensions();
  const [vehicles, setVehicles] = useState<TopRatedVehicle[]>([]);

  useEffect(() => {
    let mounted = true;
    api.get("/vehicles?sort=top_rated")
      .then((res) => {
        if (!mounted) return;
        const apiVehicles = res.data.data || [];
        setVehicles(
          apiVehicles.slice(0, 10).map((v: any) => ({
            id: String(v.id),
            name: v.name,
            price: Number(v.price_per_day),
            rating: v.rating !== null && v.rating !== undefined ? Number(v.rating) : 0,
            ratingCount: Number(v.rating_count || 0),
            image: v.image_url
              ? { uri: v.image_url }
              : { uri: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=60" },
          }))
        );
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const cardWidth = width - Spacing.lg * 2;

  if (vehicles.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.title}>Top Rated Vehicles</Text>
        <View style={styles.yellowLine} />
      </View>

      <FlatList
        data={vehicles}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        snapToAlignment="start"
        snapToInterval={290 + 10}
        decelerationRate="fast"
        disableIntervalMomentum
        renderItem={({ item }) => (
          <TopRatedVehicleCard
            vehicle={item}
            onViewPress={() => onViewPress?.(item)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
    paddingBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: 8,
    gap: 10,
  },
  title: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Colors.dark,
  },
  yellowLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
});
