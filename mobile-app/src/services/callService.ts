import api from "@/services/api";

export interface CallUser {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  role: string;
  profile_photo?: string | null;
  business_name?: string;
}

export interface ActiveCallData {
  id: string;
  caller_id: number;
  receiver_id: number;
  status: "calling" | "ringing" | "accepted" | "declined" | "missed" | "ended";
  channel_name?: string;
  livekit_url?: string;
  livekit_token?: string;
  started_at?: string | null;
  ended_at?: string | null;
  duration?: number | null;
  created_at: string;
  caller: CallUser;
  receiver: CallUser;
}

export const initiateCall = async (receiverId: number | string): Promise<ActiveCallData> => {
  const res = await api.post("/calls/initiate", { receiver_id: receiverId });
  return res.data.data;
};

export const checkActiveCall = async (): Promise<{
  call: ActiveCallData | null;
  role: "caller" | "receiver" | null;
}> => {
  const res = await api.get("/calls/active");
  return {
    call: res.data.call || null,
    role: res.data.role || null,
  };
};

export const answerCall = async (callId: string | number): Promise<ActiveCallData> => {
  const res = await api.post(`/calls/${callId}/answer`);
  return res.data.data;
};

export const declineCall = async (callId: string | number): Promise<ActiveCallData> => {
  const res = await api.post(`/calls/${callId}/decline`);
  return res.data.data;
};

export const endCall = async (callId: string | number): Promise<ActiveCallData> => {
  const res = await api.post(`/calls/${callId}/end`);
  return res.data.data;
};
