import api from "@/services/api";

export interface Booking {
  id: number;
  renter_id: number;
  vehicle_id: number;
  operator_id: number;
  start_date: string;
  end_date: string;
  actual_start_time?: string;
  actual_end_time?: string;
  start_mileage?: number;
  start_fuel_level?: number;
  start_inspection_notes?: string;
  start_inspection_photos?: string[];
  end_mileage?: number;
  end_fuel_level?: number;
  distance_traveled?: number;
  end_inspection_notes?: string;
  end_inspection_photos?: string[];
  fuel_charge?: number;
  damage_charge?: number;
  late_fee?: number;
  other_charges?: number;
  final_amount_due?: number;
  total_days: number;
  daily_rate: number;
  reservation_fee: number;
  total_price: number;
  status:
    | "pending_payment"
    | "pending_verification"
    | "approved"
    | "awaiting_pickup"
    | "pickup_in_progress"
    | "ready_to_start"
    | "trip_in_progress"
    | "return_pending"
    | "ongoing"
    | "completed"
    | "cancelled"
    | "rejected"
    | "no_show";
  payment_status: "unpaid" | "paid_reservation" | "paid_full" | "refund_pending" | "refunded";
  payment_method?: string;
  payment_reference?: string;
  expires_at?: string;
  renter_refund_method?: string;
  renter_refund_account_name?: string;
  renter_refund_account_number?: string;
  refund_amount?: number;
  refund_status?: "pending" | "refunded" | "rejected";
  refund_reference?: string;
  refund_notes?: string;
  refunded_at?: string;
  rating?: number;
  review?: string;
  pickup_location?: string;
  notes?: string;
  is_multi_vehicle_rental?: boolean;
  secondary_driver_name?: string;
  secondary_driver_phone?: string;
  secondary_driver_license_front?: string;
  secondary_driver_license_back?: string;
  extension_days?: number;
  extension_end_date?: string;
  extended_end_date?: string;
  extension_price?: number;
  extension_fee?: number;
  extension_status?: "pending" | "approved" | "rejected";
  extension_payment_method?: string;
  extension_payment_reference?: string;
  extension_requested_at?: string;
  operator_payment_info?: {
    account_name?: string;
    account_number?: string;
    qr_code_url?: string;
    payment_methods?: string[];
  };
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
  secondary_driver_name?: string;
  secondary_driver_phone?: string;
  secondary_driver_license_front?: string;
  secondary_driver_license_back?: string;
}): Promise<Booking> => {
  const response = await api.post("/bookings", data);
  return response.data.data;
};

export const settleReservationPayment = async (
  bookingId: number | string,
  data: {
    payment_method: string;
    payment_reference?: string;
    renter_refund_method?: string;
    renter_refund_account_name?: string;
    renter_refund_account_number?: string;
  }
): Promise<Booking> => {
  const response = await api.post(`/bookings/${bookingId}/settle-payment`, data);
  return response.data.data;
};

export const processBookingRefund = async (
  bookingId: number | string,
  data: {
    refund_reference: string;
    refund_notes?: string;
  }
): Promise<Booking> => {
  const response = await api.post(`/bookings/${bookingId}/process-refund`, data);
  return response.data.data;
};

export const updateBookingStatus = async (
  bookingId: number | string,
  status:
    | "pending_payment"
    | "pending_verification"
    | "approved"
    | "awaiting_pickup"
    | "pickup_in_progress"
    | "ready_to_start"
    | "trip_in_progress"
    | "return_pending"
    | "ongoing"
    | "completed"
    | "cancelled"
    | "rejected"
    | "no_show"
): Promise<Booking> => {
  const response = await api.patch(`/bookings/${bookingId}/status`, { status });
  return response.data.data;
};

export const startTrip = async (
  bookingId: number | string,
  data: {
    start_mileage: number;
    start_fuel_level: number;
    start_inspection_notes?: string;
    start_inspection_photos?: string[];
  }
): Promise<Booking> => {
  const response = await api.post(`/bookings/${bookingId}/start-trip`, data);
  return response.data.data;
};

export const completeTrip = async (
  bookingId: number | string,
  data: {
    end_mileage: number;
    end_fuel_level: number;
    fuel_charge?: number;
    damage_charge?: number;
    late_fee?: number;
    other_charges?: number;
    end_inspection_notes?: string;
    end_inspection_photos?: string[];
  }
): Promise<Booking> => {
  const response = await api.post(`/bookings/${bookingId}/complete-trip`, data);
  return response.data.data;
};

export const sendBookingLocation = async (
  bookingId: number | string,
  data: {
    latitude: number;
    longitude: number;
    speed?: number;
    street?: string;
    barangay?: string;
    city?: string;
    location_address?: string;
  }
): Promise<{ success: boolean; data: any }> => {
  const response = await api.post(`/bookings/${bookingId}/location`, data);
  return response.data;
};

export const getBookingLocation = async (
  bookingId: number | string
): Promise<{
  success: boolean;
  data: {
    booking_id: number;
    vehicle_name?: string;
    status: string;
    current_latitude?: number;
    current_longitude?: number;
    current_street?: string;
    current_barangay?: string;
    current_city?: string;
    current_location_address?: string;
    current_speed?: number;
    last_location_updated_at?: string;
    last_updated_human?: string;
  };
}> => {
  const response = await api.get(`/bookings/${bookingId}/location`);
  return response.data;
};

export const submitBookingReview = async (
  bookingId: number | string,
  data: { rating: number; review?: string }
): Promise<Booking> => {
  const response = await api.post(`/bookings/${bookingId}/review`, data);
  return response.data.data;
};

export const deleteBooking = async (bookingId: number | string): Promise<boolean> => {
  const response = await api.delete(`/bookings/${bookingId}`);
  return response.data.success;
};

export const batchDeleteBookings = async (bookingIds: number[]): Promise<{ success: boolean; deleted_count: number }> => {
  const response = await api.post("/bookings/batch-delete", { booking_ids: bookingIds });
  return response.data;
};

export const requestBookingExtension = async (
  bookingId: number | string,
  data: {
    extension_end_date?: string;
    extended_end_date?: string;
    extension_payment_method: string;
    extension_payment_reference?: string;
  }
): Promise<Booking> => {
  const payload = {
    extension_end_date: data.extension_end_date || data.extended_end_date,
    extension_payment_method: data.extension_payment_method,
    extension_payment_reference: data.extension_payment_reference || "",
  };
  const response = await api.post(`/bookings/${bookingId}/request-extension`, payload);
  return response.data.data;
};

export const approveBookingExtension = async (bookingId: number | string): Promise<Booking> => {
  const response = await api.post(`/bookings/${bookingId}/approve-extension`);
  return response.data.data;
};

export const rejectBookingExtension = async (bookingId: number | string): Promise<Booking> => {
  const response = await api.post(`/bookings/${bookingId}/reject-extension`);
  return response.data.data;
};

export const confirmOperatorPayment = async (
  bookingId: number | string,
  data?: { payment_method?: string; payment_notes?: string }
): Promise<Booking> => {
  const response = await api.post(`/bookings/${bookingId}/confirm-payment`, data || {});
  return response.data.data;
};
