import api from "@/services/api";

export interface Booking {
  id: number;
  renter_id: number;
  vehicle_id: number;
  operator_id: number;
  start_date: string;
  end_date: string;
  total_days: number;
  daily_rate: number;
  reservation_fee: number;
  total_price: number;
  status:
    | "pending_payment"
    | "pending_verification"
    | "approved"
    | "ongoing"
    | "completed"
    | "cancelled"
    | "rejected";
  payment_status: "unpaid" | "paid_reservation" | "paid_full";
  payment_method?: string;
  payment_reference?: string;
  rating?: number;
  review?: string;
  pickup_location?: string;
  notes?: string;
  created_at: string;
  vehicle?: any;
  operator?: any;
  renter?: any;
}

export const getMyBookings = async (): Promise<Booking[]> => {
  const response = await api.get("/bookings");
  return response.data.data;
};

export const createBooking = async (data: {
  vehicle_id: number | string;
  start_date: string;
  end_date: string;
  notes?: string;
}): Promise<Booking> => {
  const response = await api.post("/bookings", data);
  return response.data.data;
};

export const settleReservationPayment = async (
  bookingId: number | string,
  data: { payment_method: string; payment_reference?: string }
): Promise<Booking> => {
  const response = await api.post(`/bookings/${bookingId}/settle-payment`, data);
  return response.data.data;
};

export const updateBookingStatus = async (
  bookingId: number | string,
  status:
    | "pending_payment"
    | "pending_verification"
    | "approved"
    | "ongoing"
    | "completed"
    | "cancelled"
    | "rejected"
): Promise<Booking> => {
  const response = await api.patch(`/bookings/${bookingId}/status`, { status });
  return response.data.data;
};

export const submitBookingReview = async (
  bookingId: number | string,
  data: { rating: number; review?: string }
): Promise<Booking> => {
  const response = await api.post(`/bookings/${bookingId}/review`, data);
  return response.data.data;
};
