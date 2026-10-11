import onboarding1 from "@/assets/img/onboarding1.png";
import onboarding2 from "@/assets/img/onboarding2.png";
import onboarding3 from "@/assets/img/onboarding3.png";
import { Dimensions, ImageSourcePropType } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Slide 1: Notification banner (1280 x 640) - 2:1 aspect ratio
const notificationWidth = Math.min(Math.round(SCREEN_WIDTH * 1), 540);
const notificationHeight = Math.round(notificationWidth / 2);

// Slide 2: Location banner cropped to visible artwork (1280 x 1386)
const locationBannerHeight = Math.min(
  Math.round(SCREEN_WIDTH * (1386 / 1280)),
  Math.round(SCREEN_HEIGHT * 0.5)
);

// Slide 3: Vehicle showcase banner cropped to visible artwork (1280 x 1180) fitting edge-to-edge
const vehicleBannerHeight = Math.min(
  Math.round(SCREEN_WIDTH * (1180 / 1280)),
  Math.round(SCREEN_HEIGHT * 0.5)
);

export interface OnboardingItem {
  id: string;
  title: string;
  description: string;
  image: ImageSourcePropType;
  imageWidth: number;
  imageHeight: number;
  isFullTop: boolean;
  contentFit?: "contain" | "cover";
  contentPosition?: "top" | "center";
  textPaddingHorizontal?: number;
  textPaddingTop?: number;
  textPaddingBottom?: number;
  textJustifyContent?: "flex-start" | "center" | "flex-end";
  permission: string | null;
}

export const onboardingData: OnboardingItem[] = [
  {
    id: "1",
    title: "Enable Notifications",
    description:
      "This is required for getting notifications about your rentals.",
    image: onboarding1,
    imageWidth: notificationWidth,
    imageHeight: notificationHeight,
    isFullTop: false,
    contentFit: "contain" as const,
    contentPosition: "center" as const,
    permission: "notification",
  },
  {
    id: "2",
    title: "Allow Location Services",
    description:
      "Location services make address searches more precise, helping you save time and speed up the rental process.",
    image: onboarding2,
    imageWidth: SCREEN_WIDTH,
    imageHeight: locationBannerHeight,
    isFullTop: true,
    contentFit: "cover" as const,
    contentPosition: "top" as const,
    textPaddingHorizontal: 24,
    textPaddingTop: 16,
    textPaddingBottom: 0,
    textJustifyContent: "flex-start" as const,
    permission: "location",
  },
  {
    id: "3",
    title: "Find Your Perfect Ride",
    description:
      "Browse available vehicles from trusted rental operators. Compare prices, features, and availability in one place.",
    image: onboarding3,
    imageWidth: SCREEN_WIDTH,
    imageHeight: vehicleBannerHeight,
    isFullTop: true,
    contentFit: "cover" as const,
    contentPosition: "top" as const,
    textPaddingHorizontal: 24,
    textPaddingTop: 16,
    textPaddingBottom: 0,
    textJustifyContent: "flex-start" as const,
    permission: null,
  },
];
