import api from "@/services/api";

export interface ChatThreadMessage {
  id: string;
  sender: "user" | "other";
  text: string;
  time: string;
  created_at: string;
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
}

export const getConversations = async (): Promise<ConversationItem[]> => {
  const response = await api.get("/messages/conversations");
  return response.data.data;
};

export const getChatThread = async (
  otherUserId: number | string
): Promise<{ other_user: any; messages: ChatThreadMessage[] }> => {
  const response = await api.get(`/messages/thread/${otherUserId}`);
  return {
    other_user: response.data.other_user,
    messages: response.data.data,
  };
};

export const sendMessage = async (data: {
  receiver_id: number | string;
  message: string;
  vehicle_id?: number | string;
}): Promise<ChatThreadMessage> => {
  const response = await api.post("/messages/send", data);
  return response.data.data;
};
