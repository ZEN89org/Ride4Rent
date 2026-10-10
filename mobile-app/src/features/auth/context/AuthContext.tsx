import {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import { AppState } from "react-native";

import {
  clearAuth,
  getToken,
  saveToken,
  saveUser
} from "@/features/auth/storage/authStorage";

import * as authService from "@/features/auth/services/authService";

interface AuthContextType {
  user: any;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  isRenter: boolean;
  isOperator: boolean;
  isOperatorPending: boolean;
  isOperatorActive: boolean;
  isOperatorRejected: boolean;
  login: (user: any, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: any) => Promise<void>;
  refreshUser: () => Promise<any>;
}

export const AuthContext =
  createContext<AuthContextType>(
    {} as AuthContextType
  );

interface Props {
  children: ReactNode;
}

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<any>(null);

  const [token, setToken] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let mounted = true;

const initializeAuth = async () => {
  try {
    const storedToken = await getToken();

    if (!storedToken) {
      if (mounted) {
        setToken(null);
        setUser(null);
      }

      return;
    }

    setToken(storedToken);

    try {
      const response =
        await authService.getCurrentUser();

      const currentUser =
        response?.data ?? response?.user;

      if (!currentUser) {
        throw new Error(
          "Invalid user response."
        );
      }

      await saveUser(currentUser);

      if (mounted) {
        setUser(currentUser);
      }
    } catch (error) {
      console.log(
        "Stored authentication is invalid. Clearing session."
      );

      await clearAuth();

      if (mounted) {
        setToken(null);
        setUser(null);
      }
    }
  } catch (error) {
    console.error(
      "Failed to load authentication:",
      error
    );

    if (mounted) {
      setToken(null);
      setUser(null);
    }
  } finally {
    if (mounted) {
      setLoading(false);
    }
  }
};

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (
    userData: any,
    tokenData: string
  ) => {
    await saveToken(tokenData);
    await saveUser(userData);

    setToken(tokenData);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.log("Logout API error:", error);
    }

    await clearAuth();

    setUser(null);
    setToken(null);
  };

  const updateUser = async (updatedUserData: any) => {
    const mergedUser = { ...user, ...updatedUserData };
    await saveUser(mergedUser);
    setUser(mergedUser);
  };

  const refreshUser = useCallback(async () => {
    try {
      const response = await authService.getCurrentUser();
      const currentUser = response?.data ?? response?.user;
      if (currentUser) {
        setUser((prevUser: any) => {
          if (
            prevUser &&
            prevUser.id === currentUser.id &&
            prevUser.account_status === currentUser.account_status &&
            prevUser.license_verification_status === currentUser.license_verification_status &&
            prevUser.role === currentUser.role &&
            prevUser.first_name === currentUser.first_name &&
            prevUser.last_name === currentUser.last_name &&
            prevUser.profile_photo === currentUser.profile_photo &&
            JSON.stringify(prevUser.operatorProfile || prevUser.operator_profile || {}) ===
              JSON.stringify(currentUser.operatorProfile || currentUser.operator_profile || {})
          ) {
            return prevUser;
          }
          saveUser(currentUser).catch(() => {});
          return currentUser;
        });
        return currentUser;
      }
    } catch (error) {
      console.log("Failed to refresh user:", error);
    }
    return null;
  }, []);

  // Proactive background polling when account or driver license is pending moderation
  useEffect(() => {
    const isPending =
      !!token &&
      (user?.account_status === "pending" ||
        user?.license_verification_status === "pending");

    if (!isPending) return;

    const intervalId = setInterval(() => {
      refreshUser().catch(() => {});
    }, 10000);

    return () => clearInterval(intervalId);
  }, [token, user?.account_status, user?.license_verification_status, refreshUser]);

  // Sync latest user standing whenever app returns to foreground/active
  useEffect(() => {
    if (!token) return;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        refreshUser().catch(() => {});
      }
    });

    return () => {
      subscription.remove();
    };
  }, [token]);

  const isAuthenticated = !!token;
  const isGuest = !token;

  const isRenter =
    isAuthenticated &&
    user?.role === "customer";

  const isOperator =
    isAuthenticated &&
    user?.role === "operator";

  const isOperatorPending =
    isOperator &&
    user?.account_status === "pending";

  const isOperatorActive =
    isOperator &&
    user?.account_status === "active";

  const isOperatorRejected =
    isOperator &&
    user?.account_status === "rejected";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        isGuest,
        isRenter,
        isOperator,
        isOperatorPending,
        isOperatorActive,
        isOperatorRejected,
        login,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
