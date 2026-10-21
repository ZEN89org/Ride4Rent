import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

/** Returns true only when text was actually copied. Missing native support is safe. */
export async function copyToClipboard(text: string, cleanSpaces = false): Promise<boolean> {
  if (!text) return false;
  const content = cleanSpaces ? text.replace(/\s+/g, "") : text;
  try {
    if (Platform.OS === "web") {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return false;
      await navigator.clipboard.writeText(content);
      return true;
    }
    // Check availability before importing the package: its entry point throws
    // immediately when an older development binary lacks ExpoClipboard.
    if (!requireOptionalNativeModule("ExpoClipboard")) return false;
    const clipboard = require("expo-clipboard") as typeof import("expo-clipboard");
    return (await clipboard.setStringAsync(content)) !== false;
  } catch {
    return false;
  }
}
