import api from "@/services/api";
import type { RenterViewProfile } from "@/components/common/RenterProfileContent";

export async function getRenterProfile(id: string): Promise<RenterViewProfile> {
  if (!/^\d+$/.test(id)) throw new Error("Invalid renter profile.");
  try {
    const response = await api.get<{ data: RenterViewProfile }>(`/operator/renters/${id}`);
    return response.data.data;
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status !== 404 && status !== 405) throw error;
    // Older deployments have no renter-profile endpoint. Use only an existing chat contact,
    // without marking messages read or exposing private license documents.
    const response = await api.get<{ data: { user_id: number; name: string; role: string; profile_photo?: string }[] }>("/messages/conversations");
    const contact = response.data.data.find(person => String(person.user_id) === id && ["customer", "renter"].includes(person.role));
    if (!contact) throw error;
    return { id: contact.user_id, first_name: contact.name, profile_photo: contact.profile_photo, can_review_license: false };
  }
}
