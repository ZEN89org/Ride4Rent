import {
  createContext,
  ReactNode,
  useEffect,
  useState,
} from "react";

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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
