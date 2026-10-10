import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import {
  AssistantVehicle,
  sendAssistantMessage,
} from "@/features/assistant/services/assistantService";

interface MessageItem {
  id: string;
  sender: "assistant" | "user";
  text: string;
  vehicles?: AssistantVehicle[];
  quickReplies?: string[];
  timestamp: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

export const cleanAssistantText = (text: string | null | undefined): string => {
  if (!text) return "";
  return text.replace(/\*/g, "").trim();
};

const INITIAL_MESSAGE: MessageItem = {
  id: "welcome-1",
  sender: "assistant",
  text: "Hello! I'm your Ride4Rent Assistant.\n\nHow can I help you today? You can ask me in English or Tagalog about vehicle rentals, requirements, booking procedures, and rates in Oriental Mindoro!",
  quickReplies: [
    "Rental requirements?",
    "Paano mag-book ng sasakyan?",
    "Show available SUVs",
    "Ano ang reservation fee policy?",
  ],
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

export default function AssistantModal({ visible, onClose, initialPrompt }: Props) {
  const [messages, setMessages] = useState<MessageItem[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible && initialPrompt) {
      handleSend(initialPrompt);
    }
  }, [visible, initialPrompt]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: MessageItem = {
      id: Date.now().toString(),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendAssistantMessage(query);
      if (res && res.reply) {
        const assistantMsg: MessageItem = {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          text: cleanAssistantText(res.reply),
          vehicles: res.vehicles,
          quickReplies: res.quick_replies?.map((qr) => cleanAssistantText(qr)),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error("Invalid response");
      }
    } catch (err: any) {
      console.warn("Assistant Error:", err?.response?.data || err?.message);
      const errorMsg: MessageItem = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: "I'm having trouble connecting to the server. Please check that the backend is running and try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleVehiclePress = (vehicle: AssistantVehicle) => {
    onClose();
    router.push(`/vehicles/${vehicle.id}` as any);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarWrap}>
                <MaterialCommunityIcons
                  name="robot-excited"
                  size={24}
                  color={Colors.white}
                />
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.headerTitle}>Ride4Rent AI Assistant</Text>
                <View style={styles.statusRow}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.headerStatus}>Online & Ready to Help</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={Colors.dark} />
            </TouchableOpacity>
          </View>

          {/* Messages list */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageRow,
                  item.sender === "user" ? styles.userRow : styles.assistantRow,
                ]}
              >
                {item.sender === "assistant" && (
                  <View style={styles.botIconSmall}>
                    <MaterialCommunityIcons
                      name="robot-outline"
                      size={16}
                      color={Colors.white}
                    />
                  </View>
                )}

                <View
                  style={[
                    styles.bubble,
                    item.sender === "user" ? styles.userBubble : styles.assistantBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      item.sender === "user"
                        ? styles.userBubbleText
                        : styles.assistantBubbleText,
                    ]}
                  >
                    {item.text}
                  </Text>

                  {/* Embedded Vehicle Recommendation Cards */}
                  {item.vehicles && item.vehicles.length > 0 && (
                    <View style={styles.vehicleCardsContainer}>
                      {item.vehicles.map((v: AssistantVehicle) => (
                        <TouchableOpacity
                          key={v.id}
                          style={styles.vehicleCard}
                          onPress={() => handleVehiclePress(v)}
                          activeOpacity={0.88}
                        >
                          <Image
                            source={
                              v.image_url
                                ? { uri: v.image_url }
                                : { uri: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800" }
                            }
                            contentFit="cover"
                            style={styles.vehicleThumb}
                          />
                          <View style={styles.vehicleInfo}>
                            <Text style={styles.vehicleName} numberOfLines={1}>
                              {v.name}
                            </Text>
                            <Text style={styles.vehiclePrice}>
                              PHP {v.price_per_day.toLocaleString()} / day
                            </Text>
                            <View style={styles.vehiclePills}>
                              <Text style={styles.pillText}>
                                {v.transmission || "Auto"}
                              </Text>
                              <Text style={styles.pillText}>
                                {v.seats || 5} Seats
                              </Text>
                            </View>
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color={Colors.secondary}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <Text
                    style={[
                      styles.timeText,
                      item.sender === "user" ? styles.userTime : styles.assistantTime,
                    ]}
                  >
                    {item.timestamp}
                  </Text>
                </View>
              </View>
            )}
          />

          {/* Quick Replies Carousel */}
          {messages.length > 0 &&
            messages[messages.length - 1].sender === "assistant" &&
            messages[messages.length - 1].quickReplies && (
              <View style={styles.quickRepliesWrap}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickRepliesList}
                >
                  {messages[messages.length - 1].quickReplies?.map(
                    (qr, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.chip}
                        onPress={() => handleSend(qr)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.chipText}>{qr}</Text>
                      </TouchableOpacity>
                    )
                  )}
                </ScrollView>
              </View>
            )}

          {/* Typing Indicator */}
          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>AI Assistant is thinking...</Text>
            </View>
          )}

          {/* Input Bar */}
          <View style={styles.inputContainer}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask anything about cars, bookings, rules..."
              placeholderTextColor={Colors.secondary}
              style={styles.input}
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
              multiline={false}
            />
            <TouchableOpacity
              onPress={() => handleSend()}
              disabled={!input.trim() || loading}
              style={[
                styles.sendBtn,
                input.trim() ? styles.sendBtnActive : styles.sendBtnDisabled,
              ]}
              activeOpacity={0.8}
            >
              <Ionicons
                name="send"
                size={18}
                color={input.trim() ? Colors.white : Colors.secondary}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: {
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10B981",
  },
  headerStatus: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
  },
  closeBtn: {
    padding: 6,
  },
  messagesList: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: 14,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  userRow: {
    justifyContent: "flex-end",
  },
  assistantRow: {
    justifyContent: "flex-start",
  },
  botIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  assistantBubble: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: Colors.dark,
    borderTopRightRadius: 4,
  },
  bubbleText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    lineHeight: 20,
  },
  assistantBubbleText: {
    color: Colors.dark,
  },
  userBubbleText: {
    color: Colors.white,
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    textAlign: "right",
  },
  assistantTime: {
    color: Colors.secondary,
  },
  userTime: {
    color: "#9CA3AF",
  },
  vehicleCardsContainer: {
    marginTop: 10,
    gap: 8,
  },
  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 8,
    borderRadius: 12,
    gap: 10,
  },
  vehicleThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
  vehiclePrice: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.primary,
    marginTop: 1,
  },
  vehiclePills: {
    flexDirection: "row",
    gap: 6,
    marginTop: 3,
  },
  pillText: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.secondary,
    backgroundColor: Colors.white,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  quickRepliesWrap: {
    paddingVertical: 6,
    backgroundColor: "#F9FAFB",
  },
  quickRepliesList: {
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  chip: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.dark,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
  },
  loadingText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 10,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: "#F3F4F6",
    borderRadius: 22,
    paddingHorizontal: 16,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.dark,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnActive: {
    backgroundColor: Colors.primary,
  },
  sendBtnDisabled: {
    backgroundColor: "#E5E7EB",
  },
});
