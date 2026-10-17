import api from "@/services/api";

export interface BookingContext {
  id: number;
  vehicle_id?: number;
  vehicle_name: string;
  vehicle_image?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  total_days?: number;
  total_price: number;
  reservation_fee: number;
  balance_due: number;
  status: string;
  payment_status: string;
  operator_payment_info?: {
    business_name?: string;
    account_name?: string;
    account_number?: string;
    accepted_payment_methods?: string[];
    qr_code_url?: string | null;
  } | null;
}

export interface ChatThreadMessage {
  id: string;
  sender: "user" | "other";
  sender_id?: number;
  text: string;
  image_url?: string | null;
  time: string;
  created_at: string;
  is_read?: boolean;
  reply_to?: { id: string; author: string; text: string } | null;
}

export interface ConversationItem {
  user_id: number;
  name: string;
  business_name?: string;
  role: string;
  profile_photo?: string | null;
  last_message: string;
  last_time: string;
  unread_count: number;
  archived?: boolean;
}

export const getConversations = async (): Promise<ConversationItem[]> => {
  const response = await api.get("/messages/conversations");
  return response.data.data;
};

export const archiveConversation = async (otherUserId: number): Promise<void> => {
  await api.post(`/messages/conversations/${otherUserId}/archive`);
};

export const restoreConversation = async (otherUserId: number): Promise<void> => {
  await api.delete(`/messages/conversations/${otherUserId}/archive`);
};

export const deleteConversation = async (otherUserId: number): Promise<void> => {
  await api.delete(`/messages/conversations/${otherUserId}`);
};

export const getChatThread = async (
  otherUserId: number | string,
  params?: { before_id?: string | number; limit?: number }
): Promise<{
  other_user: any;
  booking_context?: BookingContext | null;
  messages: ChatThreadMessage[];
  has_more?: boolean;
}> => {
  const response = await api.get(`/messages/thread/${otherUserId}`, { params });
  return {
    other_user: response.data.other_user,
    booking_context: response.data.booking_context,
    messages: response.data.data,
    has_more: Boolean(response.data.has_more),
  };
};

export const sendMessage = async (data: {
  receiver_id: number | string;
  message?: string;
  image_base64?: string;
  vehicle_id?: number | string;
}): Promise<ChatThreadMessage> => {
  const response = await api.post("/messages/send", data);
  return response.data.data;
};

export const deleteMessage = async (messageId: string | number): Promise<void> => {
  await api.delete(`/messages/${messageId}`);
};
