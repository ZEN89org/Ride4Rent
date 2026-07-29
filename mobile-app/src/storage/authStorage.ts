import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const FIRST_LAUNCH_KEY = 'first_launch';

// Token
export const saveToken = async (token: string) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const getToken = async () => {
  return await AsyncStorage.getItem(TOKEN_KEY);
};

export const removeToken = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
};

// User
export const saveUser = async (user: any) => {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = async () => {
  const user = await AsyncStorage.getItem(USER_KEY);

  return user ? JSON.parse(user) : null;
};

export const removeUser = async () => {
  await AsyncStorage.removeItem(USER_KEY);
};

// First Launch
export const setFirstLaunchComplete = async () => {
  await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'false');
};

export const isFirstLaunch = async () => {
  const value = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);

  return value === null;
};

// Developer Reset
export const resetFirstLaunch = async () => {

  await AsyncStorage.removeItem(FIRST_LAUNCH_KEY);
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
};

// Logout
export const clearAuth = async () => {
  await removeToken();
  await removeUser();
};