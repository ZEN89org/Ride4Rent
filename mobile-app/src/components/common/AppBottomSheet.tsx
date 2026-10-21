import {
  ReactNode,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";
import { ToastOverlayContext } from "@/context/ToastOverlayContext";
import { AppToast } from "./AppToast";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export type AppBottomSheetProps = {
  /** Controls visibility. Set to false to play the closing sequence. */
  visible: boolean;
  /** Called when the user asks to close (backdrop tap, Android back, drag down). The parent should set `visible` to false. */
  onClose: () => void;
  /** Called once the closing sequence has fully finished and the modal is gone. */
  onClosed?: () => void;
  children: ReactNode;
  /** Extra style for the sheet card (padding, maxHeight, background...). */
  sheetStyle?: StyleProp<ViewStyle>;
  /** Show the small grab handle at the top of the sheet. Default: true. */
  showHandle?: boolean;
  /** Tapping the backdrop closes the sheet. Default: true. */
  dismissOnBackdrop?: boolean;
  /** "bottom" (default) docks the card to the bottom edge, "center" shows it as a dialog. */
  position?: "bottom" | "center";
  /** Keep inputs accessible above the keyboard. Default: true. */
  avoidKeyboard?: boolean;
  /** Optional title heading displayed below the handle */
  title?: string;
  /** When true, renders as an absolute overlay View instead of a native Android Dialog/Modal to prevent nested modal conflicts. */
  renderAsOverlay?: boolean;
};

/**
 * Universal animated bottom sheet used across Ride4Rent.
 *
 * Opening: Backdrop smoothly fades in while the sheet card springs/slides up from the bottom.
 * Closing: Sheet slides down while the backdrop fades out simultaneously.
 * Gestures: Supports downward drag on handle/sheet to dismiss.
 */
export function AppBottomSheet({
  visible,
  onClose,
  onClosed,
  children,
  sheetStyle,
  showHandle = true,
  dismissOnBackdrop = true,
  position = "bottom",
  avoidKeyboard = true,
  title,
  renderAsOverlay = false,
}: AppBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const toast = useContext(ToastOverlayContext);
  const [mounted, setMounted] = useState(visible);
  // A newly opened sheet must render before its entry animation can run.
  if (visible && !mounted) setMounted(true);

  const backdropOpacity = useState(() => new Animated.Value(0))[0];
  const sheetTranslateY = useState(() => new Animated.Value(SCREEN_HEIGHT))[0];
  const sheetScale = useState(() => new Animated.Value(0.94))[0];
  const sheetOpacity = useState(() => new Animated.Value(0))[0];

  const onClosedRef = useRef(onClosed);
  useEffect(() => {
    onClosedRef.current = onClosed;
  }, [onClosed]);

  const closeWithAnimation = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      position === "bottom"
        ? Animated.timing(sheetTranslateY, {
            toValue: SCREEN_HEIGHT,
            duration: 220,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          })
        : Animated.parallel([
            Animated.timing(sheetScale, {
              toValue: 0.94,
              duration: 180,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(sheetOpacity, {
              toValue: 0,
              duration: 180,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
        onClosedRef.current?.();
      }
    });
  }, [backdropOpacity, sheetTranslateY, sheetScale, sheetOpacity, position]);

  useEffect(() => {
    if (visible) {
      sheetTranslateY.setValue(SCREEN_HEIGHT);
      sheetScale.setValue(0.94);
      sheetOpacity.setValue(0);
      backdropOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        position === "bottom"
          ? Animated.spring(sheetTranslateY, {
              toValue: 0,
              tension: 65,
              friction: 11,
              useNativeDriver: true,
            })
          : Animated.parallel([
              Animated.spring(sheetScale, {
                toValue: 1,
                tension: 70,
                friction: 10,
                useNativeDriver: true,
              }),
              Animated.timing(sheetOpacity, {
                toValue: 1,
                duration: 200,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
            ]),
      ]).start();
    } else if (mounted) {
      closeWithAnimation();
    }
  }, [
    visible,
    mounted,
    backdropOpacity,
    sheetTranslateY,
    sheetScale,
    sheetOpacity,
    position,
    closeWithAnimation,
  ]);

  const panResponder = useMemo(
    () =>
      position === "bottom"
        ? PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) =>
              gestureState.dy > 5,
            onPanResponderMove: (_, gestureState) => {
              if (gestureState.dy > 0) {
                sheetTranslateY.setValue(gestureState.dy);
              }
            },
            onPanResponderRelease: (_, gestureState) => {
              if (gestureState.dy > 100 || gestureState.vy > 0.8) {
                onClose();
              } else {
                Animated.spring(sheetTranslateY, {
                  toValue: 0,
                  tension: 65,
                  friction: 11,
                  useNativeDriver: true,
                }).start();
              }
            },
          })
        : null,
    [position, sheetTranslateY, onClose],
  );

  if (!mounted) {
    return null;
  }

  const WrapperComponent = avoidKeyboard ? KeyboardAvoidingView : View;
  const wrapperProps = avoidKeyboard
    ? {
        behavior: (Platform.OS === "ios" ? "padding" : "height") as any,
        keyboardVerticalOffset: Platform.OS === "ios" ? 10 : 0,
        style: [
          styles.keyboardLayer,
          position === "center" ? styles.center : styles.bottom,
        ],
      }
    : {
        style: [
          styles.keyboardLayer,
          position === "center" ? styles.center : styles.bottom,
        ],
      };

  const sheetContent = (
    <View style={styles.root}>
      {/* Animated backdrop with smooth opacity */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissOnBackdrop ? onClose : undefined}
        />
      </Animated.View>

      <WrapperComponent pointerEvents="box-none" {...(wrapperProps as any)}>
        <Animated.View
          style={[
            position === "center" ? styles.dialog : styles.sheet,
            position === "bottom" && {
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              transform: [{ translateY: sheetTranslateY }],
            },
            position === "center" && {
              opacity: sheetOpacity,
              transform: [{ scale: sheetScale }],
            },
            sheetStyle,
          ]}
        >
          {/* Grab handle for bottom sheet with touch responder */}
          {showHandle && position === "bottom" ? (
            <View
              style={styles.handleContainer}
              {...(panResponder ? panResponder.panHandlers : {})}
            >
              <View style={styles.handle} />
            </View>
          ) : null}

          {title ? <Text style={styles.sheetTitle}>{title}</Text> : null}
          {children}
        </Animated.View>
      </WrapperComponent>
      {toast ? <AppToast {...toast} /> : null}
    </View>
  );

  if (renderAsOverlay) {
    return (
      <View
        style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}
        pointerEvents="box-none"
      >
        {sheetContent}
      </View>
    );
  }

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {sheetContent}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
  },
  keyboardLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottom: {
    justifyContent: "flex-end",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: "92%",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  dialog: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    maxHeight: "85%",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 24,
  },
  handleContainer: {
    width: "100%",
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  handle: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
  },
  sheetTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
    marginBottom: 14,
  },
});

export default AppBottomSheet;
