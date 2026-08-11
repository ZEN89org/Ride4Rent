  import {
  createContext,
  ReactNode,
  useEffect,
  useState,
} from "react";

  import {
  clearAuth,
  getToken,
  getUser,
  saveToken,
  saveUser,
} from "@/features/auth/storage/authStorage";

  import * as authService from "@/features/auth/services/authService";

  interface AuthContextType {
    user: any;
    token: string | null;
    loading: boolean;
    isAuthenticated: boolean;
    isGuest: boolean;
    login: (user: any, token: string) => Promise<void>;
    logout: () => Promise<void>;
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
          const storedUser = await getUser();

          if (!mounted) {
            return;
          }

          setToken(storedToken);
          setUser(storedUser);
        } catch (error) {
          console.error(
            "Failed to load authentication:",
            error
          );
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

    return (
      <AuthContext.Provider
        value={{
          user,
          token,
          loading,
          isAuthenticated: !!token,
          isGuest: !token,
          login,
          logout,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }
