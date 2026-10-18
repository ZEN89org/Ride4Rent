import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBottomSheet } from "@/components/common/AppBottomSheet";
import { Colors } from "@/constants/colors";
import { FontFamily, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import { useCall } from "@/context/CallContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  BookingContext,
  ChatThreadMessage,
  deleteMessage,
  getChatThread,
  sendMessage,
} from "@/services/messageService";
import { copyToClipboard } from "@/utils/clipboard";

const GCASH_LOGO = require("../../../assets/img/gcash.jpg");

const isSameMessage = (
  left: ChatThreadMessage,
  right: ChatThreadMessage,
): boolean =>
  left.id === right.id &&
  left.sender === right.sender &&
  left.text === right.text &&
  left.image_url === right.image_url &&
  left.created_at === right.created_at &&
  left.time === right.time &&
  left.is_read === right.is_read;

const isSameShallowValue = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (
    !Array.isArray(left) ||
    !Array.isArray(right) ||
    left.length !== right.length
  ) {
    return false;
  }
  return left.every((value, index) => Object.is(value, right[index]));
};

const isSameShallowObject = <T extends object>(
  left: T | null | undefined,
  right: T | null | undefined,
): boolean => {
  if (left === right) return true;
  if (!left || !right) return false;
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  return (
    leftEntries.length === rightEntries.length &&
    leftEntries.every(([key, value]) =>
      rightEntries.some(
        ([rightKey, rightValue]) =>
          key === rightKey && isSameShallowValue(value, rightValue),
      ),
    )
  );
};

const parseReplyData = (text?: string | null) => {
  if (!text || !text.startsWith("[REPLY:"))
    return { reply: null, cleanText: text || "" };
  const match = text.match(/^\[REPLY:(\{[\s\S]*?\})\]\s*([\s\S]*)$/);
  if (!match) {
    const looseMatch = text.match(/^\[REPLY:[\s\S]*?\]\s*([\s\S]*)$/);
    if (looseMatch) {
      return { reply: null, cleanText: looseMatch[1] || "" };
    }
    return { reply: null, cleanText: text || "" };
  }
  const jsonStr = match[1];
  const cleanText = match[2] || "";
  try {
    const reply = JSON.parse(jsonStr) as { snippet: string; author?: string };
    return { reply, cleanText };
  } catch {
    const snippetMatch = jsonStr.match(
      /['"]snippet['"]\s*:\s*['"]([^'"]+)['"]/i,
    );
    const authorMatch = jsonStr.match(/['"]author['"]\s*:\s*['"]([^'"]+)['"]/i);
    if (snippetMatch || authorMatch) {
      return {
        reply: {
          author: authorMatch ? authorMatch[1] : undefined,
          snippet: snippetMatch ? snippetMatch[1] : "Message",
        },
        cleanText,
      };
    }
    return { reply: null, cleanText };
  }
};

interface ReceiptData {
  type: "reservation" | "extension";
  vehicle?: string;
  schedule?: string;
  method?: string;
  reference?: string;
  amount?: string;
  status?: string;
  notes?: string;
  recipient?: string;
  phone?: string;
}

const parseReceiptData = (text?: string | null): ReceiptData | null => {
  if (!text) return null;
  const isExtension = text.includes("EXTENSION PAYMENT RECEIPT");
  const isReservation =
    text.includes("PAYMENT RECEIPT") ||
    text.includes("RESERVATION PAYMENT RECEIPT") ||
    text.includes("RESERVATION FEE PAYMENT RECEIPT");

  if (!isExtension && !isReservation) {
    return null;
  }

  const data: ReceiptData = {
    type: isExtension ? "extension" : "reservation",
  };
  const lines = text.split("\n");

  for (const line of lines) {
    const clean = line.replace(/^[•\-\*─—]+\s*/, "").trim();

    // Strictly omit any Booking ID or Booking #
    if (/^booking\s*(id|#)/i.test(clean)) {
      continue;
    }

    if (/^vehicle:\s*(.+)$/i.test(clean)) {
      data.vehicle = clean.replace(/^vehicle:\s*/i, "").trim();
    } else if (
      /^(schedule|trip\s+dates|extended\s+return\s+date):\s*(.+)$/i.test(clean)
    ) {
      data.schedule = clean
        .replace(/^(schedule|trip\s+dates|extended\s+return\s+date):\s*/i, "")
        .trim();
    } else if (/^(payment\s+)?method:\s*(.+)$/i.test(clean)) {
      data.method = clean.replace(/^(payment\s+)?method:\s*/i, "").trim();
    } else if (
      /^(gcash\s+ref|reference|reference\s+no|ref\s*no):\s*(.+)$/i.test(clean)
    ) {
      data.reference = clean
        .replace(/^(gcash\s+ref|reference|reference\s+no|ref\s*no):\s*/i, "")
        .trim();
    } else if (
      /^(submitted\s+amount|amount\s+paid|reservation\s+fee\s+paid|amount):\s*(.+)$/i.test(
        clean,
      )
    ) {
      data.amount = clean
        .replace(
          /^(submitted\s+amount|amount\s+paid|reservation\s+fee\s+paid|amount):\s*/i,
          "",
        )
        .trim();
    } else if (
      /^(recipient|host|account\s+name|paid\s+to):\s*(.+)$/i.test(clean)
    ) {
      data.recipient = clean
        .replace(/^(recipient|host|account\s+name|paid\s+to):\s*/i, "")
        .trim();
    } else if (
      /^(phone|contact|mobile|gcash\s+no|gcash\s+number):\s*(.+)$/i.test(clean)
    ) {
      data.phone = clean
        .replace(/^(phone|contact|mobile|gcash\s+no|gcash\s+number):\s*/i, "")
        .trim();
    } else if (/^status:\s*(.+)$/i.test(clean)) {
      data.status = clean.replace(/^status:\s*/i, "").trim();
    } else if (clean.toLowerCase().includes("awaiting host verification")) {
      data.notes = "Awaiting Verification";
    } else if (clean.toLowerCase().includes("rental extended successfully")) {
      data.notes = "Rental Extended";
    }
  }

  return data;
};

const maskSingleWord = (word: string): string => {
  const clean = word.trim();
  if (clean.length <= 2) return clean.toUpperCase();
  // Length >= 3: first letter + '*' for each middle letter + last letter
  // Examples: "ZEN" -> "Z*N", "MARK" -> "M**K", "ANTHONY" -> "A*****Y"
  const middleStars = "*".repeat(clean.length - 2);
  return `${clean[0].toUpperCase()}${middleStars}${clean.slice(-1).toUpperCase()}`;
};

const maskName = (name?: string): string => {
  if (!name) return "Not provided";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Not provided";
  if (parts.length === 1) {
    return maskSingleWord(parts[0]);
  }
  // Last part is the surname: abbreviated to initial + dot (e.g., SANTOS -> "S.", JARDELEZA -> "J.")
  const surname = parts[parts.length - 1];
  const surnameInitial = `${surname.charAt(0).toUpperCase()}.`;
  // All preceding parts are given/middle names masked character-by-character
  const givenParts = parts.slice(0, parts.length - 1);
  const maskedGiven = givenParts.map(maskSingleWord).join(" ");
  return `${maskedGiven} ${surnameInitial}`;
};

const maskPhone = (phone?: string): string => {
  if (!phone) return "Not provided";
  const clean = phone.replace(/[^0-9]/g, "");
  if (clean.length >= 10) {
    const last4 = clean.slice(-4);
    return `+63 9•••••${last4}`;
  }
  return "Not provided";
};

const formatReceiptDateTime = (dateStr?: string): string => {
  if (!dateStr) return "Date unavailable";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const m = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${m} ${day}, ${year} ${hours}:${minutes} ${ampm}`;
  } catch {
    return dateStr;
  }
};

interface CallLogData {
  type: "voice" | "missed";
  duration: number;
}

const parseCallData = (text?: string | null): CallLogData | null => {
  if (!text || !text.startsWith("[CALL:")) return null;
  const match = text.match(/^\[CALL:(\{[\s\S]*?\})\]$/);
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]);
    return {
      type: data.type === "missed" ? "missed" : "voice",
      duration: typeof data.duration === "number" ? data.duration : 0,
    };
  } catch {
    return null;
  }
};

const formatCallDurationText = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`;
};

const ChatImage = ({
  uri,
  isAlone = false,
  onPress,
  onLongPress,
}: {
  uri: string;
  isAlone?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) => {
  const [aspectRatio, setAspectRatio] = useState<number>(4 / 3);
  const screenWidth = Dimensions.get("window").width;
  const imageWidth = Math.min(screenWidth * 0.74, 280);

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={220}
      activeOpacity={0.92}
      style={[
        styles.chatImageWrap,
        isAlone ? styles.chatImageAlone : styles.chatImageWithText,
        { width: imageWidth, aspectRatio },
      ]}
    >
      <Image
        source={{ uri }}
        style={styles.chatImageFill}
        contentFit="cover"
        onLoad={(e) => {
          if (e.source?.width && e.source?.height) {
            const rawRatio = e.source.width / e.source.height;
            const clamped = Math.max(0.55, Math.min(1.85, rawRatio));
            setAspectRatio(clamped);
          }
        }}
      />
    </TouchableOpacity>
  );
};

export default function ChatThreadScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { user } = useAuth();
  const { showError } = useAppToast();
  const { startCall } = useCall();

  const [chatUser, setChatUser] = useState<any>(null);
  const [bookingContext, setBookingContext] = useState<BookingContext | null>(
    null,
  );
  const [showBookingBanner, setShowBookingBanner] = useState<boolean>(true);
  const [messages, setMessages] = useState<ChatThreadMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedViewerImage, setSelectedViewerImage] = useState<string | null>(
    null,
  );

  // Message Actions State (Horizontal Action Bar, Reply, Copy, Delete)
  const [selectedMessageForAction, setSelectedMessageForAction] =
    useState<ChatThreadMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] =
    useState<ChatThreadMessage | null>(null);
  const [messageToDelete, setMessageToDelete] =
    useState<ChatThreadMessage | null>(null);
  const [deletedForMeIds, setDeletedForMeIds] = useState<Set<string>>(
    new Set(),
  );
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const isSendingRef = useRef(false);
  const shouldScrollToEndRef = useRef(true);

  const loadThreadSilent = async (isActive: () => boolean = () => true) => {
    if (sending || isSendingRef.current) return;
    try {
      const res = await getChatThread(id, { limit: 40 });
      if (!isActive()) return;
      if (res.other_user) {
        setChatUser((previous: any) =>
          isSameShallowObject(previous, res.other_user)
            ? previous
            : res.other_user,
        );
      }
      setBookingContext((previous) => {
        const next = res.booking_context || null;
        if (!previous || !next) return previous === next ? previous : next;
        const {
          operator_payment_info: previousPaymentInfo,
          ...previousFields
        } = previous;
        const { operator_payment_info: nextPaymentInfo, ...nextFields } = next;
        const sameContext = isSameShallowObject(previousFields, nextFields);
        const samePaymentInfo = isSameShallowObject(
          previousPaymentInfo,
          nextPaymentInfo,
        );
        return sameContext && samePaymentInfo ? previous : next;
      });
      if (Array.isArray(res.messages)) {
        const filtered = res.messages.filter((m) => !deletedForMeIds.has(m.id));
        setMessages((prev) => {
          if (filtered.length === 0 && prev.length > 0) {
            return prev;
          }
          const serverIdSet = new Set(filtered.map((m) => String(m.id)));
          const serverEarliest = filtered[0];

          // Preserve older history loaded previously
          const olderHistory = prev.filter((m) => {
            if (m.id.startsWith("temp_")) return false;
            if (serverIdSet.has(String(m.id))) return false;
            if (!serverEarliest) return false;
            return m.created_at < serverEarliest.created_at;
          });

          const nowMs = Date.now();
          const pendingUnsynced = prev.filter((m) => {
            if (m.id.startsWith("temp_")) return true;
            if (serverIdSet.has(String(m.id))) return false;
            const createdMs = new Date(m.created_at).getTime();
            return !isNaN(createdMs) && nowMs - createdMs < 30000;
          });

          const nextMessages = [
            ...olderHistory,
            ...filtered,
            ...pendingUnsynced,
          ];
          const previousById = new Map(
            prev.map((message) => [message.id, message]),
          );
          const stableMessages = nextMessages.map((message) => {
            const previous = previousById.get(message.id);
            return previous && isSameMessage(previous, message)
              ? previous
              : message;
          });
          if (
            stableMessages.length === prev.length &&
            stableMessages.every((message, index) => message === prev[index])
          ) {
            return prev;
          }
          return stableMessages;
        });
      }
    } catch (e) {
      // silent
    }
  };

  const pollThread = useEffectEvent((isActive: () => boolean) =>
    loadThreadSilent(isActive),
  );

  useEffect(() => {
    if (!id) return;
    let active = true;
    getChatThread(id, { limit: 40 })
      .then((res) => {
        if (!active) return;
        shouldScrollToEndRef.current = true;
        setChatUser(res.other_user);
        setBookingContext(res.booking_context || null);
        setHasMore(Boolean(res.has_more));
        setMessages(
          (res.messages || []).filter(
            (message) => !deletedForMeIds.has(message.id),
          ),
        );
      })
      .catch((error) => console.log("Error loading chat thread:", error))
      .finally(() => {
        if (active) setLoading(false);
      });

    // Poll every 3 seconds for new incoming messages
    const interval = setInterval(() => pollThread(() => active), 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id, deletedForMeIds]);

  const handleLoadEarlier = async () => {
    if (loadingEarlier || !hasMore || messages.length === 0) return;
    const earliestMessage = messages.find((m) => !m.id.startsWith("temp_"));
    if (!earliestMessage) return;

    try {
      setLoadingEarlier(true);
      shouldScrollToEndRef.current = false;
      const res = await getChatThread(id, {
        before_id: earliestMessage.id,
        limit: 40,
      });
      setHasMore(Boolean(res.has_more));
      if (res.messages && res.messages.length > 0) {
        const olderFiltered = res.messages.filter(
          (m) => !deletedForMeIds.has(m.id),
        );
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newOlder = olderFiltered.filter((m) => !existingIds.has(m.id));
          return [...newOlder, ...prev];
        });
      }
    } catch (e) {
      console.log("Error loading earlier messages:", e);
    } finally {
      setLoadingEarlier(false);
    }
  };

  const handleSendMessage = async (customText?: string, base64Img?: string) => {
    const rawTextToSend =
      customText !== undefined ? customText : inputMessage.trim();
    if (!rawTextToSend && !base64Img) return;
    if (sending || isSendingRef.current) return;

    shouldScrollToEndRef.current = true;
    setInputMessage("");
    isSendingRef.current = true;

    let textToSend = rawTextToSend;
    if (replyingToMessage) {
      const { cleanText: snippetText } = parseReplyData(replyingToMessage.text);
      const replySnippet = (
        snippetText || (replyingToMessage.image_url ? "📷 Photo" : "")
      ).slice(0, 240);
      const replyHeader = `[REPLY:{"snippet":"${replySnippet.replace(/"/g, "'").replace(/\n/g, " ")}"}]\n`;
      textToSend = replyHeader + rawTextToSend;
      setReplyingToMessage(null);
    }

    // Optimistic message append with temp_ prefix
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const optimisticMsg: ChatThreadMessage = {
      id: tempId,
      sender: "user",
      text: textToSend,
      image_url: base64Img ? `data:image/jpeg;base64,${base64Img}` : null,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      created_at: new Date().toISOString(),
      is_read: false,
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
        prev.map((m) => (m.id === tempId ? { ...res, is_read: false } : m)),
      );
    } catch (e: any) {
      showError(
        "Message Error",
        e.response?.data?.message || "Failed to send message.",
      );
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
      isSendingRef.current = false;
    }
  };

  // Multiple Image Selection (Messenger Inspiration)
  const handlePickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showError(
          "Permission Required",
          "Please grant photo library permissions to send images.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
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

  const handleSendMultipleImages = async (
    assets: ImagePicker.ImagePickerAsset[],
  ) => {
    if (!assets || assets.length === 0) return;
    shouldScrollToEndRef.current = true;
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
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
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
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        showError(
          "Permission Required",
          "Please grant camera permissions to capture photos.",
        );
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

  // Horizontal Action Bar Handlers: Reply, Copy, Delete
  const handleReplyAction = () => {
    if (!selectedMessageForAction) return;
    const target = selectedMessageForAction;
    setSelectedMessageForAction(null);
    setReplyingToMessage(target);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  };

  const handleCopyAction = async () => {
    if (!selectedMessageForAction) return;
    const target = selectedMessageForAction;
    setSelectedMessageForAction(null);
    const { cleanText } = parseReplyData(target.text);
    const textToCopy =
      cleanText || target.text || (target.image_url ? "Photo link" : "");
    if (textToCopy) {
      await copyToClipboard(textToCopy);
    }
    setShowCopiedToast(true);
    setTimeout(() => {
      setShowCopiedToast(false);
    }, 1500);
  };

  const handleDeleteAction = () => {
    if (!selectedMessageForAction) return;
    const target = selectedMessageForAction;
    setSelectedMessageForAction(null);
    if (parseReceiptData(target.text)) {
      showError(
        "Protected Receipt",
        "Official payment receipts cannot be deleted as transaction proof.",
      );
      return;
    }
    setMessageToDelete(target);
  };

  const handleConfirmDeleteForMe = () => {
    if (!messageToDelete) return;
    if (parseReceiptData(messageToDelete.text)) {
      showError(
        "Protected Receipt",
        "Official payment receipts cannot be deleted as transaction proof.",
      );
      setMessageToDelete(null);
      return;
    }
    const targetId = messageToDelete.id;
    setDeletedForMeIds((prev) => new Set(prev).add(targetId));
    setMessages((prev) => prev.filter((m) => m.id !== targetId));
    setMessageToDelete(null);
  };

  const handleConfirmDeleteForEveryone = async () => {
    if (!messageToDelete) return;
    if (parseReceiptData(messageToDelete.text)) {
      showError(
        "Protected Receipt",
        "Official payment receipts cannot be deleted as transaction proof.",
      );
      setMessageToDelete(null);
      return;
    }
    const target = messageToDelete;
    setMessageToDelete(null);

    // Optimistically remove from list immediately
    setMessages((prev) => prev.filter((m) => m.id !== target.id));

    try {
      await deleteMessage(target.id);
    } catch (e: any) {
      console.log("Could not delete message for everyone:", e);
      loadThreadSilent();
    }
  };

  const displayName =
    chatUser?.business_name ||
    chatUser?.name ||
    name ||
    (user?.role === "operator" ? "Customer" : "Vehicle Host");

  const operatorPhone =
    chatUser?.business_contact_number || chatUser?.mobile_number;
  const paymentInfo = bookingContext?.operator_payment_info;

  // The recipient of rental payments on official receipts is ALWAYS the Operator / Host's REAL name
  const resolvedOperatorName = (() => {
    if (user?.role === "operator") {
      const real =
        `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
        user?.name;
      return real || "Vehicle Host";
    }
    const realChatUser =
      `${chatUser?.first_name || ""} ${chatUser?.last_name || ""}`.trim() ||
      chatUser?.name;
    return realChatUser || "Vehicle Host";
  })();

  const resolvedOperatorPhone = (() => {
    if (user?.role === "operator") {
      const opProfile =
        (user as any)?.operatorProfile || (user as any)?.operator_profile;
      return (
        opProfile?.account_number ||
        (user as any)?.phone_number ||
        (user as any)?.mobile_number ||
        operatorPhone
      );
    }
    const opInfo = bookingContext?.operator_payment_info;
    return opInfo?.account_number || operatorPhone;
  })();

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      <View style={styles.chatContent}>
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
            onPress={() =>
              chatUser?.role === "operator" &&
              router.push(`/operator/${id}` as any)
            }
            activeOpacity={chatUser?.role === "operator" ? 0.75 : 1}
          >
            {/* Avatar with Online Badge */}
            <View style={styles.avatarWrapper}>
              {chatUser?.profile_photo ? (
                <Image
                  source={{ uri: chatUser.profile_photo }}
                  style={styles.headerAvatar}
                  contentFit="cover"
                />
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
                  {chatUser?.role === "operator" ? "Operator" : "Active now"}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Right Header Actions */}
          <View style={styles.headerActionsRow}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => {
                if (chatUser) {
                  startCall(chatUser);
                } else if (id) {
                  startCall({
                    id: parseInt(id, 10),
                    name: displayName,
                    role: user?.role === "operator" ? "renter" : "operator",
                  });
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={18} color={Colors.dark} />
            </TouchableOpacity>
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
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    flex: 1,
                  }}
                >
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
                      <Text style={styles.amountVal}>
                        ₱{bookingContext.total_price.toLocaleString()}
                      </Text>
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
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 5,
                          marginBottom: 4,
                        }}
                      >
                        <Ionicons
                          name="shield-checkmark"
                          size={14}
                          color="#166534"
                        />
                        <Text style={styles.paymentInfoTitle}>
                          Host Payment Details (
                          {paymentInfo.business_name || "Verified"})
                        </Text>
                      </View>

                      {paymentInfo.account_name && (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Account Name:</Text>
                          <Text style={styles.infoValue}>
                            {paymentInfo.account_name}
                          </Text>
                        </View>
                      )}
                      {paymentInfo.account_number && (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>GCash / Bank No:</Text>
                          <Text
                            style={[
                              styles.infoValue,
                              { fontFamily: FontFamily.bold },
                            ]}
                          >
                            {paymentInfo.account_number}
                          </Text>
                        </View>
                      )}

                      {paymentInfo.qr_code_url ? (
                        <TouchableOpacity
                          style={styles.qrRow}
                          onPress={() =>
                            setSelectedViewerImage(
                              paymentInfo.qr_code_url || null,
                            )
                          }
                          activeOpacity={0.8}
                        >
                          <Image
                            source={{ uri: paymentInfo.qr_code_url }}
                            style={styles.qrThumb}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.infoLabel,
                                { fontFamily: FontFamily.medium },
                              ]}
                            >
                              Payment QR Code attached
                            </Text>
                            <Text
                              style={{ fontSize: 10, color: Colors.secondary }}
                            >
                              Tap to view & scan QR
                            </Text>
                          </View>
                          <Ionicons
                            name="expand-outline"
                            size={16}
                            color="#0F172A"
                          />
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
              initialNumToRender={12}
              maxToRenderPerBatch={8}
              updateCellsBatchingPeriod={50}
              windowSize={7}
              removeClippedSubviews={Platform.OS === "android"}
              onContentSizeChange={() => {
                if (shouldScrollToEndRef.current) {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }
              }}
              ListHeaderComponent={
                hasMore ? (
                  <View style={styles.loadMoreWrap}>
                    {loadingEarlier ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <TouchableOpacity
                        style={styles.loadMoreBtn}
                        onPress={handleLoadEarlier}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color="#64748B"
                        />
                        <Text style={styles.loadMoreText}>
                          Load earlier messages
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null
              }
              ListEmptyComponent={
                !sending && messages.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyTitle}>Start a Conversation</Text>
                    <Text style={styles.emptySub}>
                      Discuss payment details, send receipts orphotos, and
                      coordinate rental pickup!
                    </Text>
                  </View>
                ) : null
              }
              renderItem={({ item }) => {
                const isUser = item.sender === "user";
                const parsed = parseReplyData(item.text);
                const receipt = parseReceiptData(parsed.cleanText);
                const callLog = parseCallData(parsed.cleanText || item.text);
                const hasImage = Boolean(item.image_url);
                const hasText = Boolean(parsed.cleanText);
                const isImageOnly =
                  hasImage && !hasText && !parsed.reply && !receipt && !callLog;

                return (
                  <View
                    style={[
                      styles.messageBubbleWrap,
                      isUser
                        ? styles.userBubbleWrap
                        : styles.operatorBubbleWrap,
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        styles.messageBubble,
                        receipt
                          ? styles.receiptBubble
                          : isImageOnly
                            ? styles.imageOnlyBubble
                            : callLog
                              ? styles.callLogBubble
                              : isUser
                                ? styles.userBubble
                                : styles.operatorBubble,
                        parsed.reply ? styles.replyBubbleWrap : null,
                      ]}
                      onLongPress={() => {
                        if (receipt || callLog) return;
                        setSelectedMessageForAction(item);
                      }}
                      delayLongPress={220}
                      activeOpacity={
                        receipt || isImageOnly || callLog ? 1 : 0.92
                      }
                    >
                      {/* Quoted Reply Preview inside bubble (No author label, just the message snippet) */}
                      {parsed.reply ? (
                        <View
                          style={[
                            styles.quotedReplyBubble,
                            isUser
                              ? styles.quotedReplyBubbleUser
                              : styles.quotedReplyBubbleOperator,
                          ]}
                        >
                          <View
                            style={[
                              styles.quotedBar,
                              isUser
                                ? styles.quotedBarUser
                                : styles.quotedBarOperator,
                            ]}
                          />
                          <View
                            style={{
                              flex: 1,
                              paddingVertical: 2,
                              paddingRight: 4,
                            }}
                          >
                            <Text
                              style={[
                                styles.quotedSnippet,
                                isUser
                                  ? styles.quotedSnippetUser
                                  : styles.quotedSnippetOperator,
                              ]}
                              numberOfLines={4}
                            >
                              {parsed.reply.snippet}
                            </Text>
                          </View>
                        </View>
                      ) : null}

                      {/* Image Attachment in Chat (Natural aspect ratio, no bubble container when standalone) */}
                      {item.image_url ? (
                        <ChatImage
                          uri={item.image_url}
                          isAlone={isImageOnly}
                          onPress={() =>
                            setSelectedViewerImage(item.image_url || null)
                          }
                          onLongPress={() => setSelectedMessageForAction(item)}
                        />
                      ) : null}

                      {/* Payment details submitted in chat or Standard Text */}
                      {receipt ? (
                        <View style={styles.gcashReceiptCardWrap}>
                          {/* Blue top curved container with floating checkmark */}
                          <View style={styles.gcashCardHeaderTop}>
                            <View style={styles.gcashCheckmarkBadge}>
                              <Ionicons
                                name="document-text-outline"
                                size={24}
                                color="#FFFFFF"
                              />
                            </View>
                          </View>

                          {/* White Main Card Body */}
                          <View style={styles.gcashWhiteCard}>
                            {/* Recipient Name - Always the operator's real name masked */}
                            <Text
                              style={styles.gcashRecipientName}
                              numberOfLines={1}
                            >
                              {maskName(
                                resolvedOperatorName &&
                                  resolvedOperatorName !== "Vehicle Host"
                                  ? resolvedOperatorName
                                  : receipt.recipient || "Vehicle Host",
                              )}
                            </Text>

                            {/* Recipient Phone Pill */}
                            <View style={styles.gcashPhonePill}>
                              <Text style={styles.gcashPhoneText}>
                                {maskPhone(
                                  receipt.phone || resolvedOperatorPhone,
                                )}
                              </Text>
                            </View>

                            {/* Subtitle */}
                            <Text style={styles.gcashSubtitle}>
                              Payment record •{" "}
                              {receipt.method || "Method not provided"}
                            </Text>
                            <Text style={styles.gcashSubtitle}>
                              Confirm receipt with the host
                            </Text>

                            {/* Thin Divider */}
                            <View style={styles.gcashDivider} />

                            {/* Amount Row */}
                            <View style={styles.gcashRow}>
                              <Text style={styles.gcashRowLabel}>Amount</Text>
                              <Text style={styles.gcashRowValue}>
                                {(() => {
                                  const num = parseFloat(
                                    (receipt.amount || "").replace(
                                      /[^0-9.]/g,
                                      "",
                                    ),
                                  );
                                  return isNaN(num)
                                    ? "Not provided"
                                    : num.toFixed(2);
                                })()}
                              </Text>
                            </View>

                            {/* Thin Divider */}
                            <View style={styles.gcashDivider} />

                            {/* Total Amount Sent Row */}
                            <View style={styles.gcashTotalRow}>
                              <Text style={styles.gcashTotalLabel}>
                                Reported Amount
                              </Text>
                              <Text style={styles.gcashTotalValue}>
                                ₱{" "}
                                {(() => {
                                  const num = parseFloat(
                                    (receipt.amount || "").replace(
                                      /[^0-9.]/g,
                                      "",
                                    ),
                                  );
                                  return isNaN(num)
                                    ? "Not provided"
                                    : num.toFixed(2);
                                })()}
                              </Text>
                            </View>

                            {/* Soft Ice Blue Footer with Copyable Ref & Timestamp */}
                            <TouchableOpacity
                              activeOpacity={0.75}
                              style={styles.gcashFooter}
                              onPress={async () => {
                                const ref = receipt.reference;
                                if (!ref) return;
                                await copyToClipboard(ref);
                                setShowCopiedToast(true);
                                setTimeout(
                                  () => setShowCopiedToast(false),
                                  1500,
                                );
                              }}
                            >
                              <Text style={styles.gcashRefText}>
                                Ref No.{" "}
                                <Text style={styles.gcashRefNum}>
                                  {receipt.reference || "Not provided"}
                                </Text>
                              </Text>
                              <Text style={styles.gcashDateText}>
                                {formatReceiptDateTime(item.created_at)}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : callLog ? (
                        <TouchableOpacity
                          style={styles.callLogCard}
                          onPress={() => {
                            if (chatUser) {
                              startCall(chatUser);
                            } else if (id) {
                              startCall({
                                id: parseInt(id, 10),
                                name: displayName,
                                role:
                                  user?.role === "operator"
                                    ? "renter"
                                    : "operator",
                              });
                            }
                          }}
                          activeOpacity={0.8}
                        >
                          <View
                            style={[
                              styles.callLogIconWrap,
                              callLog.type === "missed"
                                ? styles.callLogIconMissed
                                : styles.callLogIconVoice,
                            ]}
                          >
                            <Ionicons
                              name="call"
                              size={18}
                              color={
                                callLog.type === "missed"
                                  ? "#EF4444"
                                  : "#10B981"
                              }
                              style={
                                callLog.type === "missed"
                                  ? { transform: [{ rotate: "135deg" }] }
                                  : undefined
                              }
                            />
                          </View>
                          <View style={styles.callLogTextCol}>
                            <Text style={styles.callLogTitle}>
                              {callLog.type === "missed"
                                ? "Missed Call"
                                : "Voice Call"}
                            </Text>
                            <Text style={styles.callLogSubtitle}>
                              {callLog.type === "missed"
                                ? "Tap to call back"
                                : callLog.duration > 0
                                  ? `${formatCallDurationText(callLog.duration)} • Tap to call back`
                                  : "Tap to call back"}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ) : parsed.cleanText ? (
                        <Text
                          style={[
                            styles.messageText,
                            isUser
                              ? styles.userMessageText
                              : styles.operatorMessageText,
                          ]}
                        >
                          {parsed.cleanText}
                        </Text>
                      ) : null}
                    </TouchableOpacity>

                    {/* Time & Delivery Status Indicator (Placed Outside the Bubble) */}
                    {!receipt ? (
                      <View
                        style={[
                          styles.outsideFooter,
                          isUser
                            ? styles.outsideFooterUser
                            : styles.outsideFooterOperator,
                        ]}
                      >
                        <Text
                          style={[
                            styles.outsideTimeText,
                            isUser
                              ? styles.outsideUserTimeText
                              : styles.outsideOperatorTimeText,
                          ]}
                        >
                          {item.time}
                        </Text>
                        {isUser && (
                          <View style={styles.outsideStatusWrap}>
                            <Ionicons
                              name={
                                item.is_read ? "checkmark-done" : "checkmark"
                              }
                              size={13}
                              color={item.is_read ? "#3B82F6" : "#94A3B8"}
                            />
                            {item.is_read ? (
                              <Text style={styles.outsideSeenText}>Seen</Text>
                            ) : null}
                          </View>
                        )}
                      </View>
                    ) : null}
                  </View>
                );
              }}
            />
          )}

          {/* Replying Preview Banner (No author label, just the message snippet) */}
          {replyingToMessage && (
            <View style={styles.replyBar}>
              <View style={styles.replyBarAccent} />
              <View style={styles.replyBarTextCol}>
                <Text style={styles.replyBarSnippet} numberOfLines={2}>
                  {parseReplyData(replyingToMessage.text).cleanText ||
                    (replyingToMessage.image_url ? "📷 Photo" : "")}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.replyBarCloseBtn}
                onPress={() => setReplyingToMessage(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={Colors.secondary}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Input Bar with Photo Picker */}
          <View style={styles.inputContainer}>
            {/* Camera Button */}
            <TouchableOpacity
              style={styles.attachButton}
              onPress={handleTakePhoto}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={22} color={Colors.dark} />
            </TouchableOpacity>

            {/* Multiple Gallery Photos Button */}
            <TouchableOpacity
              style={styles.attachButton}
              onPress={handlePickImage}
              activeOpacity={0.7}
            >
              <Ionicons name="images-outline" size={21} color={Colors.dark} />
            </TouchableOpacity>

            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="message"
              placeholderTextColor={Colors.secondary}
              value={inputMessage}
              onChangeText={setInputMessage}
              multiline
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                inputMessage.trim() || sending
                  ? styles.sendButtonActive
                  : styles.sendButtonDisabled,
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

        {/* Horizontal Action Bar on Bubble Long-Press (Reply, Copy, Delete) */}
        <Modal
          visible={!!selectedMessageForAction}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedMessageForAction(null)}
        >
          <Pressable
            style={styles.horizontalBackdrop}
            onPress={() => setSelectedMessageForAction(null)}
          >
            <View style={styles.horizontalBarCard}>
              {/* Reply */}
              <TouchableOpacity
                style={styles.horizontalActionBtn}
                onPress={handleReplyAction}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="arrow-undo-outline"
                  size={20}
                  color={Colors.dark}
                />
                <Text style={styles.horizontalActionText}>Reply</Text>
              </TouchableOpacity>

              <View style={styles.horizontalDivider} />

              {/* Copy */}
              <TouchableOpacity
                style={styles.horizontalActionBtn}
                onPress={handleCopyAction}
                activeOpacity={0.7}
              >
                <Ionicons name="copy-outline" size={20} color={Colors.dark} />
                <Text style={styles.horizontalActionText}>Copy</Text>
              </TouchableOpacity>

              <View style={styles.horizontalDivider} />

              {/* Delete or Protected Receipt */}
              {selectedMessageForAction &&
              parseReceiptData(selectedMessageForAction.text) ? (
                <View style={[styles.horizontalActionBtn, { opacity: 0.6 }]}>
                  <Ionicons name="lock-closed" size={18} color="#64748B" />
                  <Text
                    style={[styles.horizontalActionText, { color: "#64748B" }]}
                  >
                    Protected
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.horizontalActionBtn}
                  onPress={handleDeleteAction}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  <Text
                    style={[styles.horizontalActionText, { color: "#EF4444" }]}
                  >
                    Delete
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        </Modal>

        {/* Delete Choice Bottom Sheet: Delete for Me vs Delete for Everyone */}
        <AppBottomSheet
          visible={!!messageToDelete}
          onClose={() => setMessageToDelete(null)}
          position="bottom"
          showHandle={true}
          sheetStyle={styles.deleteSheet}
        >
          <View style={styles.deleteSheetContent}>
            <Text style={styles.deleteSheetTitle}>Delete Message</Text>
            <Text style={styles.deleteSheetSubtitle}>
              Choose how you want to delete this message.
            </Text>

            <TouchableOpacity
              style={styles.deleteOptionCard}
              onPress={handleConfirmDeleteForMe}
              activeOpacity={0.7}
            >
              <View style={styles.deleteOptionIconWrap}>
                <Ionicons name="person-outline" size={20} color={Colors.dark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.deleteOptionTitle}>Delete for me</Text>
                <Text style={styles.deleteOptionDesc}>
                  Removes this message from your chat screen.
                </Text>
              </View>
            </TouchableOpacity>

            {messageToDelete?.sender === "user" ? (
              <TouchableOpacity
                style={[
                  styles.deleteOptionCard,
                  { borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
                ]}
                onPress={handleConfirmDeleteForEveryone}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.deleteOptionIconWrap,
                    { backgroundColor: "#FEE2E2" },
                  ]}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.deleteOptionTitle, { color: "#EF4444" }]}
                  >
                    Delete for everyone
                  </Text>
                  <Text style={[styles.deleteOptionDesc, { color: "#B91C1C" }]}>
                    Permanently deletes this message for all participants.
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.deleteNoticeBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color="#64748B"
                />
                <Text style={styles.deleteNoticeText}>
                  You can only delete messages sent by you for everyone.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.deleteCancelBtn}
              onPress={() => setMessageToDelete(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </AppBottomSheet>

        {/* Floating Copied Toast Pill */}
        {showCopiedToast && (
          <View style={styles.copiedToastWrap} pointerEvents="none">
            <View style={styles.copiedToastPill}>
              <Ionicons name="checkmark-circle" size={15} color="#10B981" />
              <Text style={styles.copiedToastText}>Copied</Text>
            </View>
          </View>
        )}

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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  chatContent: {
    flex: 1,
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
    justifyContent: "flex-start",
    paddingTop: 32,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.dark,
    textAlign: "center",
  },
  emptySub: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 8,
    paddingHorizontal: Spacing.sm,
  },
  loadMoreWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginBottom: 6,
  },
  loadMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  loadMoreText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: "#475569",
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
    alignItems: "flex-end",
  },
  operatorBubbleWrap: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  messageBubble: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 18,
  },
  imageOnlyBubble: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
    borderRadius: 16,
    shadowColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
  },
  callLogBubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 220,
  },
  callLogCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  callLogIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  callLogIconVoice: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  callLogIconMissed: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  callLogTextCol: {
    flex: 1,
  },
  callLogTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: "#0F172A",
  },
  callLogSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
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
  chatImageWrap: {
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
  },
  chatImageAlone: {
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  chatImageWithText: {
    marginBottom: 6,
    borderRadius: 12,
  },
  chatImageFill: {
    width: "100%",
    height: "100%",
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
  outsideFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    marginHorizontal: 4,
    gap: 4,
  },
  outsideFooterUser: {
    alignSelf: "flex-end",
    justifyContent: "flex-end",
  },
  outsideFooterOperator: {
    alignSelf: "flex-start",
    justifyContent: "flex-start",
  },
  outsideTimeText: {
    fontFamily: FontFamily.regular,
    fontSize: 10.5,
    color: "#94A3B8",
  },
  outsideUserTimeText: {
    color: "#94A3B8",
  },
  outsideOperatorTimeText: {
    color: "#94A3B8",
  },
  outsideStatusWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginLeft: 2,
  },
  outsideSeenText: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: "#3B82F6",
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
  seenBadgeText: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: "#60A5FA",
    marginLeft: 3,
  },
  replyBubbleWrap: {
    minWidth: 180,
    maxWidth: "92%",
  },
  // Quoted reply inside message bubble
  quotedReplyBubble: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.06)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 6,
    alignSelf: "stretch",
    flexShrink: 1,
  },
  quotedReplyBubbleUser: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  quotedReplyBubbleOperator: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  quotedBar: {
    width: 3.5,
    borderRadius: 2,
    marginRight: 7,
  },
  quotedBarUser: {
    backgroundColor: "#FEF08A",
  },
  quotedBarOperator: {
    backgroundColor: Colors.primary,
  },
  quotedAuthor: {
    fontFamily: FontFamily.bold,
    fontSize: 11.5,
    marginBottom: 1,
  },
  quotedAuthorUser: {
    color: "#FEF08A",
  },
  quotedAuthorOperator: {
    color: Colors.dark,
  },
  quotedSnippet: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 16.5,
    flexShrink: 1,
  },
  quotedSnippetUser: {
    color: "rgba(255, 255, 255, 0.85)",
  },
  quotedSnippetOperator: {
    color: "#64748B",
  },

  // Replying preview banner above input
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  replyBarAccent: {
    width: 3.5,
    height: "100%",
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  replyBarTextCol: {
    flex: 1,
  },
  replyBarAuthor: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },
  replyBarSnippet: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.dark,
    lineHeight: 18,
  },
  replyBarCloseBtn: {
    padding: 4,
  },

  // Horizontal Action Bar Modal (Positioned cleanly at bottom with good spacing)
  horizontalBackdrop: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 64 : 52,
  },
  horizontalBarCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  horizontalActionBtn: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 16,
    gap: 4,
  },
  horizontalActionText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.dark,
  },
  horizontalDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#E2E8F0",
  },

  // Delete Options Bottom Sheet
  deleteSheet: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  deleteSheetContent: {
    width: "100%",
  },
  deleteSheetTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.dark,
    marginBottom: 4,
  },
  deleteSheetSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    marginBottom: 16,
  },
  deleteOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  deleteOptionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EDF2F7",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteOptionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  deleteOptionDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  deleteNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  deleteNoticeText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: "#64748B",
    flex: 1,
  },
  deleteCancelBtn: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  deleteCancelText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: "#475569",
  },

  // Floating Copied Toast Pill
  copiedToastWrap: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  copiedToastPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  copiedToastText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.white,
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

  // Authentic GCash Receipt Card Styles (Pixel-perfect matching official GCash receipt)
  receiptBubble: {
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    width: 292,
    maxWidth: "94%",
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  gcashReceiptCardWrap: {
    width: "100%",
    backgroundColor: "#0066F5",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  gcashCardHeaderTop: {
    height: 38,
    backgroundColor: "#0066F5",
    alignItems: "center",
    justifyContent: "flex-end",
    position: "relative",
  },
  gcashCheckmarkBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0066F5",
    borderWidth: 3.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 14,
    zIndex: 10,
  },
  gcashWhiteCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    paddingTop: 32,
    alignItems: "center",
    overflow: "hidden",
  },
  gcashRecipientName: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: "#0047BA",
    letterSpacing: 0.2,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  gcashPhonePill: {
    backgroundColor: "#EDF4FF",
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 16,
    marginTop: 8,
    alignSelf: "center",
  },
  gcashPhoneText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    color: "#0047BA",
    letterSpacing: 0.5,
  },
  gcashSubtitle: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: "#8C9DAE",
    marginTop: 8,
    marginBottom: 18,
    textAlign: "center",
  },
  gcashDivider: {
    height: 1,
    backgroundColor: "#EDF2F7",
    width: "88%",
    alignSelf: "center",
  },
  gcashRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "88%",
    paddingVertical: 14,
  },
  gcashRowLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: "#0F172A",
  },
  gcashRowValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15.5,
    color: "#0F172A",
  },
  gcashTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "88%",
    paddingTop: 16,
    paddingBottom: 22,
  },
  gcashTotalLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: "#0047BA",
  },
  gcashTotalValue: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: "#0047BA",
  },
  gcashFooter: {
    backgroundColor: "#F4F8FD",
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  gcashRefText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: "#7E8B9B",
  },
  gcashRefNum: {
    fontFamily: FontFamily.bold,
    color: "#0047BA",
  },
  gcashDateText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: "#7E8B9B",
    marginTop: 4,
  },
  receiptTimeText: {
    color: "#64748B",
  },
});
