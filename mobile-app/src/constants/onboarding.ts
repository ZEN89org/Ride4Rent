import onboarding1 from "@/assets/img/onboarding1.png";
import onboarding2 from "@/assets/img/onboarding2.png";
import onboarding3 from "@/assets/img/onboarding3.png";
import { Dimensions } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Notification banner has a 2:1 aspect ratio (6250 x 3125)
const notificationWidth = Math.min(Math.round(SCREEN_WIDTH * 1), 540);
const notificationHeight = Math.round(notificationWidth / 2);

// Location slide 2: True portrait aspect ratio (5313 x 6250) fitting left and right without stretching
const locationBannerHeight = Math.min(
  Math.round(SCREEN_WIDTH * (6250 / 5313)),
  Math.round(SCREEN_HEIGHT * 0.52)
);

// Vehicle showcase slide 3: True aspect ratio (5313 x 5625) fitting left and right without stretching
const vehicleBannerHeight = Math.min(
  Math.round(SCREEN_WIDTH * (5625 / 5313)),
  Math.round(SCREEN_HEIGHT * 0.52)
);

export const onboardingData = [
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
    contentFit: "contain" as const,
    contentPosition: "top" as const,
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
    contentFit: "contain" as const,
    contentPosition: "top" as const,
    permission: null,
  },
];
