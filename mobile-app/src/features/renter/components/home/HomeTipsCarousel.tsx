import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

const tips = [
  {
    image: require("../../../../../assets/img/tip1.1.png"),
  },
  {
    image: require("../../../../../assets/img/tip1.png"),
  },
  {
    image: require("../../../../../assets/img/tip3.png"),
  },
];

export default function HomeTipsCarousel() {
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => {
          const nextIndex = (prev + 1) % tips.length;
          flatListRef.current?.scrollToOffset({
            offset: nextIndex * width,
            animated: true,
          });
          return nextIndex;
        });
      }, 9000);

      return () => clearInterval(interval);
    }, [width])
  );

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
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(
            event.nativeEvent.contentOffset.x / width
          );
          setCurrentIndex(Math.min(index, tips.length - 1));
        }}
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
                width: width * 0.9,
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
