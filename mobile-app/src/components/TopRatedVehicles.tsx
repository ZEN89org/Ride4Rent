import {
    FlatList,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";

import TopRatedVehicleCard, {
    TopRatedVehicle,
} from "@/components/TopRatedVehicleCard";

import { Colors } from "@/constants/colors";
import {
    FontFamily,
    FontSize,
    Spacing,
} from "@/constants/theme";

interface Props {
  vehicles?: TopRatedVehicle[];
  onViewPress?: (vehicle: TopRatedVehicle) => void;
}

const defaultVehicles: TopRatedVehicle[] = [
  {
    id: "1",
    name: "Ford Mustang GT",
    price: 8947,
    rating: 5.0,
    image: require("../../assets/img/car4.png"),
  },
  {
    id: "2",
    name: "Toyota Vios",
    price: 1800,
    rating: 4.9,
    image: require("../../assets/img/car5.png"),
  },
  {
    id: "3",
    name: "Honda City",
    price: 2000,
    rating: 4.8,
    image: require("../../assets/img/car6.png"),
  },
];

export default function TopRatedVehicles({
  vehicles = defaultVehicles,
  onViewPress,
}: Props) {
  const { width } = useWindowDimensions();

  const cardWidth = width - Spacing.lg * 2;

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>
          Top rated
        </Text>

        <View style={styles.line} />
      </View>

<FlatList
  data={vehicles}
  horizontal
  showsHorizontalScrollIndicator={false}
  keyExtractor={(item) => item.id}
  contentContainerStyle={styles.list}
  snapToAlignment="center"
  snapToInterval={cardWidth + Spacing.md}
  decelerationRate="fast"
  disableIntervalMomentum
  renderItem={({ item }) => (
    <TopRatedVehicleCard
      vehicle={item}
      onViewPress={onViewPress}
    />
  )}
/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },

  title: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.dark,
  },

  line: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.primary,
    marginLeft: Spacing.md,
  },

  list: {
    gap: Spacing.xl,
  },
});
