import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
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

import { AppBottomSheet } from "@/components/common/AppBottomSheet";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { copyToClipboard } from "@/utils/clipboard";
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
  const { showError } = useAppToast();

  const [chatUser, setChatUser] = useState<any>(null);
  const [bookingContext, setBookingContext] = useState<BookingContext | null>(null);
  const [showBookingBanner, setShowBookingBanner] = useState<boolean>(true);
  const [messages, setMessages] = useState<ChatThreadMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedViewerImage, setSelectedViewerImage] = useState<string | null>(null);
  const [selectedMessageForAction, setSelectedMessageForAction] = useState<ChatThreadMessage | null>(null);

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
      setBookingContext(res.booking_context || null);
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
      setBookingContext(res.booking_context || null);
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
        vehicle_id: bookingContext?.vehicle_id,
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

  // Multiple Image Selection (Messenger Inspiration)
  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showError("Permission Required", "Please grant photo library permissions to send images.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        handleSendMultipleImages(result.assets);
      }
    } catch (e) {
      showError("Error", "Could not pick image.");
    }
  };

  const handleSendMultipleImages = async (assets: ImagePicker.ImagePickerAsset[]) => {
    if (!assets || assets.length === 0) return;
    const textToSend = inputMessage.trim();
    setInputMessage("");

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      if (!asset.base64) continue;

      const tempId = `temp_img_${Date.now()}_${i}`;
      const caption = i === 0 && textToSend ? textToSend : "";

      const optimisticMsg: ChatThreadMessage = {
        id: tempId,
        sender: "user",
        text: caption,
        image_url: `data:image/jpeg;base64,${asset.base64}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      // Fire off message send
      sendMessage({
        receiver_id: id,
        message: caption || undefined,
        image_base64: asset.base64,
        vehicle_id: bookingContext?.vehicle_id,
      })
        .then((res) => {
          setMessages((prev) => prev.map((m) => (m.id === tempId ? res : m)));
        })
        .catch((err) => {
          console.log("Image send failed:", err);
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        });
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

  // Messenger-style subtle unsend logic (no annoying success modals)
  const handleUnsendMessage = async () => {
    if (!selectedMessageForAction) return;
    const targetMsg = selectedMessageForAction;
    setSelectedMessageForAction(null);

    // Optimistically remove from list immediately
    setMessages((prev) => prev.filter((m) => m.id !== targetMsg.id));

    try {
      await deleteMessage(targetMsg.id);
    } catch (e: any) {
      console.log("Could not delete message:", e);
      loadThreadSilent();
    }
  };

  const handleCopyMessage = async () => {
    if (selectedMessageForAction?.text) {
      await copyToClipboard(selectedMessageForAction.text);
    }
    setSelectedMessageForAction(null);
  };

  const displayName =
    chatUser?.business_name ||
    chatUser?.name ||
    name ||
    (user?.role === "operator" ? "Customer" : "Vehicle Host");

  const operatorPhone = chatUser?.business_contact_number || chatUser?.mobile_number;
  const paymentInfo = bookingContext?.operator_payment_info;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      {/* Modern Messenger-Inspired Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.dark} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => chatUser?.role === "operator" && router.push(`/operator/${id}` as any)}
          activeOpacity={chatUser?.role === "operator" ? 0.75 : 1}
        >
          {/* Avatar with Online Badge */}
          <View style={styles.avatarWrapper}>
            {chatUser?.profile_photo ? (
              <Image source={{ uri: chatUser.profile_photo }} style={styles.headerAvatar} contentFit="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>
                  {(displayName || "U")[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.onlineBadge} />
          </View>

          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={styles.statusRow}>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {chatUser?.role === "operator" ? "Verified Host • Operator" : "Active now"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Right Header Actions */}
        <View style={styles.headerActionsRow}>
          {operatorPhone ? (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => Linking.openURL(`tel:${operatorPhone}`)}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={18} color={Colors.dark} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 8 }} />
          )}
        </View>
      </View>

      {/* Active Booking & Payment Context Card (collapsible - only shown when pending payment and unpaid) */}
      {bookingContext &&
        bookingContext.status === "pending_payment" &&
        bookingContext.payment_status === "unpaid" && (
        <View style={styles.contextBanner}>
          <TouchableOpacity
            style={styles.contextHeader}
            onPress={() => setShowBookingBanner(!showBookingBanner)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
              <Ionicons name="car-sport" size={17} color="#854D0E" />
              <Text style={styles.contextTitle} numberOfLines={1}>
                {bookingContext.vehicle_name}
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
              <View style={styles.amountsRow}>
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Total Rental</Text>
                  <Text style={styles.amountVal}>₱{bookingContext.total_price.toLocaleString()}</Text>
                </View>
                <View style={styles.amountDivider} />
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Downpayment</Text>
                  <Text style={[styles.amountVal, { color: "#16A34A" }]}>
                    ₱{bookingContext.reservation_fee.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.amountDivider} />
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Balance Due</Text>
                  <Text style={[styles.amountVal, { color: "#DC2626" }]}>
                    ₱{bookingContext.balance_due.toLocaleString()}
                  </Text>
                </View>
              </View>

              {paymentInfo && (
                <View style={styles.paymentInfoCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 }}>
                    <Ionicons name="shield-checkmark" size={14} color="#166534" />
                    <Text style={styles.paymentInfoTitle}>
                      Host Payment Details ({paymentInfo.business_name || "Verified"})
                    </Text>
                  </View>

                  {paymentInfo.account_name && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Account Name:</Text>
                      <Text style={styles.infoValue}>{paymentInfo.account_name}</Text>
                    </View>
                  )}
                  {paymentInfo.account_number && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>GCash / Bank No:</Text>
                      <Text style={[styles.infoValue, { fontFamily: FontFamily.bold }]}>
                        {paymentInfo.account_number}
                      </Text>
                    </View>
                  )}

                  {paymentInfo.qr_code_url ? (
                    <TouchableOpacity
                      style={styles.qrRow}
                      onPress={() => setSelectedViewerImage(paymentInfo.qr_code_url || null)}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: paymentInfo.qr_code_url }} style={styles.qrThumb} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.infoLabel, { fontFamily: FontFamily.medium }]}>
                          Payment QR Code attached
                        </Text>
                        <Text style={{ fontSize: 10, color: Colors.secondary }}>
                          Tap to view & scan QR
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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
                    onLongPress={() => setSelectedMessageForAction(item)}
                    delayLongPress={220}
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

                    {/* Time & Delivery Status Indicator */}
                    <View style={styles.bubbleFooter}>
                      <Text
                        style={[
                          styles.timeText,
                          isUser ? styles.userTimeText : styles.operatorTimeText,
                        ]}
                      >
                        {item.time}
                      </Text>
                      {isUser && (
                        <Ionicons
                          name="checkmark-done"
                          size={13}
                          color="#FEC103"
                          style={{ marginLeft: 4 }}
                        />
                      )}
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

          {/* Multiple Gallery Photos Button */}
          <TouchableOpacity style={styles.attachButton} onPress={handlePickImage} activeOpacity={0.7}>
            <Ionicons name="images-outline" size={21} color={Colors.dark} />
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

      {/* Messenger-Inspired Message Action Sheet (Delete / Unsend & Copy) */}
      <AppBottomSheet
        visible={!!selectedMessageForAction}
        onClose={() => setSelectedMessageForAction(null)}
        position="bottom"
        showHandle={true}
        sheetStyle={styles.actionSheet}
      >
        <View style={styles.actionSheetContent}>
          {selectedMessageForAction?.text ? (
            <View style={styles.actionPreviewWrap}>
              <Text style={styles.actionPreviewText} numberOfLines={2}>
                "{selectedMessageForAction.text}"
              </Text>
            </View>
          ) : null}

          {selectedMessageForAction?.text ? (
            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleCopyMessage}
              activeOpacity={0.7}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="copy-outline" size={19} color={Colors.dark} />
              </View>
              <Text style={styles.actionLabel}>Copy Text</Text>
            </TouchableOpacity>
          ) : null}

          {selectedMessageForAction?.image_url ? (
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                const img = selectedMessageForAction.image_url;
                setSelectedMessageForAction(null);
                setSelectedViewerImage(img || null);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="expand-outline" size={19} color={Colors.dark} />
              </View>
              <Text style={styles.actionLabel}>View Photo</Text>
            </TouchableOpacity>
          ) : null}

          {selectedMessageForAction?.sender === "user" ? (
            <TouchableOpacity
              style={[styles.actionItem, { borderBottomWidth: 0 }]}
              onPress={handleUnsendMessage}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#FEE2E2" }]}>
                <Ionicons name="trash-outline" size={19} color="#EF4444" />
              </View>
              <Text style={[styles.actionLabel, { color: "#EF4444" }]}>
                Unsend for Everyone
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.actionCancelButton}
            onPress={() => setSelectedMessageForAction(null)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionCancelLabel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </AppBottomSheet>

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
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarWrapper: {
    position: "relative",
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: "#FEC103",
  },
  onlineBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  headerTextWrap: {
    flex: 1,
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15.5,
    color: Colors.dark,
    letterSpacing: -0.2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 1,
  },
  headerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: Colors.secondary,
  },
  headerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
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
    marginVertical: 4,
    maxWidth: "82%",
  },
  userBubbleWrap: {
    alignSelf: "flex-end",
  },
  operatorBubbleWrap: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  userBubble: {
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  operatorBubble: {
    backgroundColor: "#F1F5F9",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chatImage: {
    width: 220,
    height: 165,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
  },
  messageText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: "#FFFFFF",
  },
  operatorMessageText: {
    color: "#0F172A",
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
    color: "rgba(255, 255, 255, 0.65)",
  },
  operatorTimeText: {
    color: "#64748B",
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
    width: 38,
    height: 38,
    borderRadius: 19,
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
    backgroundColor: Colors.dark,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.inputBackground,
  },
  actionSheet: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  actionSheetContent: {
    width: "100%",
  },
  actionPreviewWrap: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  actionPreviewText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: "#475569",
    fontStyle: "italic",
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 14.5,
    color: Colors.dark,
  },
  actionCancelButton: {
    marginTop: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCancelLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: "#475569",
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
