import { NativeModules, Platform } from "react-native";
import { isRunningInExpoGo } from "expo";
import type { Room } from "livekit-client";

let room: Room | null = null;
let nativeAudio: typeof import("@livekit/react-native") | null = null;
let generation = 0;
let initialized = false;

export const assertVoiceCallingAvailable = () => {
  if (Platform.OS !== "web" && isRunningInExpoGo()) {
    throw new Error("Voice calling requires a Ride4Rent development or production build. Expo Go cannot transmit call audio.");
  }
  if (Platform.OS !== "web" && (!NativeModules.WebRTCModule || !NativeModules.LivekitReactNativeModule)) {
    throw new Error("This installed app is missing native call audio. Install a freshly rebuilt Ride4Rent development or release app. Restarting Expo or installing JavaScript packages alone cannot add it.");
  }
};

export const connectToLiveKitRoom = async (url: string, token: string): Promise<{ connected: boolean }> => {
  assertVoiceCallingAvailable();
  const attempt = ++generation;
  await room?.disconnect();
  if (Platform.OS !== "web") {
    nativeAudio = require("@livekit/react-native");
    if (!initialized) { nativeAudio!.registerGlobals(); initialized = true; }
    await nativeAudio!.AudioSession.startAudioSession();
    const outputs = await nativeAudio!.AudioSession.getAudioOutputs();
    const preferred = Platform.OS === "ios" ? "default" : "earpiece";
    if (outputs.includes(preferred)) await nativeAudio!.AudioSession.selectAudioOutput(preferred);
  }
  if (attempt !== generation) { await nativeAudio?.AudioSession.stopAudioSession(); return { connected: false }; }
  const { Room, RoomEvent, Track } = require("livekit-client") as typeof import("livekit-client");
  const nextRoom = new Room({ adaptiveStream: false, dynacast: false });
  if (Platform.OS === "web") {
    nextRoom.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) document.body.appendChild(track.attach());
    });
    nextRoom.on(RoomEvent.TrackUnsubscribed, (track) => track.detach().forEach((element) => element.remove()));
  }
  room = nextRoom;
  try {
    await nextRoom.connect(url, token);
    if (attempt !== generation) { await nextRoom.disconnect(); return { connected: false }; }
    await nextRoom.localParticipant.setMicrophoneEnabled(true);
    return { connected: true };
  } catch (error) {
    await nextRoom.disconnect();
    if (attempt === generation) { room = null; await nativeAudio?.AudioSession.stopAudioSession(); }
    throw error;
  }
};

export const disconnectLiveKitRoom = async (): Promise<void> => {
  generation++;
  const previous = room;
  room = null;
  await previous?.disconnect();
  await nativeAudio?.AudioSession.stopAudioSession();
};

export const setLiveKitMicrophoneMuted = async (muted: boolean): Promise<void> => {
  await room?.localParticipant.setMicrophoneEnabled(!muted);
};

export const setLiveKitSpeakerEnabled = async (enabled: boolean): Promise<void> => {
  if (nativeAudio) await nativeAudio.AudioSession.selectAudioOutput(Platform.OS === "ios" ? (enabled ? "force_speaker" : "default") : (enabled ? "speaker" : "earpiece"));
};

export const isLiveKitConnected = (): boolean => room?.state === "connected";
