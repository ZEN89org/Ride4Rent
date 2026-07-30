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
} from "@/storage/authStorage";

import * as authService from "@/services/authService";

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

export function AuthProvider({

  children,

}: Props) {

  const [user, setUser] = useState<any>(null);

  const [token, setToken] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    loadUser();

  }, []);

  const loadUser = async () => {

    const storedToken = await getToken();

    const storedUser = await getUser();

    setToken(storedToken);

    setUser(storedUser);

    setLoading(false);

  };

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

  } catch (error) {}

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
