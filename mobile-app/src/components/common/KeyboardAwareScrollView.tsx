import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Keyboard, Platform, ScrollView as NativeScrollView, StyleSheet, TextInput, type ScrollViewProps } from "react-native";
import { keyboardScrollDelta } from "@/utils/keyboardVisibility";

// A focus event bubbles through nested scroll views. Only the closest one should scroll.
const handledFocus = new WeakSet<object>();
export type KeyboardAwareScrollView = NativeScrollView;

export const KeyboardAwareScrollView = forwardRef<NativeScrollView, ScrollViewProps>(function KeyboardAwareScrollView({
  children, contentContainerStyle, horizontal, onFocus, onBlur, onScroll, onLayout, onContentSizeChange,
  keyboardShouldPersistTaps = "handled", keyboardDismissMode = "on-drag", ...props
}, forwardedRef) {
  const scroll = useRef<NativeScrollView>(null);
  const focused = useRef<ReturnType<typeof TextInput.State.currentlyFocusedInput> | null>(null);
  const keyboardTop = useRef<number | null>(null);
  const offset = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [covered, setCovered] = useState(0);
  useImperativeHandle(forwardedRef, () => scroll.current!, []);

  const reveal = useCallback(() => {
    if (horizontal || Platform.OS === "web" || keyboardTop.current === null || !focused.current) return;
    const input = focused.current;
    if (input !== TextInput.State.currentlyFocusedInput()) return;
    scroll.current?.getNativeScrollRef()?.measureInWindow((_x, top, _width, height) => {
      const bottom = Math.min(top + height, keyboardTop.current ?? top + height);
      const overlap = Math.max(0, top + height - (keyboardTop.current ?? top + height));
      setCovered(previous => Math.abs(previous - overlap) > 2 ? overlap : previous);
      input.measureInWindow((_inputX, inputTop, _inputWidth, inputHeight) => {
        if (focused.current !== input || keyboardTop.current === null) return;
        const delta = keyboardScrollDelta(inputTop, inputHeight, top, bottom);
        if (Math.abs(delta) > 2) scroll.current?.scrollTo({ y: Math.max(0, offset.current + delta), animated: true });
      });
    });
  }, [horizontal]);
  const scheduleReveal = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(reveal, 120);
  }, [reveal]);
  useEffect(() => {
    if (horizontal || Platform.OS === "web") return;
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow", event => {
      keyboardTop.current = event.endCoordinates.screenY;
      scheduleReveal();
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => { keyboardTop.current = null; setCovered(0); });
    return () => { show.remove(); hide.remove(); if (timer.current) clearTimeout(timer.current); };
  }, [horizontal, scheduleReveal]);
  const flat = StyleSheet.flatten(contentContainerStyle);
  const basePadding = flat?.paddingBottom ?? flat?.paddingVertical ?? flat?.padding ?? 0;
  return <NativeScrollView {...props} ref={scroll} horizontal={horizontal}
    keyboardShouldPersistTaps={keyboardShouldPersistTaps} keyboardDismissMode={keyboardDismissMode}
    contentContainerStyle={[contentContainerStyle, !horizontal && covered > 0 && { paddingBottom: (typeof basePadding === "number" ? basePadding : 0) + covered + 24 }]}
    scrollEventThrottle={props.scrollEventThrottle ?? 16}
    onFocus={event => {
      onFocus?.(event);
      if (horizontal || Platform.OS === "web" || handledFocus.has(event)) return;
      handledFocus.add(event);
      focused.current = TextInput.State.currentlyFocusedInput();
      scheduleReveal();
    }}
    onBlur={event => { onBlur?.(event); focused.current = null; }}
    onScroll={event => { offset.current = event.nativeEvent.contentOffset.y; onScroll?.(event); }}
    onLayout={event => { onLayout?.(event); scheduleReveal(); }}
    onContentSizeChange={(width, height) => { onContentSizeChange?.(width, height); scheduleReveal(); }}
  >{children}</NativeScrollView>;
});
