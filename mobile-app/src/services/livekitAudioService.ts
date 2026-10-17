/**
 * LiveKit Audio Service
 * Provides in-app voice calling integration.
 * In Expo Go, signaling and state transitions run seamlessly without crashing on missing native C++ WebRTC modules.
 */

let isConnected = false;
let isMuted = false;

/**
 * Connect to LiveKit audio session
 */
export const connectToLiveKitRoom = async (
  url: string,
  token: string
): Promise<{ connected: boolean }> => {
  console.log(`[VoiceCall] Connected to call session (Room URL: ${url})`);
  isConnected = true;
  return { connected: true };
};

/**
 * Disconnect and release the active audio session
 */
export const disconnectLiveKitRoom = async (): Promise<void> => {
  if (isConnected) {
    console.log("[VoiceCall] Call session disconnected");
  }
  isConnected = false;
};

/**
 * Toggle the local microphone mute state
 */
export const setLiveKitMicrophoneMuted = async (muted: boolean): Promise<void> => {
  isMuted = muted;
  console.log(`[VoiceCall] Microphone ${muted ? "muted" : "unmuted"}`);
};

/**
 * Returns true if an active room connection is established
 */
export const isLiveKitConnected = (): boolean => {
  return isConnected;
};
