import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import PrimaryButton from "@/components/common/PrimaryButton";
import ScreenContainer from "@/components/common/ScreenContainer";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Radius, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  createVehicle,
  getVehicleOptions,
  VehicleOption,
  VehicleOptions,
} from "@/features/operator/services/vehicleService";
import { VehicleFormData } from "@/features/operator/types/vehicle";

const initialForm: VehicleFormData = {
  name: "",
  model: "",
  year_model: "2024",
  plate_number: "",
  vehicle_type_id: "1",
  brand_id: "1",
  body_type_id: "1",
  transmission_type_id: "1",
  fuel_type_id: "1",
  seating_capacity: "5",
  number_of_doors: "4",
  mileage: "0",
  interior_color: "",
  exterior_color: "",
  daily_rate: "",
  reservation_fee: "500",
  available_from: "",
  available_until: "",
  min_driver_age: "21",
  min_driving_experience: "1",
  fuel_policy: "Return with same fuel level",
  late_return_policy: "Contact the operator for late returns",
  cancellation_policy: "Cancellation terms apply",
  smoking_policy: "No smoking",
  pet_policy: "Ask the operator about pets",
  additional_driver_policy: "Additional driver must be approved",
  other_policies: "",
  pickup_latitude: "",
  pickup_longitude: "",
  description: "",
  imageUris: [],
};

export default function OperatorVehicleUpload() {
  const { showModal, showWarning } = useAppToast();
  const [form, setForm] = useState(initialForm);
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<VehicleOptions | null>(null);
  const [picker, setPicker] = useState<keyof VehicleOptions | null>(null);
  const [showCustomBrandInput, setShowCustomBrandInput] = useState(false);
  const [customBrandText, setCustomBrandText] = useState("");

  const { user } = useAuth();
  const operatorProfile = user?.operatorProfile ?? user?.operator_profile;
  const pickupAddress = [
    operatorProfile?.street_address,
    operatorProfile?.barangay,
    operatorProfile?.municipality,
  ].filter(Boolean).join(", ");

  useEffect(() => {
    getVehicleOptions().then(setOptions).catch(() => setError("Unable to load vehicle options."));
  }, []);

  const selectedName = (key: keyof VehicleOptions, value: string) => {
    if (key === "vehicle_brands" && form.custom_brand) {
      return form.custom_brand;
    }
    if (!options || !options[key]) return "Select";
    return options[key].find((item) => String(item.id) === value)?.name ?? "Select";
  };

  const isMotorcycle = selectedName("vehicle_types", form.vehicle_type_id).toLowerCase().includes("motorcycle");

  const update = (key: keyof VehicleFormData, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const selectOption = (key: keyof VehicleOptions, value: VehicleOption) => {
    const fieldMap: Record<keyof VehicleOptions, keyof VehicleFormData> = {
      vehicle_types: "vehicle_type_id",
      vehicle_brands: "brand_id",
      body_types: "body_type_id",
      transmission_types: "transmission_type_id",
      fuel_types: "fuel_type_id",
    };

    if (key === "vehicle_brands") {
      setForm((current) => ({
        ...current,
        brand_id: String(value.id),
        custom_brand: undefined,
      }));
    } else {
      update(fieldMap[key], String(value.id));
    }

    // When switching vehicle type to Motorcycle, adapt defaults (doors=0, seats=2)
    if (key === "vehicle_types") {
      if (value.name.toLowerCase().includes("motorcycle")) {
        setForm((current) => ({
          ...current,
          vehicle_type_id: String(value.id),
          number_of_doors: "0",
          seating_capacity: current.seating_capacity === "5" ? "2" : current.seating_capacity,
        }));
      } else if (form.number_of_doors === "0") {
        setForm((current) => ({
          ...current,
          vehicle_type_id: String(value.id),
          number_of_doors: "4",
          seating_capacity: current.seating_capacity === "2" ? "5" : current.seating_capacity,
        }));
      }
    }

    setPicker(null);
  };

  const handleSaveCustomBrand = () => {
    if (!customBrandText.trim()) {
      showWarning("Brand Name Required", "Please enter a brand name.");
      return;
    }
    setForm((current) => ({
      ...current,
      custom_brand: customBrandText.trim(),
      brand_id: "",
    }));
    setShowCustomBrandInput(false);
    setPicker(null);
    setCustomBrandText("");
  };

  const getFilteredOptions = (key: keyof VehicleOptions): VehicleOption[] => {
    if (!options || !options[key]) return [];
    const list = options[key];

    if (key === "body_types") {
      const motoKeywords = [
        "scooter",
        "moped",
        "underbone",
        "naked",
        "cruiser",
        "sport bike",
        "enduro",
        "adventure",
        "cafe racer",
        "motorcycle",
      ];
      if (isMotorcycle) {
        return list.filter((item) =>
          motoKeywords.some((kw) => item.name.toLowerCase().includes(kw))
        );
      } else {
        return list.filter(
          (item) =>
            !motoKeywords.some((kw) => item.name.toLowerCase().includes(kw))
        );
      }
    }

    return list;
  };

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showModal(
        "Permission Required",
        "Please allow photo access to add vehicle images.",
        [{ text: "OK", style: "default" }],
        "warning"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 8,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newUris = result.assets.map((a) => a.uri).filter(Boolean);
      const combined = [...images, ...newUris].slice(0, 8);
      setImages(combined);
      setError("");
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const setCoverImage = (indexToCover: number) => {
    if (indexToCover === 0) return;
    setImages((prev) => {
      const selected = prev[indexToCover];
      const rest = prev.filter((_, idx) => idx !== indexToCover);
      return [selected, ...rest];
    });
  };

  const submit = async () => {
    if (!form.name.trim() || !form.model.trim() || !form.plate_number.trim() || !form.daily_rate.trim()) {
      setError("Vehicle name, model, plate number, and daily rate are required.");
      return;
    }

    if (!form.brand_id && !form.custom_brand) {
      setError("Please select or enter a vehicle brand.");
      return;
    }

    if (images.length === 0) {
      setError("Please upload at least 1 photo of your vehicle.");
      return;
    }

    try {
      setIsSubmitting(true);
      const submissionData = {
        ...form,
        imageUris: images,
        imageUri: images[0],
      };

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.granted) {
        const currentLocation = await Location.getCurrentPositionAsync({});
        await createVehicle({
          ...submissionData,
          pickup_latitude: String(currentLocation.coords.latitude),
          pickup_longitude: String(currentLocation.coords.longitude),
        });
      } else {
        await createVehicle(submissionData);
      }
      router.replace("/operator-vehicles");
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message ?? "Unable to list this vehicle.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.eyebrow}>Fleet workspace</Text>
        <Text style={styles.title}>List a vehicle</Text>
        <Text style={styles.subtitle}>Give renters detailed photos and specs to inspect your car thoroughly.</Text>

        <View style={styles.locationNotice}>
          <Text style={styles.label}>Pickup location</Text>
          <Text style={styles.location}>{pickupAddress || "Your registered business address"}</Text>
          <Text style={styles.locationHint}>This is inherited from your operator registration address.</Text>
        </View>

        {/* Multi-Image Gallery Uploader */}
        <View style={styles.photosSection}>
          <View style={styles.photosHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Vehicle photos ({images.length}/8)</Text>
              <Text style={styles.photosHint}>Upload multiple angles (front, rear, interior, trunk, dashboard)</Text>
            </View>
            <TouchableOpacity onPress={pickImages} style={styles.addPhotosButton}>
              <Ionicons name="images-outline" size={16} color={Colors.primary} />
              <Text style={styles.addPhotosText}>Add Photos</Text>
            </TouchableOpacity>
          </View>

          {images.length === 0 ? (
            <TouchableOpacity onPress={pickImages} style={styles.emptyImagePicker}>
              <Ionicons name="camera-outline" size={36} color={Colors.primary} />
              <Text style={styles.imagePrompt}>Add vehicle photos</Text>
              <Text style={styles.imageSubPrompt}>Tap to select from gallery (up to 8 images)</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
              {images.map((uri, idx) => (
                <View key={`${uri}-${idx}`} style={styles.imageCard}>
                  <Image source={{ uri }} style={styles.thumbnail} />
                  {idx === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>Cover</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.deleteBadge}
                    onPress={() => removeImage(idx)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={14} color={Colors.white} />
                  </TouchableOpacity>
                  {idx > 0 && (
                    <TouchableOpacity
                      style={styles.setCoverButton}
                      onPress={() => setCoverImage(idx)}
                    >
                      <Text style={styles.setCoverText}>Set Cover</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {images.length < 8 && (
                <TouchableOpacity onPress={pickImages} style={styles.addMoreCard}>
                  <Ionicons name="add" size={28} color={Colors.primary} />
                  <Text style={styles.addMoreText}>Add More</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>

        <Text style={styles.sectionTitle}>Vehicle identity</Text>
        <View style={styles.row}>
          <Field label="Listing name" value={form.name} onChangeText={(value) => update("name", value)} placeholder="e.g. City sedan" />
          <Field label="Model" value={form.model} onChangeText={(value) => update("model", value)} placeholder="e.g. Vios" />
        </View>
        <View style={styles.row}>
          <Field label="Year" value={form.year_model} onChangeText={(value) => update("year_model", value.replace(/\D/g, ""))} keyboardType="numeric" placeholder="2024" />
          <Field label="Plate number" value={form.plate_number} onChangeText={(value) => update("plate_number", value.toUpperCase())} placeholder="ABC-1234" />
        </View>
        <View style={styles.row}>
          <Dropdown label="Vehicle type" value={selectedName("vehicle_types", form.vehicle_type_id)} onPress={() => setPicker("vehicle_types")} />
          <Dropdown label="Brand" value={selectedName("vehicle_brands", form.brand_id)} onPress={() => setPicker("vehicle_brands")} />
        </View>
        <View style={styles.row}>
          <Dropdown label="Body type" value={selectedName("body_types", form.body_type_id)} onPress={() => setPicker("body_types")} />
          <Dropdown label="Transmission" value={selectedName("transmission_types", form.transmission_type_id)} onPress={() => setPicker("transmission_types")} />
        </View>
        <Dropdown label="Fuel type" value={selectedName("fuel_types", form.fuel_type_id)} onPress={() => setPicker("fuel_types")} />

        <Text style={styles.sectionTitle}>Specifications & pricing</Text>
        <View style={styles.row}>
          <Field label="Seats" value={form.seating_capacity} onChangeText={(value) => update("seating_capacity", value.replace(/\D/g, ""))} keyboardType="numeric" placeholder="5" />
          <Field label="Doors" value={form.number_of_doors} onChangeText={(value) => update("number_of_doors", value.replace(/\D/g, ""))} keyboardType="numeric" placeholder="4" />
        </View>
        <View style={styles.row}>
          <Field label="Mileage (km)" value={form.mileage} onChangeText={(value) => update("mileage", value.replace(/\D/g, ""))} keyboardType="numeric" placeholder="0" />
          <Field label="Daily rate (PHP)" value={form.daily_rate} onChangeText={(value) => update("daily_rate", value.replace(/[^\d.]/g, ""))} keyboardType="decimal-pad" placeholder="1500" />
        </View>
        <View style={styles.row}>
          <Field label="Reservation fee" value={form.reservation_fee} onChangeText={(value) => update("reservation_fee", value.replace(/[^\d.]/g, ""))} keyboardType="decimal-pad" placeholder="500" />
          <Field label="Min. driver age" value={form.min_driver_age} onChangeText={(value) => update("min_driver_age", value.replace(/\D/g, ""))} keyboardType="numeric" placeholder="21" />
        </View>
        <View style={styles.row}>
          <Field label="Interior color" value={form.interior_color} onChangeText={(value) => update("interior_color", value)} placeholder="Black" />
          <Field label="Exterior color" value={form.exterior_color} onChangeText={(value) => update("exterior_color", value)} placeholder="White" />
        </View>

        <View style={styles.field}>
          <Text style={styles.sectionTitle}>Description & policies</Text>
          <TextInput
            value={form.description}
            onChangeText={(value) => update("description", value)}
            multiline
            style={[styles.input, styles.textarea]}
            placeholder="Describe features, trunk capacity, cleanliness rules, and highlights..."
            placeholderTextColor={Colors.secondary}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton title="Publish vehicle" onPress={submit} loading={isSubmitting} />
      </ScrollView>

      {/* Option Picker Bottom Sheet with Click-Outside-To-Close */}
      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => { setPicker(null); setShowCustomBrandInput(false); }}>
        <View style={styles.modalBackdrop}>
          {/* Clickable Backdrop Outside the Sheet */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              setPicker(null);
              setShowCustomBrandInput(false);
            }}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choose {picker?.replaceAll("_", " ")}</Text>

            {picker === "vehicle_brands" && showCustomBrandInput ? (
              <View style={styles.customBrandWrap}>
                <Text style={styles.customBrandLabel}>Enter Other Brand Name</Text>
                <TextInput
                  value={customBrandText}
                  onChangeText={setCustomBrandText}
                  placeholder="e.g. CFMoto, SYM, Tesla, Ducati"
                  placeholderTextColor={Colors.secondary}
                  style={styles.customBrandInput}
                  autoFocus
                />
                <View style={styles.customBrandActions}>
                  <TouchableOpacity
                    style={styles.customBrandCancel}
                    onPress={() => setShowCustomBrandInput(false)}
                  >
                    <Text style={styles.cancelText}>Back to List</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.customBrandSave}
                    onPress={handleSaveCustomBrand}
                  >
                    <Text style={styles.saveText}>Use Brand</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                {picker && getFilteredOptions(picker).map((option) => (
                  <TouchableOpacity key={option.id} style={styles.option} onPress={() => selectOption(picker, option)}>
                    <Text style={styles.optionText}>{option.name}</Text>
                  </TouchableOpacity>
                ))}

                {/* Option to manually add a brand */}
                {picker === "vehicle_brands" && (
                  <TouchableOpacity
                    style={styles.customOption}
                    onPress={() => setShowCustomBrandInput(true)}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                    <Text style={styles.customOptionText}>+ Add Other Brand (Type Manually)</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}

            <TouchableOpacity onPress={() => { setPicker(null); setShowCustomBrandInput(false); }}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  placeholder?: string;
}) {
  return (
    <View style={styles.fieldHalf}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={Colors.secondary}
        style={styles.input}
      />
    </View>
  );
}

function Dropdown({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <View style={styles.fieldHalf}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity onPress={onPress} style={styles.input}>
        <Text style={styles.dropdownText}>{value}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  back: { color: Colors.primary, fontFamily: FontFamily.semiBold, marginBottom: Spacing.xl },
  eyebrow: { color: Colors.secondary, fontFamily: FontFamily.medium, fontSize: FontSize.small },
  title: { color: Colors.dark, fontFamily: FontFamily.bold, fontSize: FontSize.heading, marginTop: Spacing.xs },
  subtitle: { color: Colors.secondary, fontFamily: FontFamily.regular, fontSize: FontSize.small, lineHeight: 21, marginTop: Spacing.sm },
  photosSection: { marginTop: Spacing.lg },
  photosHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.sm },
  photosHint: { color: Colors.secondary, fontFamily: FontFamily.regular, fontSize: 12, marginTop: 2 },
  addPhotosButton: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.logoBackground, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full },
  addPhotosText: { color: Colors.primary, fontFamily: FontFamily.semiBold, fontSize: 12 },
  emptyImagePicker: { alignItems: "center", backgroundColor: Colors.inputBackground, borderColor: Colors.border, borderWidth: 1.5, borderStyle: "dashed", borderRadius: 18, height: 160, justifyContent: "center", marginTop: Spacing.xs },
  imagePrompt: { color: Colors.dark, fontFamily: FontFamily.semiBold, fontSize: FontSize.body, marginTop: 8 },
  imageSubPrompt: { color: Colors.secondary, fontFamily: FontFamily.regular, fontSize: 12, marginTop: 4 },
  galleryScroll: { paddingVertical: Spacing.xs, gap: Spacing.sm },
  imageCard: { position: "relative", width: 130, height: 130, borderRadius: 14, overflow: "hidden", backgroundColor: Colors.inputBackground },
  thumbnail: { width: "100%", height: "100%", resizeMode: "cover" },
  coverBadge: { position: "absolute", top: 6, left: 6, backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  coverBadgeText: { color: Colors.white, fontFamily: FontFamily.bold, fontSize: 10 },
  deleteBadge: { position: "absolute", top: 6, right: 6, backgroundColor: "rgba(0,0,0,0.65)", width: 22, height: 22, borderRadius: 11, justifyContent: "center", alignItems: "center" },
  setCoverButton: { position: "absolute", bottom: 6, left: 6, right: 6, backgroundColor: "rgba(0,0,0,0.6)", paddingVertical: 3, borderRadius: 6, alignItems: "center" },
  setCoverText: { color: Colors.white, fontFamily: FontFamily.semiBold, fontSize: 10 },
  addMoreCard: { width: 130, height: 130, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, borderStyle: "dashed", backgroundColor: Colors.inputBackground, justifyContent: "center", alignItems: "center", gap: 4 },
  addMoreText: { color: Colors.primary, fontFamily: FontFamily.semiBold, fontSize: 12 },
  field: { marginTop: Spacing.md },
  label: { color: Colors.dark, fontFamily: FontFamily.semiBold, fontSize: FontSize.small, marginBottom: Spacing.xs, textTransform: "capitalize" },
  input: { backgroundColor: Colors.inputBackground, borderRadius: 12, color: Colors.dark, fontFamily: FontFamily.regular, paddingHorizontal: Spacing.md, paddingVertical: 13 },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  error: { color: Colors.error, fontFamily: FontFamily.regular, marginVertical: Spacing.md },
  locationNotice: { backgroundColor: Colors.logoBackground, borderRadius: 14, marginTop: Spacing.lg, padding: Spacing.md },
  location: { color: Colors.dark, fontFamily: FontFamily.medium, fontSize: FontSize.small },
  locationHint: { color: Colors.secondary, fontFamily: FontFamily.regular, fontSize: 12, marginTop: Spacing.xs },
  sectionTitle: { color: Colors.dark, fontFamily: FontFamily.semiBold, fontSize: FontSize.title, marginTop: Spacing.md },
  row: { flexDirection: "row", gap: Spacing.md },
  fieldHalf: { flex: 1, marginTop: Spacing.md },
  dropdownText: { color: Colors.dark, fontFamily: FontFamily.regular },
  modalBackdrop: { backgroundColor: "rgba(0,0,0,0.45)", flex: 1, justifyContent: "flex-end" },
  modalCard: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: Spacing.xl },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: "center", marginBottom: Spacing.sm },
  modalTitle: { color: Colors.dark, fontFamily: FontFamily.bold, fontSize: FontSize.title, marginBottom: Spacing.md },
  option: { borderBottomColor: Colors.border, borderBottomWidth: 1, paddingVertical: Spacing.md },
  optionText: { color: Colors.dark, fontFamily: FontFamily.medium, fontSize: FontSize.body },
  customOption: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: Spacing.md, backgroundColor: Colors.logoBackground, borderRadius: 10, paddingHorizontal: 12, marginTop: Spacing.sm },
  customOptionText: { color: Colors.primary, fontFamily: FontFamily.bold, fontSize: FontSize.body },
  customBrandWrap: { marginTop: Spacing.sm, marginBottom: Spacing.md },
  customBrandLabel: { color: Colors.dark, fontFamily: FontFamily.semiBold, fontSize: FontSize.small, marginBottom: Spacing.xs },
  customBrandInput: { backgroundColor: Colors.inputBackground, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: 12, fontFamily: FontFamily.regular, color: Colors.dark, fontSize: 15 },
  customBrandActions: { flexDirection: "row", justifyContent: "flex-end", gap: Spacing.sm, marginTop: Spacing.md },
  customBrandCancel: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: Colors.inputBackground },
  cancelText: { color: Colors.secondary, fontFamily: FontFamily.semiBold, fontSize: 13 },
  customBrandSave: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8, backgroundColor: Colors.primary },
  saveText: { color: Colors.white, fontFamily: FontFamily.bold, fontSize: 13 },
  cancel: { color: Colors.secondary, fontFamily: FontFamily.semiBold, paddingTop: Spacing.md, textAlign: "center" },
});


