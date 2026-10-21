export function validateVehicleFields(form: Record<string, unknown>, step: number): string | null {
  const text = (key: string) => String(form[key] ?? "").trim();
  if (step === 1) {
    for (const [key, label] of [["name", "Listing title"], ["model", "Model"]]) {
      if (!/\p{L}/u.test(text(key)) || text(key).length > 255) return `${label} must contain letters and be at most 255 characters.`;
    }
    if (text("custom_brand") && (!/\p{L}/u.test(text("custom_brand")) || text("custom_brand").length > 100)) return "Enter a brand name containing letters, up to 100 characters.";
    const year = Number(text("year_model"));
    if (!/^\d{4}$/.test(text("year_model")) || year < 1990 || year > new Date().getFullYear() + 1) return "Enter a four-digit model year from 1990 through next year.";
    const plate = text("plate_number").toUpperCase().replace(/[\s-]+/g, "");
    if (!/^(?:[A-Z]{2,3}\d{3,4}|\d{3}[A-Z]{3}|\d{15})$/.test(plate)) return "Enter a standard plate (for example ABC 1234) or a 15-digit MV file number.";
    if (!/^\d+$/.test(text("vehicle_type_id"))) return "Select the vehicle type.";
  }
  if (step === 2) {
    for (const key of ["transmission_type_id", "fuel_type_id"]) if (!/^\d+$/.test(text(key))) return "Select the transmission and fuel type.";
    for (const [key, label, min, max] of [["seating_capacity", "Seats", 1, 50], ["number_of_doors", "Doors", 0, 10], ["mileage", "Mileage", 0, 9999999]] as const) {
      if (!/^\d+$/.test(text(key)) || Number(text(key)) < min || Number(text(key)) > max) return `${label} must be a whole number from ${min} to ${max}.`;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(text("daily_rate")) || Number(text("daily_rate")) < 1 || Number(text("daily_rate")) > 1000000) return "Daily rate must be ₱1–₱1,000,000 with at most two decimal places.";
    for (const key of ["interior_color", "exterior_color"]) if (text(key) && (text(key).length > 50 || !/^[\p{L}][\p{L} /-]*$/u.test(text(key)))) return "Colors must contain letters, spaces, slashes or hyphens only (up to 50 characters).";
    if (text("description").length > 3000) return "Description must be at most 3,000 characters.";
  }
  return null;
}
