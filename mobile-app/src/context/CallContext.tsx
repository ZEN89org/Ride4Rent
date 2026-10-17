import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  ActiveCallData,
  answerCall,
  CallUser,
  checkActiveCall,
  declineCall,
  endCall,
  initiateCall,
} from "@/services/callService";
import {
  connectToLiveKitRoom,
  disconnectLiveKitRoom,
  setLiveKitMicrophoneMuted,
} from "@/services/livekitAudioService";

interface CallContextType {
  activeCall: ActiveCallData | null;
  callRole: "caller" | "receiver" | null;
  callDuration: number;
  isMuted: boolean;
  isSpeaker: boolean;
  startCall: (targetUser: CallUser) => Promise<void>;
  answerCurrentCall: () => Promise<void>;
  declineCurrentCall: () => Promise<void>;
  endCurrentCall: () => Promise<void>;
  toggleMute: () => void;
  toggleSpeaker: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const formatCallTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeCall, setActiveCall] = useState<ActiveCallData | null>(null);
  const [callRole, setCallRole] = useState<"caller" | "receiver" | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callStatusText, setCallStatusText] = useState("");

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isActionInProgressRef = useRef(false);

  // Pulse animation for ringing
  useEffect(() => {
    if (activeCall && (activeCall.status === "calling" || activeCall.status === "ringing")) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [activeCall?.status]);

  // Vibrate phone when receiving an incoming call
  useEffect(() => {
    if (activeCall && callRole === "receiver" && activeCall.status === "ringing") {
      Vibration.vibrate([0, 600, 1000], true);
      return () => {
        Vibration.cancel();
      };
    } else {
      Vibration.cancel();
    }
  }, [activeCall?.status, callRole]);

  // Duration timer when call is accepted
  useEffect(() => {
    let timer: any = null;
    if (activeCall && activeCall.status === "accepted") {
      const startTime = activeCall.started_at ? new Date(activeCall.started_at).getTime() : Date.now();
      setCallDuration(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));

      timer = setInterval(() => {
        setCallDuration(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeCall?.status, activeCall?.started_at]);

  // Connect to LiveKit WebRTC audio room when call is accepted
  useEffect(() => {
    if (
      activeCall &&
      activeCall.status === "accepted" &&
      activeCall.livekit_url &&
      activeCall.livekit_token
    ) {
      connectToLiveKitRoom(activeCall.livekit_url, activeCall.livekit_token);
    } else if (!activeCall || activeCall.status !== "accepted") {
      disconnectLiveKitRoom();
    }
    return () => {
      disconnectLiveKitRoom();
    };
  }, [activeCall?.status, activeCall?.livekit_token, activeCall?.livekit_url]);

  // Background polling for incoming calls / status synchronization
  useEffect(() => {
    if (!user) {
      setActiveCall(null);
      setCallRole(null);
      return;
    }

    const pollInterval = setInterval(async () => {
      if (isActionInProgressRef.current) return;
      try {
        const res = await checkActiveCall();
        if (res.call) {
          setActiveCall((prev) => {
            if (!prev) {
              setCallRole(res.role);
              return res.call;
            }
            // If status changed to accepted or ended
            if (prev.status !== res.call!.status) {
              return res.call;
            }
            return prev;
          });
          setCallRole(res.role);
        } else {
          // If a call was active and server returned null (e.g. ended by other party)
          setActiveCall((prev) => {
            if (prev && prev.status !== "ended" && prev.status !== "declined") {
              setCallStatusText("Call Ended");
              setTimeout(() => {
                setActiveCall(null);
                setCallRole(null);
                setCallStatusText("");
              }, 1200);
            }
            return prev;
          });
        }
      } catch (e) {
        // silent background check
      }
    }, activeCall ? 1500 : 3500); // Poll faster (1.5s) during active call for instant sync

    return () => clearInterval(pollInterval);
  }, [user, activeCall?.id]);

  const startCall = async (targetUser: CallUser) => {
    if (!user || isActionInProgressRef.current) return;
    try {
      isActionInProgressRef.current = true;
      setCallStatusText("Calling...");
      const newCall = await initiateCall(targetUser.id);
      setActiveCall(newCall);
      setCallRole("caller");
      setIsMuted(false);
      setIsSpeaker(false);
    } catch (e: any) {
      console.log("Error starting call:", e?.response?.data?.message || e?.message || "Failed");
      setCallStatusText("Call Failed");
      setTimeout(() => {
        setActiveCall(null);
        setCallRole(null);
        setCallStatusText("");
      }, 1500);
    } finally {
      isActionInProgressRef.current = false;
    }
  };

  const answerCurrentCall = async () => {
    if (!activeCall || isActionInProgressRef.current) return;
    try {
      isActionInProgressRef.current = true;
      Vibration.cancel();
      setCallStatusText("Connecting...");
      const updated = await answerCall(activeCall.id);
      setActiveCall(updated);
      setCallStatusText("");
    } catch (e: any) {
      console.log("Error answering call:", e?.response?.data?.message || e?.message || "Failed");
      setActiveCall(null);
      setCallRole(null);
    } finally {
      isActionInProgressRef.current = false;
    }
  };

  const declineCurrentCall = async () => {
    if (!activeCall || isActionInProgressRef.current) return;
    try {
      isActionInProgressRef.current = true;
      Vibration.cancel();
      setCallStatusText("Call Declined");
      await declineCall(activeCall.id);
      disconnectLiveKitRoom();
      setTimeout(() => {
        setActiveCall(null);
        setCallRole(null);
        setCallStatusText("");
      }, 1000);
    } catch (e) {
      disconnectLiveKitRoom();
      setActiveCall(null);
      setCallRole(null);
    } finally {
      isActionInProgressRef.current = false;
    }
  };

  const endCurrentCall = async () => {
    if (!activeCall || isActionInProgressRef.current) return;
    try {
      isActionInProgressRef.current = true;
      Vibration.cancel();
      setCallStatusText("Call Ended");
      await endCall(activeCall.id);
      disconnectLiveKitRoom();
      setTimeout(() => {
        setActiveCall(null);
        setCallRole(null);
        setCallStatusText("");
      }, 1000);
    } catch (e) {
      disconnectLiveKitRoom();
      setActiveCall(null);
      setCallRole(null);
    } finally {
      isActionInProgressRef.current = false;
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      setLiveKitMicrophoneMuted(next);
      return next;
    });
  };
  const toggleSpeaker = () => setIsSpeaker((prev) => !prev);

  // Determine other user details based on role
  const otherUser =
    activeCall && callRole === "caller"
      ? activeCall.receiver
      : activeCall?.caller;

  const displayName = otherUser?.business_name || otherUser?.name || "User";
  const displayRole = otherUser?.role === "operator" ? "Vehicle Host" : "Renter";

  return (
    <CallContext.Provider
      value={{
        activeCall,
        callRole,
        callDuration,
        isMuted,
        isSpeaker,
        startCall,
        answerCurrentCall,
        declineCurrentCall,
        endCurrentCall,
        toggleMute,
        toggleSpeaker,
      }}
    >
      {children}

      {/* In-App Fullscreen Call Overlay Modal */}
      {activeCall && (
        <Modal
          visible={Boolean(activeCall)}
          animationType="slide"
          transparent={false}
          statusBarTranslucent
          onRequestClose={() => {
            // Prevent accidental back press closing call without hanging up
            endCurrentCall();
          }}
        >
          <View style={styles.callContainer}>
            <SafeAreaView style={styles.callSafeArea}>
              {/* Header Status Bar */}
              <View style={styles.topHeader}>
                <View style={styles.secureBadge}>
                  <Ionicons name="lock-closed" size={12} color="#10B981" />
                  <Text style={styles.secureText}>Ride4Rent Voice Call</Text>
                </View>

                {/* Main Call Status */}
                <Text style={styles.statusLabel}>
                  {callStatusText
                    ? callStatusText
                    : activeCall.status === "accepted"
                    ? formatCallTime(callDuration)
                    : callRole === "receiver"
                    ? "Incoming Voice Call..."
                    : "Ringing..."}
                </Text>
              </View>

              {/* Center Profile / Avatar Section */}
              <View style={styles.centerSection}>
                <Animated.View
                  style={[
                    styles.avatarWrapper,
                    (activeCall.status === "calling" || activeCall.status === "ringing") && {
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                >
                  {otherUser?.profile_photo ? (
                    <Image
                      source={{ uri: otherUser.profile_photo }}
                      style={styles.avatarImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarInitial}>
                        {(displayName || "U")[0]?.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </Animated.View>

                <Text style={styles.callerName} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.callerRole}>{displayRole}</Text>
              </View>

              {/* Bottom In-Call Controls */}
              <View style={styles.bottomSection}>
                {/* Case 1: Incoming Ringing (Receiver View) */}
                {activeCall.status === "ringing" && callRole === "receiver" ? (
                  <View style={styles.actionRowIncoming}>
                    {/* Decline Button */}
                    <TouchableOpacity
                      style={[styles.callBtn, styles.declineBtn]}
                      onPress={declineCurrentCall}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={32} color="#FFFFFF" />
                      <Text style={styles.btnLabel}>Decline</Text>
                    </TouchableOpacity>

                    {/* Accept Button */}
                    <TouchableOpacity
                      style={[styles.callBtn, styles.acceptBtn]}
                      onPress={answerCurrentCall}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="call" size={32} color="#FFFFFF" />
                      <Text style={styles.btnLabel}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                ) : activeCall.status === "accepted" ? (
                  /* Case 2: Connected / Ongoing Call */
                  <View style={styles.ongoingControlsWrap}>
                    <View style={styles.controlsRow}>
                      {/* Mute Button */}
                      <TouchableOpacity
                        style={[
                          styles.controlIconBtn,
                          isMuted && styles.controlIconBtnActive,
                        ]}
                        onPress={toggleMute}
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name={isMuted ? "mic-off" : "mic"}
                          size={24}
                          color={isMuted ? Colors.dark : "#FFFFFF"}
                        />
                        <Text style={[styles.controlLabel, isMuted && styles.controlLabelActive]}>
                          {isMuted ? "Unmute" : "Mute"}
                        </Text>
                      </TouchableOpacity>

                      {/* Speaker Button */}
                      <TouchableOpacity
                        style={[
                          styles.controlIconBtn,
                          isSpeaker && styles.controlIconBtnActive,
                        ]}
                        onPress={toggleSpeaker}
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name={isSpeaker ? "volume-high" : "volume-medium"}
                          size={24}
                          color={isSpeaker ? Colors.dark : "#FFFFFF"}
                        />
                        <Text style={[styles.controlLabel, isSpeaker && styles.controlLabelActive]}>
                          Speaker
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* End Call Button */}
                    <TouchableOpacity
                      style={[styles.callBtn, styles.endCallBtn]}
                      onPress={endCurrentCall}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="call" size={30} color="#FFFFFF" style={{ transform: [{ rotate: "135deg" }] }} />
                      <Text style={styles.btnLabel}>End Call</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Case 3: Outgoing Ringing / Waiting for Answer */
                  <View style={styles.outgoingControlsWrap}>
                    <TouchableOpacity
                      style={[styles.callBtn, styles.endCallBtn]}
                      onPress={endCurrentCall}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="call" size={30} color="#FFFFFF" style={{ transform: [{ rotate: "135deg" }] }} />
                      <Text style={styles.btnLabel}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      )}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
};

const styles = StyleSheet.create({
  callContainer: {
    flex: 1,
    backgroundColor: "#0F172A", // Deep sleek midnight dark
  },
  callSafeArea: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  topHeader: {
    alignItems: "center",
    marginTop: 16,
    gap: 8,
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  secureText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: "#10B981",
  },
  statusLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 18,
    color: "#E2E8F0",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  centerSection: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  avatarWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#1E293B",
    borderWidth: 3,
    borderColor: Colors.primary,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 20,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: FontFamily.bold,
    fontSize: 48,
    color: "#FFFFFF",
  },
  callerName: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    color: "#FFFFFF",
    textAlign: "center",
    maxWidth: 280,
  },
  callerRole: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 4,
  },
  bottomSection: {
    width: "100%",
    alignItems: "center",
    marginBottom: Platform.OS === "ios" ? 24 : 32,
  },
  actionRowIncoming: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 20,
  },
  ongoingControlsWrap: {
    width: "100%",
    alignItems: "center",
    gap: 32,
  },
  outgoingControlsWrap: {
    width: "100%",
    alignItems: "center",
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 48,
  },
  controlIconBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlIconBtnActive: {
    backgroundColor: "#FFFFFF",
  },
  controlLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#94A3B8",
    position: "absolute",
    bottom: -20,
  },
  controlLabelActive: {
    color: "#FFFFFF",
  },
  callBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  acceptBtn: {
    backgroundColor: "#10B981",
  },
  declineBtn: {
    backgroundColor: "#EF4444",
  },
  endCallBtn: {
    backgroundColor: "#EF4444",
  },
  btnLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: "#FFFFFF",
    position: "absolute",
    bottom: -22,
  },
});
