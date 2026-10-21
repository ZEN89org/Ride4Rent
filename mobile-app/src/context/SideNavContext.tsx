import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import { usePathname } from "expo-router";
import { useAuth } from "@/features/auth/hooks/useAuth";

const { width } = Dimensions.get("window");

export const SIDE_NAV_WIDTH = Math.min(width * 0.82, 340);

interface SideNavActionsContextType {
  openSideNav: () => void;
  closeSideNav: (immediate?: boolean) => void;
  closeImmediate: () => void;
}

interface SideNavContextType extends SideNavActionsContextType {
  isVisible: boolean;
  isSettled: boolean;
  animation: Animated.Value;
}

const SideNavContext = createContext<SideNavContextType | null>(null);
const SideNavActionsContext = createContext<SideNavActionsContextType | null>(null);

interface SideNavProviderProps {
  children: ReactNode;
}

export function SideNavProvider({ children }: SideNavProviderProps) {
  const pathname = usePathname();
  const { token } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isSettled, setIsSettled] = useState(false);
  const [animation] = useState(() => new Animated.Value(0));
  const [navigationScope, setNavigationScope] = useState({ pathname, token });
  // Reset before children render so a returning screen cannot flash an old drawer.
  if (navigationScope.pathname !== pathname || navigationScope.token !== token) {
    setNavigationScope({ pathname, token });
    setIsVisible(false);
    setIsSettled(false);
  }

  const openSideNav = useCallback(() => {
    animation.stopAnimation();
    animation.setValue(0);
    setIsSettled(false);
    setIsVisible(true);
    Animated.timing(animation, {
      toValue: 1,
      duration: 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        animation.setValue(1);
        setIsSettled(true);
      }
    });
  }, [animation]);

  const closeSideNav = useCallback((immediate = false) => {
    animation.stopAnimation();
    setIsSettled(false);
    if (immediate) {
      animation.setValue(0);
      setIsVisible(false);
      return;
    }
    Animated.timing(animation, {
      toValue: 0,
      duration: 120,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        animation.setValue(0);
        setIsVisible(false);
      }
    });
  }, [animation]);

  const closeImmediate = useCallback(() => closeSideNav(true), [closeSideNav]);

  // The provider survives screen changes, so drawer state must not follow the
  // user into a new route or a different authenticated session.
  useEffect(() => {
    animation.stopAnimation();
    animation.setValue(0);
  }, [pathname, token, animation]);

  const actionsValue = useMemo<SideNavActionsContextType>(
    () => ({
      openSideNav,
      closeSideNav,
      closeImmediate,
    }),
    [openSideNav, closeSideNav, closeImmediate]
  );

  const value = useMemo<SideNavContextType>(
    () => ({
      isVisible,
      isSettled,
      animation,
      openSideNav,
      closeSideNav,
      closeImmediate,
    }),
    [animation, closeImmediate, closeSideNav, isSettled, isVisible, openSideNav]
  );

  return (
    <SideNavActionsContext.Provider value={actionsValue}>
      <SideNavContext.Provider value={value}>
        {children}
      </SideNavContext.Provider>
    </SideNavActionsContext.Provider>
  );
}

export function useSideNav() {
  const context = useContext(SideNavContext);

  if (!context) {
    throw new Error("useSideNav must be used inside SideNavProvider");
  }

  return context;
}

export function useSideNavActions() {
  const context = useContext(SideNavActionsContext);

  if (!context) {
    throw new Error("useSideNavActions must be used inside SideNavProvider");
  }

  return context;
}

