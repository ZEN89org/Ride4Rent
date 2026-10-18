export interface OperatorRegisterData {
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;

  date_of_birth: string;
  sex: string;

  email: string;
  mobile_number: string;

  business_name: string;
  business_email: string;
  business_contact_number: string;

  street_address: string;
  barangay: string;
  municipality: string;
  latitude?: number | null;
  longitude?: number | null;

  government_id_front?: string;
  government_id_back?: string;

  business_permit_front?: string;
  business_permit_back?: string;

  dti_sec_registration?: string;

  accepted_payment_methods: string[];

  account_name?: string;
  account_number?: string;
  qr_code?: string;

  otp?: string;

  password: string;
  password_confirmation: string;
}

export interface OperatorProfile {
  id: number;
  user_id: number;

  business_name: string;
  business_email: string;
  business_contact_number: string;

  street_address: string;
  barangay: string;
  municipality: string;
  latitude: number | null;
  longitude: number | null;

  government_id_front: string | null;
  government_id_back: string | null;

  business_permit_front: string | null;
  business_permit_back: string | null;

  dti_sec_registration: string | null;

  accepted_payment_methods: string[];

  account_name: string | null;
  account_number: string | null;
  qr_code: string | null;

  rejection_reason: string | null;
  reviewed_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface OperatorStatus {
  role: "operator";
  account_status: "pending" | "active" | "rejected";
  operator_profile: OperatorProfile;
}

export interface RevenueBookingItem {
  id: number;
  booking_code: string;
  vehicle_name: string;
  renter_name: string;
  start_date: string | null;
  end_date: string | null;
  completed_at: string;
  base_rental: number;
  surcharges: number;
  gross_total: number;
  commission_percent: number;
  commission_amount: number;
  net_amount: number;
}

export interface AvailableMonth {
  month: string;
  label: string;
  count: number;
}

export interface OperatorRevenueData {
  month: string;
  month_label: string;
  cycle_start: string;
  cycle_end: string;
  is_current_cycle: boolean;
  days_remaining_in_cycle: number;
  commission_percent: number;
  gross_revenue: number;
  commission_due: number;
  net_earnings: number;
  completed_bookings_count: number;
  active_bookings_count: number;
  available_months: AvailableMonth[];
  bookings: RevenueBookingItem[];
}
