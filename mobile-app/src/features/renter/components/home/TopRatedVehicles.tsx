import React, { useEffect, useState } from "react";
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
  FontSize,
  Spacing,
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
          apiVehicles.slice(0, 6).map((v: any) => ({
            id: String(v.id),
            name: v.name,
            price: Number(v.price_per_day),
            rating: Number(v.rating || 5.0),
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
      </View>

      <FlatList
        data={vehicles}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + Spacing.md}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
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
    marginTop: Spacing.md,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    color: Colors.dark,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
});
