export interface VehicleImageItem {
  id: number;
  image_url: string;
  is_cover: boolean;
  sort_order: number;
}

export interface VehicleReviewItem {
  id: number;
  renter_name: string;
  renter_photo: string | null;
  rating: number;
  review: string | null;
  created_at: string;
}

export interface Vehicle {
  id: number;
  name: string;
  model?: string;
  year_model?: number | string;
  plate_number?: string;
  brand?: string;
  vehicle_type: string;
  body_type?: string;
  transmission: string | null;
  fuel_type?: string;
  seats: number | null;
  number_of_doors?: number | null;
  mileage?: number | null;
  interior_color?: string | null;
  exterior_color?: string | null;
  price_per_day: number;
  reservation_fee?: number;
  rating?: number;
  rating_count?: number;
  distance_km?: number;
  quantity?: number;
  available_units?: number;
  pickup_address?: string;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  location?: string;
  features?: string[];
  description: string | null;
  min_driver_age?: number;
  min_driving_experience?: string;
  fuel_policy?: string;
  late_return_policy?: string;
  cancellation_policy?: string;
  smoking_policy?: string;
  pet_policy?: string;
  additional_driver_policy?: string;
  other_policies?: string;
  image_url: string | null;
  images?: VehicleImageItem[];
  reviews?: VehicleReviewItem[];
  is_available: boolean;
  is_rented?: boolean;
  availability_status?: string;
  operator?: {
    id?: number;
    name?: string;
    profile_photo?: string | null;
    business_name: string | null;
    business_email?: string | null;
    business_contact_number?: string | null;
    street_address?: string | null;
    barangay?: string | null;
    municipality?: string | null;
  };
}

export interface VehicleFormData {
  name: string;
  model: string;
  year_model: string;
  plate_number: string;
  vehicle_type_id: string;
  brand_id: string;
  custom_brand?: string;
  body_type_id: string;
  transmission_type_id: string;
  fuel_type_id: string;
  seating_capacity: string;
  number_of_doors: string;
  mileage: string;
  interior_color: string;
  exterior_color: string;
  daily_rate: string;
  reservation_fee: string;
  available_from: string;
  available_until: string;
  min_driver_age: string;
  min_driving_experience: string;
  fuel_policy: string;
  late_return_policy: string;
  cancellation_policy: string;
  smoking_policy: string;
  pet_policy: string;
  additional_driver_policy: string;
  other_policies: string;
  pickup_address?: string;
  pickup_latitude?: string;
  pickup_longitude?: string;
  features?: string[];
  description: string;
  imageUri?: string;
  imageUris?: string[];
}
