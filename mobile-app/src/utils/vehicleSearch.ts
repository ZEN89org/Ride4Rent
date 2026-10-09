/**
 * Comprehensive client-side matcher for vehicle searches.
 * Checks vehicle name, brand, model, year, vehicle type, body type,
 * transmission, fuel, pickup location/address, description, features,
 * operator name, and operator business name.
 */
export const matchesVehicleSearch = (vehicle: any, rawQuery: string): boolean => {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  const terms = query.split(/\s+/).filter(Boolean);

  const searchableFields = [
    vehicle.name,
    vehicle.brand,
    vehicle.model,
    vehicle.year_model ? String(vehicle.year_model) : "",
    vehicle.vehicle_type,
    vehicle.body_type,
    vehicle.transmission,
    vehicle.fuel_type,
    vehicle.pickup_address,
    vehicle.description,
    vehicle.operator?.name,
    vehicle.operator?.business_name,
    vehicle.operator?.municipality,
    vehicle.operator?.barangay,
    vehicle.operator?.street_address,
    Array.isArray(vehicle.features) ? vehicle.features.join(" ") : "",
  ];

  const blob = searchableFields.filter(Boolean).join(" ").toLowerCase();

  return terms.every((term) => blob.includes(term));
};
