import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  BookingContext,
  ChatThreadMessage,
  deleteMessage,
  getChatThread,
  sendMessage,
} from "@/services/messageService";

export default function ChatThreadScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { user } = useAuth();
  const { showSuccess, showError } = useAppToast();

  const [chatUser, setChatUser] = useState<any>(null);
  const [bookingContext, setBookingContext] = useState<BookingContext | null>(null);
  const [showBookingBanner, setShowBookingBanner] = useState<boolean>(true);
  const [messages, setMessages] = useState<ChatThreadMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedViewerImage, setSelectedViewerImage] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;
    loadThread();

    // Poll every 3 seconds for new incoming messages
    const interval = setInterval(loadThreadSilent, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const loadThread = async () => {
    try {
      setLoading(true);
      const res = await getChatThread(id);
      setChatUser(res.other_user);
      if (res.booking_context) {
        setBookingContext(res.booking_context);
      }
      setMessages(res.messages || []);
    } catch (e) {
      console.log("Error loading chat thread:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadThreadSilent = async () => {
    if (sending) return;
    try {
      const res = await getChatThread(id);
      if (res.other_user) setChatUser(res.other_user);
      if (res.booking_context) setBookingContext(res.booking_context);
      if (Array.isArray(res.messages)) {
        setMessages((prev) => {
          if (res.messages.length === 0 && prev.length > 0) {
            return prev;
          }
          const tempIds = new Set(prev.filter((m) => m.id.length > 10).map((m) => m.id));
          if (tempIds.size > 0) {
            const confirmedIds = new Set(res.messages.map((m) => m.id));
            const stillPending = prev.filter((m) => tempIds.has(m.id) && !confirmedIds.has(m.id));
            return [...res.messages, ...stillPending];
          }
          return res.messages;
        });
      }
    } catch (e) {
      // silent
    }
  };

  const handleSendMessage = async (customText?: string, base64Img?: string) => {
    const textToSend = customText !== undefined ? customText : inputMessage.trim();
    if (!textToSend && !base64Img) return;
    if (sending) return;

    setInputMessage("");

    // Optimistic message append
    const tempId = String(Date.now());
    const optimisticMsg: ChatThreadMessage = {
      id: tempId,
      sender: "user",
      text: textToSend,
      image_url: base64Img ? `data:image/jpeg;base64,${base64Img}` : null,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      setSending(true);
      const res = await sendMessage({
        receiver_id: id,
        message: textToSend || undefined,
        image_base64: base64Img,
        vehicle_id: bookingContext?.id,
      });

      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? res : m))
      );
    } catch (e: any) {
      showError("Message Error", e.response?.data?.message || "Failed to send message.");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showError("Permission Required", "Please grant photo library permissions to send images.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        handleSendMessage("", result.assets[0].base64);
      }
    } catch (e) {
      showError("Error", "Could not pick image.");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        showError("Permission Required", "Please grant camera permissions to capture photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        handleSendMessage("", result.assets[0].base64);
      }
    } catch (e) {
      showError("Error", "Could not take photo.");
    }
  };

  const handleDeleteMessage = (msg: ChatThreadMessage) => {
    if (msg.sender !== "user") return;

    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setMessages((prev) => prev.filter((m) => m.id !== msg.id));
              await deleteMessage(msg.id);
              showSuccess("Message Deleted", "Your message was removed.");
            } catch (e: any) {
              showError("Error", e.response?.data?.message || "Could not delete message.");
              loadThreadSilent();
            }
          },
        },
      ]
    );
  };

  const displayName =
    chatUser?.business_name ||
    chatUser?.name ||
    name ||
    (user?.role === "operator" ? "Customer" : "Vehicle Host");

  const paymentInfo = bookingContext?.operator_payment_info;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.dark} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.onlineStatusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineStatusText}>
              {chatUser?.role === "operator" ? "Verified Host" : "Direct Message"}
            </Text>
          </View>
        </View>

        {chatUser?.role === "operator" ? (
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push(`/operator/${id}` as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="information-circle-outline" size={24} color={Colors.dark} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Booking & Operator Payment Details Banner */}
      {bookingContext && (
        <View style={styles.contextBanner}>
          <TouchableOpacity
            style={styles.contextHeader}
            onPress={() => setShowBookingBanner((prev) => !prev)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
              <Ionicons name="receipt-outline" size={17} color="#854D0E" />
              <Text style={styles.contextTitle} numberOfLines={1}>
                Booking #{bookingContext.id}: {bookingContext.vehicle_name}
              </Text>
            </View>
            <Ionicons
              name={showBookingBanner ? "chevron-up" : "chevron-down"}
              size={18}
              color="#854D0E"
            />
          </TouchableOpacity>

          {showBookingBanner && (
            <View style={styles.contextBody}>
              {/* Amounts Breakdown */}
              <View style={styles.amountsRow}>
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Total Rental</Text>
                  <Text style={styles.amountVal}>₱{Number(bookingContext.total_price).toLocaleString()}</Text>
                </View>
                <View style={styles.amountDivider} />
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Deposit Due</Text>
                  <Text style={[styles.amountVal, { color: "#D97706" }]}>
                    ₱{Number(bookingContext.reservation_fee).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.amountDivider} />
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Handover Balance</Text>
                  <Text style={[styles.amountVal, { color: "#16A34A" }]}>
                    ₱{Number(bookingContext.balance_due).toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* Operator Payment Setup Card */}
              {paymentInfo && (paymentInfo.account_number || paymentInfo.account_name) && (
                <View style={styles.paymentInfoCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <Ionicons name="card" size={15} color="#166534" />
                    <Text style={styles.paymentInfoTitle}>
                      Host Payment Details (Settle Here)
                    </Text>
                  </View>

                  {paymentInfo.account_name ? (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Account Name:</Text>
                      <Text style={styles.infoValue}>{paymentInfo.account_name}</Text>
                    </View>
                  ) : null}

                  {paymentInfo.account_number ? (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Account / Mobile:</Text>
                      <Text style={[styles.infoValue, { color: "#166534", fontFamily: FontFamily.bold }]}>
                        {paymentInfo.account_number}
                      </Text>
                    </View>
                  ) : null}

                  {paymentInfo.qr_code_url ? (
                    <TouchableOpacity
                      style={styles.qrRow}
                      onPress={() => setSelectedViewerImage(paymentInfo.qr_code_url || null)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: paymentInfo.qr_code_url }}
                        style={styles.qrThumb}
                        contentFit="contain"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: FontFamily.bold, fontSize: 12, color: "#0F172A" }}>
                          Tap to view & scan Host QR Code
                        </Text>
                        <Text style={{ fontFamily: FontFamily.regular, fontSize: 11, color: "#64748B" }}>
                          GCash / Maya / Bank payment QR
                        </Text>
                      </View>
                      <Ionicons name="expand-outline" size={16} color="#0F172A" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading conversation...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              !sending && messages.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="chatbubbles-outline" size={44} color={Colors.secondary} />
                  <Text style={styles.emptyTitle}>Start a Conversation</Text>
                  <Text style={styles.emptySub}>
                    Discuss payment details, send receipts/photos, and coordinate rental pickup!
                  </Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              const isUser = item.sender === "user";
              return (
                <View
                  style={[
                    styles.messageBubbleWrap,
                    isUser ? styles.userBubbleWrap : styles.operatorBubbleWrap,
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.messageBubble,
                      isUser ? styles.userBubble : styles.operatorBubble,
                    ]}
                    onLongPress={() => isUser && handleDeleteMessage(item)}
                    activeOpacity={0.92}
                  >
                    {/* Image Attachment in Chat */}
                    {item.image_url ? (
                      <TouchableOpacity
                        onPress={() => setSelectedViewerImage(item.image_url || null)}
                        activeOpacity={0.88}
                        style={{ marginBottom: item.text ? 6 : 0 }}
                      >
                        <Image
                          source={{ uri: item.image_url }}
                          style={styles.chatImage}
                          contentFit="cover"
                        />
                      </TouchableOpacity>
                    ) : null}

                    {/* Text */}
                    {item.text ? (
                      <Text
                        style={[
                          styles.messageText,
                          isUser ? styles.userMessageText : styles.operatorMessageText,
                        ]}
                      >
                        {item.text}
                      </Text>
                    ) : null}

                    {/* Time & Delete */}
                    <View style={styles.bubbleFooter}>
                      {isUser && (
                        <TouchableOpacity
                          onPress={() => handleDeleteMessage(item)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={{ marginRight: 6 }}
                        >
                          <Ionicons name="trash-outline" size={12} color="rgba(255,255,255,0.75)" />
                        </TouchableOpacity>
                      )}
                      <Text
                        style={[
                          styles.timeText,
                          isUser ? styles.userTimeText : styles.operatorTimeText,
                        ]}
                      >
                        {item.time}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        )}

        {/* Input Bar with Photo Picker */}
        <View style={styles.inputContainer}>
          {/* Camera Button */}
          <TouchableOpacity style={styles.attachButton} onPress={handleTakePhoto} activeOpacity={0.7}>
            <Ionicons name="camera-outline" size={22} color={Colors.dark} />
          </TouchableOpacity>

          {/* Gallery Button */}
          <TouchableOpacity style={styles.attachButton} onPress={handlePickImage} activeOpacity={0.7}>
            <Ionicons name="image-outline" size={22} color={Colors.dark} />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Type message or send receipt..."
            placeholderTextColor={Colors.secondary}
            value={inputMessage}
            onChangeText={setInputMessage}
            multiline
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              inputMessage.trim() || sending ? styles.sendButtonActive : styles.sendButtonDisabled,
            ]}
            onPress={() => handleSendMessage()}
            disabled={!inputMessage.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={inputMessage.trim() ? Colors.white : Colors.secondary}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Fullscreen Image Viewer Modal */}
      <Modal
        visible={!!selectedViewerImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedViewerImage(null)}
      >
        <View style={styles.imageViewerOverlay}>
          <SafeAreaView style={styles.imageViewerHeader}>
            <TouchableOpacity
              style={styles.closeViewerBtn}
              onPress={() => setSelectedViewerImage(null)}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>

          {selectedViewerImage ? (
            <Image
              source={{ uri: selectedViewerImage }}
              style={styles.fullscreenImage}
              contentFit="contain"
            />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: Spacing.sm,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
  },
  onlineStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10B981",
  },
  onlineStatusText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  contextBanner: {
    backgroundColor: "#FEF9C3",
    borderBottomWidth: 1,
    borderBottomColor: "#FDE047",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  contextHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  contextTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: "#854D0E",
  },
  contextBody: {
    marginTop: 8,
  },
  amountsRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  amountItem: {
    alignItems: "center",
  },
  amountLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 10.5,
    color: "#64748B",
  },
  amountVal: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    color: "#0F172A",
    marginTop: 2,
  },
  amountDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E2E8F0",
  },
  paymentInfoCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  paymentInfoTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: "#166534",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  infoLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: "#64748B",
  },
  infoValue: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: "#0F172A",
  },
  qrRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 6,
    borderRadius: 8,
    marginTop: 6,
    gap: 8,
  },
  qrThumb: {
    width: 36,
    height: 36,
    borderRadius: 4,
  },
  keyboardContainer: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    color: Colors.dark,
    marginTop: 8,
  },
  emptySub: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 4,
  },
  messagesList: {
    padding: Spacing.lg,
    paddingBottom: 20,
  },
  messageBubbleWrap: {
    marginVertical: 5,
    maxWidth: "82%",
  },
  userBubbleWrap: {
    alignSelf: "flex-end",
  },
  operatorBubbleWrap: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  operatorBubble: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chatImage: {
    width: 210,
    height: 160,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
  messageText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: Colors.white,
  },
  operatorMessageText: {
    color: Colors.dark,
  },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  timeText: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
  },
  userTimeText: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  operatorTimeText: {
    color: Colors.secondary,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    gap: 6,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.inputBackground,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    maxHeight: 100,
    color: Colors.dark,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonActive: {
    backgroundColor: Colors.primary,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.inputBackground,
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerHeader: {
    position: "absolute",
    top: 10,
    right: 16,
    zIndex: 10,
  },
  closeViewerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenImage: {
    width: "100%",
    height: "85%",
  },
});
