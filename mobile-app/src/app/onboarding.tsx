import { useRef, useState } from "react";
import {
  FlatList,
  View,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";

import ScreenContainer from "@/components/ScreenContainer";
import PrimaryButton from "@/components/PrimaryButton";
import SecondaryButton from "@/components/SecondaryButton";
import Pagination from "@/components/Pagination";
import OnboardingSlide from "@/components/OnboardingSlide";

import { onboardingData } from "@/constants/onboarding";
import { setFirstLaunchComplete } from "@/storage/authStorage";
import { Spacing } from "@/constants/theme";

export default function Onboarding() {

  const flatListRef = useRef<FlatList>(null);

  const [currentIndex, setCurrentIndex] = useState(0);

  const onScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {

    const index = Math.round(
      event.nativeEvent.contentOffset.x /
      event.nativeEvent.layoutMeasurement.width
    );

    setCurrentIndex(index);

  };

  const next = async () => {

    if (currentIndex < onboardingData.length - 1) {

      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
      });

      return;

    }

    await setFirstLaunchComplete();

    router.replace("/(tabs)/home");

  };

  const skip = async () => {

    await setFirstLaunchComplete();

    router.replace("/(tabs)/home");

  };

  return (

    <ScreenContainer>

      <FlatList
        ref={flatListRef}
        data={onboardingData}
        horizontal
        pagingEnabled
        contentContainerStyle={{
          flexGrow: 1,
        }}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item }) => (
          <OnboardingSlide
            title={item.title}
            description={item.description}
          />
        )}
      />

      <View style={styles.footer}>

        <Pagination
          currentIndex={currentIndex}
          total={onboardingData.length}
        />

        <View style={styles.buttonRow}>

        <SecondaryButton
          title="Skip"
          onPress={skip}
          style={{ flex: 1, marginRight: 8 }}
        />

        <PrimaryButton
          title={
            currentIndex === onboardingData.length - 1
              ? "Get Started"
              : "Next"
          }
          onPress={next}
          style={{ flex: 1, marginLeft: 8 }}
        />

        </View>

      </View>

    </ScreenContainer>

  );

}
const styles = StyleSheet.create({

  footer: {

    paddingHorizontal: Spacing.lg,

    paddingBottom: Spacing.xl,

  },

    buttonRow: {

      flexDirection: "row",

      gap: Spacing.md,

      marginTop: Spacing.lg,

    },

});