import onboarding1 from "@/assets/img/onboarding1.png";
import onboarding2 from "@/assets/img/onboarding2.png";
import onboarding3 from "@/assets/img/onboarding3.png";



export const onboardingData = [
  {
    id: "1",
    title: "Enable Notifications",
    description:
      "This is required for getting notifications about your rentals.",
    image: onboarding1,
    imageWidth: 240,
    imageHeight: 240,
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
    imageWidth: 400,
    imageHeight: 200,
    permission: null,
  },
];
