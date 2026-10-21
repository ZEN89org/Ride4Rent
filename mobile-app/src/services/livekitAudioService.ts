import { NativeModules, PermissionsAndroid, Platform } from "react-native";
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

// Request the microphone when the user starts/answers a call, before signalling acceptance.
export const prepareVoiceCalling = async (): Promise<void> => {
  assertVoiceCallingAvailable();
  if (Platform.OS === "android") {
    const permission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
    const granted = await PermissionsAndroid.check(permission) ||
      await PermissionsAndroid.request(permission) === PermissionsAndroid.RESULTS.GRANTED;
    if (!granted) throw new Error("Microphone access is required for calls. Enable Microphone in your phone’s Ride4Rent app permissions, then try again.");
  }
};

let audioQueue: Promise<unknown> = Promise.resolve();
const serializeAudio = <T>(action: () => Promise<T>): Promise<T> => {
  const next = audioQueue.then(action, action);
  audioQueue = next.catch(() => {});
  return next;
};
const releaseAudio = async () => {
  const previous = room;
  room = null;
  try { await previous?.disconnect(); }
  finally { await nativeAudio?.AudioSession.stopAudioSession(); }
};

export const connectToLiveKitRoom = (url: string, token: string, onDisconnected?: () => void): Promise<{ connected: boolean }> => {
  assertVoiceCallingAvailable();
  if (!/^wss?:\/\/[^/]+/i.test(url) || !token?.trim()) throw new Error("The call server did not provide valid audio credentials. Please retry the call or contact support.");
  const attempt = ++generation;
  return serializeAudio(async () => {
    if (attempt !== generation) return { connected: false };
    await releaseAudio();
    try {
      if (Platform.OS !== "web") {
        nativeAudio = require("@livekit/react-native");
        if (!initialized) { nativeAudio!.registerGlobals(); initialized = true; }
        await nativeAudio!.AudioSession.startAudioSession();
        const outputs = await nativeAudio!.AudioSession.getAudioOutputs();
        const preferred = Platform.OS === "ios" ? "default" : ["bluetooth", "headset", "earpiece", "speaker"].find(output => outputs.includes(output));
        if (preferred && outputs.includes(preferred)) await nativeAudio!.AudioSession.selectAudioOutput(preferred);
      }
      if (attempt !== generation) { await releaseAudio(); return { connected: false }; }
      const { Room, RoomEvent, Track } = require("livekit-client") as typeof import("livekit-client");
      const nextRoom = new Room({ adaptiveStream: false, dynacast: false });
      room = nextRoom;
      if (Platform.OS === "web") {
        nextRoom.on(RoomEvent.TrackSubscribed, track => { if (track.kind === Track.Kind.Audio) document.body.appendChild(track.attach()); });
        nextRoom.on(RoomEvent.TrackUnsubscribed, track => track.detach().forEach(element => element.remove()));
      }
      let connected = false;
      nextRoom.on(RoomEvent.Disconnected, () => { if (connected && attempt === generation) onDisconnected?.(); });
      await nextRoom.connect(url, token, { websocketTimeout: 10000, peerConnectionTimeout: 15000 });
      if (attempt !== generation) { await releaseAudio(); return { connected: false }; }
      await nextRoom.localParticipant.setMicrophoneEnabled(true);
      connected = true;
      return { connected: true };
    } catch (error) {
      await releaseAudio().catch(() => {});
      throw error;
    }
  });
};

export const disconnectLiveKitRoom = (): Promise<void> => {
  generation++;
  return serializeAudio(releaseAudio);
};

export const setLiveKitMicrophoneMuted = async (muted: boolean): Promise<void> => {
  if (!room || room.state !== "connected") throw new Error("Call audio is still connecting.");
  await room.localParticipant.setMicrophoneEnabled(!muted);
};

export const setLiveKitSpeakerEnabled = async (enabled: boolean): Promise<void> => {
  if (!room || room.state !== "connected") throw new Error("Call audio is still connecting.");
  if (nativeAudio) await nativeAudio.AudioSession.selectAudioOutput(Platform.OS === "ios" ? (enabled ? "force_speaker" : "default") : (enabled ? "speaker" : "earpiece"));
};

export const isLiveKitConnected = (): boolean => room?.state === "connected";
