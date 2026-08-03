import AsyncStorage from "@react-native-async-storage/async-storage";

const LOCATION_KEY = "@ride4rent_location";

export interface SavedLocation {
  latitude: number;
  longitude: number;
  address: string;
  confirmed: boolean;
}

export const saveLocation = async (
  location: SavedLocation
) => {
  await AsyncStorage.setItem(
    LOCATION_KEY,
    JSON.stringify(location)
  );
};

export const getSavedLocation = async (): Promise<
  SavedLocation | null
> => {
  const storedLocation =
    await AsyncStorage.getItem(LOCATION_KEY);

  if (!storedLocation) {
    return null;
  }

  return JSON.parse(storedLocation);
};

export const hasConfirmedLocation = async () => {
  const location = await getSavedLocation();

  return location?.confirmed === true;
};

export const clearSavedLocation = async () => {
  await AsyncStorage.removeItem(LOCATION_KEY);
};
