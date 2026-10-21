import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Platform, View } from "react-native";

// Constrain the entire Android chat to the keyboard's actual screen position.
// This works whether the native window resizes or draws behind the keyboard.
export function useChatKeyboardFrame() {
  const rootRef = useRef<View>(null);
  const [frame, setFrame] = useState({ top: 0, height: 0 });
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const measure = useCallback(() => {
    rootRef.current?.measureInWindow((_x, top, _width, height) => {
      setFrame((previous) => previous.top === top && previous.height === height ? previous : { top, height });
    });
  }, []);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardTop(event.endCoordinates.screenY);
      measure();
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardTop(null));
    return () => { show.remove(); hide.remove(); };
  }, [measure]);
  const height = Platform.OS === "android" && keyboardTop !== null && frame.height > 0
    ? Math.max(0, Math.min(frame.height, keyboardTop - frame.top))
    : null;
  return {
    rootRef,
    measure,
    keyboardVisible: keyboardTop !== null,
    frameStyle: height !== null ? { flex: 0, height } : { flex: 1 },
  };
}
