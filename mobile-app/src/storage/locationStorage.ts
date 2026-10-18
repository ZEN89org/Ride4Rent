import AsyncStorage from "@react-native-async-storage/async-storage";
import { isInServiceArea, SERVICE_AREA_ERROR } from "@/utils/serviceArea";

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
  if (!isInServiceArea(location.latitude, location.longitude)) throw new Error(SERVICE_AREA_ERROR);
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

  try {
    const location = JSON.parse(storedLocation);
    if (location && isInServiceArea(location.latitude, location.longitude)) return location;
  } catch { /* Discard corrupt or out-of-area locations from older app versions. */ }
  await AsyncStorage.removeItem(LOCATION_KEY);
  return null;
};

export const hasConfirmedLocation = async () => {
  const location = await getSavedLocation();

  return location?.confirmed === true;
};

export const clearSavedLocation = async () => {
  await AsyncStorage.removeItem(LOCATION_KEY);
};
