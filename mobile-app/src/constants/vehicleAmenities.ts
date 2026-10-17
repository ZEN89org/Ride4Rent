export interface AmenityOption {
  id: string;
  label: string;
  icon: string;
  iconType: "ion" | "mci";
  color: string;
  category: "all" | "car" | "van" | "motorcycle";
}

export const ALL_AMENITIES: AmenityOption[] = [
  // General & Safety
  {
    id: "lto_verified",
    label: "LTO Registered & Verified",
    icon: "shield-checkmark",
    iconType: "ion",
    color: "#478c75",
    category: "all",
  },
  {
    id: "clean_sanitized",
    label: "Clean & Sanitized Unit",
    icon: "sparkles",
    iconType: "ion",
    color: "#485f83",
    category: "all",
  },
  {
    id: "recently_serviced",
    label: "Recently Serviced & Maintained",
    icon: "tools",
    iconType: "mci",
    color: "#474884",
    category: "all",
  },
  {
    id: "full_tank",
    label: "Full Tank on Handover",
    icon: "gas-station",
    iconType: "mci",
    color: "#42856f",
    category: "all",
  },

  // 4-Wheel Comfort & Features (Cars, SUVs, Vans)
  {
    id: "air_conditioning",
    label: "Air Conditioning",
    icon: "snow",
    iconType: "ion",
    color: "#455882",
    category: "car",
  },
  {
    id: "bluetooth_audio",
    label: "Audio & Bluetooth Stereo",
    icon: "bluetooth",
    iconType: "ion",
    color: "#464781",
    category: "car",
  },
  {
    id: "usb_charger",
    label: "USB Charging Port",
    icon: "flash",
    iconType: "ion",
    color: "#846c42",
    category: "car",
  },
  {
    id: "gps_navigation",
    label: "GPS Navigation Ready",
    icon: "navigate-circle",
    iconType: "ion",
    color: "#846542",
    category: "car",
  },
  {
    id: "reverse_camera",
    label: "Backup Camera / Sensors",
    icon: "camera-reverse",
    iconType: "ion",
    color: "#477287",
    category: "car",
  },
  {
    id: "dual_ac",
    label: "Dual / Rear AC System",
    icon: "fan",
    iconType: "mci",
    color: "#477287",
    category: "van",
  },
  {
    id: "large_luggage",
    label: "Spacious Trunk / Luggage Cargo",
    icon: "bag-personal",
    iconType: "mci",
    color: "#875d47",
    category: "car",
  },
  {
    id: "high_ground_clearance",
    label: "High Ground Clearance",
    icon: "car-estate",
    iconType: "mci",
    color: "#856147",
    category: "car",
  },
  {
    id: "child_seat",
    label: "Child Safety Seat Available",
    icon: "car-child-seat",
    iconType: "mci",
    color: "#834564",
    category: "car",
  },
  {
    id: "dashcam",
    label: "Equipped with Dashcam",
    icon: "video-vintage",
    iconType: "mci",
    color: "#456187",
    category: "car",
  },

  // 2-Wheel Specific (Motorcycles, Scooters)
  {
    id: "helmet_included",
    label: "Helmet Included",
    icon: "motorbike",
    iconType: "mci",
    color: "#836c45",
    category: "motorcycle",
  },
  {
    id: "extra_helmet",
    label: "Extra Passenger Helmet",
    icon: "hard-hat",
    iconType: "mci",
    color: "#826545",
    category: "motorcycle",
  },
  {
    id: "phone_holder",
    label: "Handlebar Phone Mount",
    icon: "cellphone-dock",
    iconType: "mci",
    color: "#485d8b",
    category: "motorcycle",
  },
  {
    id: "raincoat_ready",
    label: "Emergency Raincoat / Poncho",
    icon: "weather-pouring",
    iconType: "mci",
    color: "#487a87",
    category: "motorcycle",
  },
  {
    id: "top_box",
    label: "Rear Top Box / Storage Box",
    icon: "package-variant-closed",
    iconType: "mci",
    color: "#45638f",
    category: "motorcycle",
  },
  {
    id: "high_fuel_economy",
    label: "High Fuel Efficiency (45+ km/L)",
    icon: "gas-station-outline",
    iconType: "mci",
    color: "#408158",
    category: "motorcycle",
  },
];

export const getAmenitiesForType = (vehicleTypeName: string = ""): AmenityOption[] => {
  const vType = vehicleTypeName.toLowerCase();
  const isMotorcycle = vType.includes("motorcycle") || vType.includes("scooter") || vType.includes("bike");
  const isVan = vType.includes("van") || vType.includes("mpv");

  if (isMotorcycle) {
    return ALL_AMENITIES.filter((a) => a.category === "all" || a.category === "motorcycle");
  }

  if (isVan) {
    return ALL_AMENITIES.filter((a) => a.category === "all" || a.category === "car" || a.category === "van");
  }

  return ALL_AMENITIES.filter((a) => a.category === "all" || a.category === "car");
};

export const getDefaultAmenitiesForType = (vehicleTypeName: string = ""): string[] => {
  const vType = vehicleTypeName.toLowerCase();
  const isMotorcycle = vType.includes("motorcycle") || vType.includes("scooter") || vType.includes("bike");
  const isVan = vType.includes("van") || vType.includes("mpv");

  if (isMotorcycle) {
    return ["lto_verified", "helmet_included", "high_fuel_economy", "recently_serviced", "clean_sanitized"];
  }

  if (isVan) {
    return ["lto_verified", "dual_ac", "large_luggage", "bluetooth_audio", "usb_charger", "clean_sanitized"];
  }

  return ["lto_verified", "air_conditioning", "bluetooth_audio", "usb_charger", "clean_sanitized"];
};

export const resolveAmenityDisplay = (idOrLabel: string): {
  id: string;
  label: string;
  icon: string;
  iconType: "ion" | "mci";
  color: string;
} => {
  const found = ALL_AMENITIES.find((a) => a.id === idOrLabel || a.label.toLowerCase() === idOrLabel.toLowerCase());
  if (found) {
    return {
      id: found.id,
      label: found.label,
      icon: found.icon,
      iconType: found.iconType,
      color: found.color,
    };
  }

  // Fallback for custom labels
  return {
    id: idOrLabel,
    label: idOrLabel,
    icon: "checkmark-circle",
    iconType: "ion",
    color: "#10B981",
  };
};
