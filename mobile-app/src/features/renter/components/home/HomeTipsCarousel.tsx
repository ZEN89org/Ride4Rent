import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

const tips = [
  {
    image: require("../../../../../assets/img/tip1.1.png"),
    width: width * 0.9,
  },
  {
    image: require("../../../../../assets/img/tip1.png"),
    width: width * 0.9,
  },
];

export default function HomeTipsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex =
        (currentIndex + 1) % tips.length;

      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });

      setCurrentIndex(nextIndex);
    }, 9000);

    return () => clearInterval(interval);
  }, [currentIndex]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={tips}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <View
            style={[
              styles.slide,
              {
                width,
              },
            ]}
          >
            <Image
              source={item.image}
              contentFit="contain"
              style={{
                width: item.width,
                aspectRatio: 16 / 9,
              }}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: -90,
    marginBottom: -30,
    zIndex: 10,
    elevation: 10,
  },

  slide: {
    alignItems: "center",
  },
});
