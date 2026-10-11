  import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Animated,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  View,
} from "react-native";

import {
  requestLocationPermission,
  requestNotificationPermission,
} from "@/services/permissionService";

import Pagination from "@/components/common/Pagination";
import PrimaryButton from "@/components/common/PrimaryButton";
import ScreenContainer from "@/components/common/ScreenContainer";
import SecondaryButton from "@/components/common/SecondaryButton";
import OnboardingSlide from "@/components/onboarding/OnboardingSlide";

import { onboardingData } from "@/constants/onboarding";
import { Spacing } from "@/constants/theme";
import { setFirstLaunchComplete } from "@/features/auth/storage/authStorage";

export default function Onboarding() {
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const [currentIndex, setCurrentIndex] = useState(0);

  const isLastSlide =
    currentIndex === onboardingData.length - 1;

  const currentSlide =
    onboardingData[currentIndex];

  const onScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const width = event.nativeEvent.layoutMeasurement.width;
    if (width > 0) {
      const index = Math.round(
        event.nativeEvent.contentOffset.x / width
      );
      if (index >= 0 && index < onboardingData.length) {
        setCurrentIndex(index);
      }
    }
  };

  const goToNextSlide = () => {
    if (!isLastSlide) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });

      return;
    }

    completeOnboarding();
  };

  const completeOnboarding = async () => {
    await setFirstLaunchComplete();

    router.replace("/current-location");
  };

  const handleAllow = async () => {
    if (currentSlide.permission === "notification") {
      await requestNotificationPermission();
    }

    if (currentSlide.permission === "location") {
      await requestLocationPermission();
    }

    goToNextSlide();
  };

  const handleDeny = () => {
    goToNextSlide();
  };

  const handleSkip = async () => {
    await setFirstLaunchComplete();

    router.replace("/current-location");
  };

  return (
    <ScreenContainer edges={["bottom"]}>
      <Animated.FlatList
        ref={flatListRef as any}
        data={onboardingData}
        horizontal
        pagingEnabled
        contentContainerStyle={{
          flexGrow: 1,
        }}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          {
            useNativeDriver: false,
            listener: onScroll,
          }
        )}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item, index }) => (
          <OnboardingSlide
            image={item.image}
            imageWidth={item.imageWidth}
            imageHeight={item.imageHeight}
            title={item.title}
            description={item.description}
            isFullTop={item.isFullTop}
            contentFit={item.contentFit}
            contentPosition={item.contentPosition}
            textPaddingTop={item.textPaddingTop}
            index={index}
            scrollX={scrollX}
          />
        )}
      />

      <View style={styles.footer}>
        <Pagination
          currentIndex={currentIndex}
          total={onboardingData.length}
          scrollX={scrollX}
        />

          <View style={styles.buttonRow}>
            {isLastSlide ? (
              <>
                <SecondaryButton
                  title="Skip"
                  onPress={handleSkip}
                  style={{
                    flex: 1,
                    marginRight: 8,
                  }}
                />

                <PrimaryButton
                  title="Get Started"
                  onPress={completeOnboarding}
                  style={{
                    flex: 1,
                    marginLeft: 8,
                  }}
                />
              </>
            ) : (
              <>
                <SecondaryButton
                  title="Deny"
                  onPress={handleDeny}
                  style={{
                    flex: 1,
                    marginRight: 8,
                  }}
                />

                <PrimaryButton
                  title="Allow"
                  onPress={handleAllow}
                  style={{
                    flex: 1,
                    marginLeft: 8,
                  }}
                />
              </>
            )}
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
