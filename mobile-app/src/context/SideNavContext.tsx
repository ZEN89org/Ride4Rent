import {
    createContext,
    ReactNode,
    useContext,
    useState,
} from "react";
import {
    Animated,
    Dimensions,
} from "react-native";

const { width } =
  Dimensions.get("window");

export const SIDE_NAV_WIDTH =
  Math.min(width * 0.82, 340);

interface SideNavContextType {
  isVisible: boolean;
  animation: Animated.Value;
  openSideNav: () => void;
  closeSideNav: () => void;
}

const SideNavContext =
  createContext<SideNavContextType | null>(
    null
  );

interface SideNavProviderProps {
  children: ReactNode;
}

export function SideNavProvider({
  children,
}: SideNavProviderProps) {
  const [isVisible, setIsVisible] =
    useState(false);

  const [animation] = useState(
    () =>
      new Animated.Value(
        SIDE_NAV_WIDTH
      )
  );

  const openSideNav = () => {
    animation.stopAnimation();

    setIsVisible(true);

    Animated.timing(animation, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  };

  const closeSideNav = () => {
    animation.stopAnimation();

    Animated.timing(animation, {
      toValue: SIDE_NAV_WIDTH,
      duration: 280,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsVisible(false);
      }
    });
  };

  const value: SideNavContextType = {
    isVisible,
    animation,
    openSideNav,
    closeSideNav,
  };

  return (
    <SideNavContext.Provider
      value={value}
    >
      {children}
    </SideNavContext.Provider>
  );
}

export function useSideNav() {
  const context =
    useContext(SideNavContext);

  if (!context) {
    throw new Error(
      "useSideNav must be used inside SideNavProvider"
    );
  }

  return context;
}
