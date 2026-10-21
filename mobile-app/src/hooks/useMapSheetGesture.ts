import { useMemo } from "react";
import { LayoutAnimation, PanResponder } from "react-native";

export function useMapSheetGesture(setExpanded: (value: boolean) => void) {
  return useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dy) < 20) return;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpanded(gesture.dy < 0);
    },
  }).panHandlers, [setExpanded]);
}
