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
  balance_due?: number;
  rental_paid_amount?: number;
  rental_balance_paid_at?: string;
  reservation_paid_at?: string;
  extension_paid_total?: number;
  pickup_at?: string;
  return_at?: string;
  booked_return_at?: string;
  early_return_status?: "pending" | "approved" | "declined" | "withdrawn" | "completed";
  early_return_requested_for?: string;
  early_return_requested_at?: string;
  early_return_reason?: string;
  early_return_response?: string;
  returned_early?: boolean;
  early_return_refund_amount?: number;
  early_return_refund_method?: string;
  early_return_refund_reference?: string;
  early_return_refund_reason?: string;
  early_return_refund_recorded_at?: string;
  early_return_refund_received_at?: string;
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
  extension_return_time?: string;
  extended_end_date?: string;
  extension_price?: number;
  extension_fee?: number;
  extension_status?: "pending_verification" | "pending" | "payment_required" | "approved" | "rejected";
  extension_payment_method?: string;
  extension_payment_reference?: string;
  extension_requested_at?: string;
  operator_payment_info?: {
    account_name?: string;
    account_number?: string;
    qr_code_url?: string;
    payment_methods?: string[];
  };
  updated_at?: string;
  extension_notes?: string;
  extension_decision_note?: string;
  extension_payment_review_note?: string;
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
  pickup_time?: string;
  return_time?: string;
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
    | "no_show",
  options?: { license_rejected?: boolean; rejection_reason?: string }
): Promise<Booking> => {
  const response = await api.patch(`/bookings/${bookingId}/status`, { status, ...options });
  return response.data.data;
};

export const startTrip = async (
  bookingId: number | string,
  data:
    | {
        rental_balance_collected: boolean;
        start_mileage: number;
        start_fuel_level: number;
        start_inspection_notes?: string;
        start_inspection_photos?: string[];
      }
    | FormData
): Promise<Booking> => {
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
  const response = await api.post(
    `/bookings/${bookingId}/start-trip`,
    data,
    isFormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined
  );
  return response.data.data;
};

export const completeTrip = async (
  bookingId: number | string,
  data:
    | {
        settlement_confirmed: boolean;
        end_mileage: number;
        end_fuel_level: number;
        fuel_charge?: number;
        damage_charge?: number;
        late_fee?: number;
        other_charges?: number;
        end_inspection_notes?: string;
        end_inspection_photos?: string[];
      }
    | FormData
): Promise<Booking> => {
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
  const response = await api.post(
    `/bookings/${bookingId}/complete-trip`,
    data,
    isFormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined
  );
  return response.data.data;
};

export const sendBookingLocation = async (
  bookingId: number | string,
  data: {
    latitude: number;
    longitude: number;
    speed?: number;
    accuracy?: number;
    street?: string;
    barangay?: string;
    city?: string;
    location_address?: string;
  }
): Promise<{ success: boolean; data: any }> => {
  const response = await api.post(`/bookings/${bookingId}/location`, data);
  return response.data;
};

export const reportTripLocationOff = async (bookingId: number, reason: "app_setting" | "permission_denied" | "device_location_off"): Promise<void> => {
  await api.post(`/bookings/${bookingId}/location-sharing`, { reason });
};

export const getBookingLocation = async (
  bookingId: number | string
): Promise<{
  success: boolean;
  data: {
    booking_id: number;
    location_sharing_status?: "on" | "off" | "unavailable" | null;
    location_sharing_reason?: string | null;
    outside_service_area?: boolean | null;
    vehicle_name?: string;
    status: string;
    current_latitude?: number;
    current_longitude?: number;
    current_street?: string;
    current_barangay?: string;
    current_city?: string;
    current_location_address?: string;
    current_speed?: number;
    operator_latitude?: number;
    operator_longitude?: number;
    operator_address?: string;
    operator_business_name?: string;
    renter_name?: string;
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
    extension_return_time?: string;
    extended_end_date?: string;
    extension_days?: number;
    extension_notes?: string;
  extension_decision_note?: string;
  extension_payment_review_note?: string;
    extension_payment_method?: string;
    extension_payment_reference?: string;
  }
): Promise<Booking> => {
  const payload = {
    extension_end_date: data.extension_end_date || data.extended_end_date,
    extended_end_date: data.extended_end_date || data.extension_end_date,
    extension_days: data.extension_days,
    extension_return_time: data.extension_return_time,
    extension_notes: data.extension_notes,
    extension_payment_method: data.extension_payment_method || "gcash",
    extension_payment_reference: data.extension_payment_reference || "0000000000000",
  };
  const response = await api.post(`/bookings/${bookingId}/request-extension`, payload);
  return response.data.data;
};

export const approveBookingExtension = async (bookingId: number | string): Promise<Booking> => {
  const response = await api.post(`/bookings/${bookingId}/approve-extension`);
  return response.data.data;
};

export const rejectBookingExtension = async (bookingId: number | string, reason?: string): Promise<Booking> => {
  const response = await api.post(`/bookings/${bookingId}/reject-extension`, { reason });
  return response.data.data;
};

export const settleBookingExtensionPayment = async (
  bookingId: number | string,
  data: {
    payment_method: string;
    payment_reference: string;
  }
): Promise<Booking> => {
  const response = await api.post(`/bookings/${bookingId}/settle-extension-payment`, data);
  return response.data.data;
};

export const confirmOperatorPayment = async (
  bookingId: number | string,
  data?: { payment_method?: string; payment_notes?: string }
): Promise<Booking> => {
  const response = await api.post(`/bookings/${bookingId}/confirm-payment`, data || {});
  return response.data.data;
};

export const confirmExtensionPayment = async (bookingId: number | string): Promise<Booking> => {
  const response = await api.post(`/bookings/${bookingId}/confirm-extension-payment`);
  return response.data.data;
};

export const earlyReturnAction = async (bookingId: number, action: "request" | "review" | "withdraw" | "refund" | "confirm", data: Record<string, unknown> = {}): Promise<Booking> => {
  const suffix = { request: "", review: "/review", withdraw: "/withdraw", refund: "/refund", confirm: "/refund/confirm" }[action];
  return (await api.post(`/bookings/${bookingId}/early-return${suffix}`, data)).data.data;
};

export const rejectExtensionPayment = async (bookingId: number, reason: string): Promise<Booking> => (await api.post(`/bookings/${bookingId}/reject-extension-payment`, { reason })).data.data;
