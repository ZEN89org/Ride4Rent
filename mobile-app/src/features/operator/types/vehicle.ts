export interface Vehicle {
  id: number;
  name: string;
  vehicle_type: string;
  transmission: string | null;
  seats: number | null;
  price_per_day: number;
  location: string;
  description: string | null;
  image_url: string | null;
  is_available: boolean;
  operator?: {
    business_name: string | null;
  };
}

export interface VehicleFormData {
  name: string;
  model: string;
  year_model: string;
  plate_number: string;
  vehicle_type_id: string;
  brand_id: string;
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
  pickup_latitude: string;
  pickup_longitude: string;
  description: string;
  imageUri: string;
}
