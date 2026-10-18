import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface FavoritesContextType {
  favorites: string[];
  isFavorite: (id: string | number) => boolean;
  toggleFavorite: (id: string | number) => Promise<void>;
}

const FAVORITES_STORAGE_KEY = "@ride4rent_favorites";

const FavoritesContext = createContext<FavoritesContextType>({
  favorites: [],
  isFavorite: () => false,
  toggleFavorite: async () => {},
});

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(FAVORITES_STORAGE_KEY)
      .then((stored) => {
        if (active && stored) setFavorites(JSON.parse(stored));
      })
      .catch((error) => console.error("Failed to load favorites", error));
    return () => {
      active = false;
    };
  }, []);

  const isFavorite = (id: string | number) => {
    return favorites.includes(String(id));
  };

  const toggleFavorite = async (id: string | number) => {
    const stringId = String(id);
    setFavorites((prev) => {
      const updated = prev.includes(stringId)
        ? prev.filter((item) => item !== stringId)
        : [...prev, stringId];

      AsyncStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(updated),
      ).catch((err) => console.error("Failed to save favorites", err));
      return updated;
    });
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        toggleFavorite,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);
