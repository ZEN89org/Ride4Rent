import api from "@/services/api";

export interface AssistantVehicle {
  id: string;
  name: string;
  price_per_day: number;
  rating?: number | null;
  rating_count?: number;
  seats?: number | null;
  transmission?: string | null;
  image_url?: string | null;
}

export interface AssistantResponse {
  knowledge_version?: string;
  reply: string;
  vehicles?: AssistantVehicle[];
  quick_replies?: string[];
}

export const sendAssistantMessage = async (message: string): Promise<AssistantResponse> => {
  try {
    const response = await api.post(
      "/assistant/chat",
      { message },
      { timeout: 25000 }
    );
    return response.data.data;
  } catch (error: any) {
    // If first request times out or hiccups during cold start, retry once
    const isNetworkOrTimeout =
      error.code === "ECONNABORTED" ||
      !error.response ||
      error.response?.status >= 500;

    if (isNetworkOrTimeout) {
      const retryResponse = await api.post(
        "/assistant/chat",
        { message },
        { timeout: 25000 }
      );
      return retryResponse.data.data;
    }
    throw error;
  }
};

