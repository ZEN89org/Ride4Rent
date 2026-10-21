import type { ViewStyle } from "react-native";
import { Colors } from "./colors";

export const rentalCardStyle: ViewStyle = {
  backgroundColor: Colors.white, borderRadius: 18, padding: 14,
  borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 8,
  shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
};

export const rentalSheetStyle: ViewStyle = {
  backgroundColor: Colors.white, borderTopLeftRadius: 24,
  borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12,
  width: "100%", maxHeight: "92%",
};
