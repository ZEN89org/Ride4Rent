import Constants, { ExecutionEnvironment } from "expo-constants";
import { Room, RoomEvent, Track } from "livekit-client";

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let activeRoom: Room | null = null;
let globalsRegistered = false;

/**
 * Safely registers native WebRTC globals only when running outside of Expo Go.
 */
export const ensureLiveKitGlobals = (): boolean => {
  if (isExpoGo) {
    return false;
  }
  if (globalsRegistered) return true;

  try {
    const { registerGlobals } = require("@livekit/react-native");
    registerGlobals();
    globalsRegistered = true;
    return true;
  } catch (error) {
    console.warn("LiveKit native globals not available:", error);
    return false;
  }
};

/**
 * Connect to a LiveKit audio room using the JWT token and WebSocket URL.
 */
export const connectToLiveKitRoom = async (
  url: string,
  token: string
): Promise<Room | null> => {
  if (isExpoGo) {
    console.log("[LiveKit] Running in Expo Go: Audio streaming simulated. Use Development Build for full WebRTC mic streaming.");
    return null;
  }

  const hasNative = ensureLiveKitGlobals();
  if (!hasNative) {
    console.warn("[LiveKit] Native WebRTC not found. Audio streaming requires a Development Build.");
    return null;
  }

  try {
    if (activeRoom) {
      try {
        await activeRoom.disconnect();
      } catch (e) {
        // ignore
      }
      activeRoom = null;
    }

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      if (track.kind === Track.Kind.Audio) {
        console.log(`[LiveKit] Subscribed to remote audio from: ${participant.identity}`);
      }
    });

    room.on(RoomEvent.Disconnected, () => {
      console.log("[LiveKit] Room disconnected");
      activeRoom = null;
    });

    console.log(`[LiveKit] Connecting to ${url}...`);
    await room.connect(url, token);

    // Turn microphone on for voice call
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
      console.log("[LiveKit] Local microphone enabled successfully");
    } catch (micErr) {
      console.warn("[LiveKit] Error enabling microphone:", micErr);
    }

    activeRoom = room;
    return room;
  } catch (err) {
    console.error("[LiveKit] Failed to connect to room:", err);
    return null;
  }
};

/**
 * Disconnect and release the active LiveKit room session.
 */
export const disconnectLiveKitRoom = async (): Promise<void> => {
  if (activeRoom) {
    try {
      await activeRoom.disconnect();
    } catch (e) {
      // ignore
    } finally {
      activeRoom = null;
    }
  }
};

/**
 * Toggle the local microphone mute state in the active LiveKit session.
 */
export const setLiveKitMicrophoneMuted = async (muted: boolean): Promise<void> => {
  if (activeRoom?.localParticipant) {
    try {
      await activeRoom.localParticipant.setMicrophoneEnabled(!muted);
    } catch (e) {
      console.warn("[LiveKit] Error setting mic state:", e);
    }
  }
};

/**
 * Returns true if an active room connection is established.
 */
export const isLiveKitConnected = (): boolean => {
  return Boolean(activeRoom && activeRoom.state === "connected");
};
