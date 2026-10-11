import onboarding1 from "@/assets/img/onboarding1.png";
import onboarding2 from "@/assets/img/onboarding2.png";
import onboarding3 from "@/assets/img/onboarding3.png";
import { Dimensions } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Notification banner has a 2:1 aspect ratio (6250 x 3125)
const notificationWidth = Math.min(SCREEN_WIDTH - 24, 430);
const notificationHeight = Math.round(notificationWidth / 2);

export const onboardingData = [
  {
    id: "1",
    title: "Enable Notifications",
    description:
      "This is required for getting notifications about your rentals.",
    image: onboarding1,
    imageWidth: notificationWidth,
    imageHeight: notificationHeight,
    permission: "notification",
  },
  {
    id: "2",
    title: "Allow Location Services",
    description:
      "Location services make address searches more precise, helping you save time and speed up the rental process.",
    image: onboarding2,
    imageWidth: 280,
    imageHeight: 250,
    permission: "location",
  },
  {
    id: "3",
    title: "Find Your Perfect Ride",
    description:
      "Browse available vehicles from trusted rental operators. Compare prices, features, and availability in one place.",
    image: onboarding3,
    imageWidth: Math.min(SCREEN_WIDTH - 32, 380),
    imageHeight: Math.round(Math.min(SCREEN_WIDTH - 32, 380) * 0.5),
    permission: null,
  },
];
