import { Platform, Share } from "react-native";

/**
 * Safely copies text to the device clipboard across all environments.
 * Gracefully falls back if native clipboard modules (e.g. ExpoClipboard)
 * are not linked in the current binary build, preventing app crashes.
 */
export async function copyToClipboard(text: string, cleanSpaces = false): Promise<boolean> {
  if (!text) return false;
  const content = cleanSpaces ? text.replace(/\s+/g, "") : text;

  // 1. Try expo-clipboard lazily with safe catch
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ExpoClipboard = require("expo-clipboard");
    if (ExpoClipboard && typeof ExpoClipboard.setStringAsync === "function") {
      await ExpoClipboard.setStringAsync(content);
      return true;
    }
  } catch {
    // Native module 'ExpoClipboard' is not linked in the active runtime
  }

  // 2. Try Web / DOM navigator.clipboard if running in web context
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(content);
      return true;
    }
  } catch {
    // Web clipboard not available
  }

  // 3. Try React Native legacy Clipboard if bundled
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RN = require("react-native");
    if (RN.Clipboard && typeof RN.Clipboard.setString === "function") {
      RN.Clipboard.setString(content);
      return true;
    }
  } catch {
    // Legacy RN clipboard not available
  }

  // 4. Universal Fallback: Use native Share sheet which allows copying to clipboard on all Android & iOS devices
  try {
    await Share.share({
      message: content,
    });
    return true;
  } catch {
    // Share dismissed or cancelled
  }

  return false;
}
