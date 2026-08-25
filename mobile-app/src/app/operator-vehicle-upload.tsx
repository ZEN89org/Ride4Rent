import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
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
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
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
  imageUri: "",
};

export default function OperatorVehicleUpload() {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<VehicleOptions | null>(null);
  const [picker, setPicker] = useState<keyof VehicleOptions | null>(null);
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

  const selectOption = (key: keyof VehicleOptions, value: VehicleOption) => {
    const fieldMap: Record<keyof VehicleOptions, keyof VehicleFormData> = {
      vehicle_types: "vehicle_type_id",
      vehicle_brands: "brand_id",
      body_types: "body_type_id",
      transmission_types: "transmission_type_id",
      fuel_types: "fuel_type_id",
    };
    update(fieldMap[key], String(value.id));
    setPicker(null);
  };

  const selectedName = (key: keyof VehicleOptions, value: string) =>
    options?.[key].find((item) => String(item.id) === value)?.name ?? "Select";

  const update = (key: keyof VehicleFormData, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Allow photo access to add a vehicle image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      update("imageUri", result.assets[0].uri);
    }
  };

  const submit = async () => {
    if (!form.name.trim() || !form.model.trim() || !form.plate_number.trim() || !form.daily_rate.trim()) {
      setError("Vehicle name, model, plate number, and daily rate are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.granted) {
        const currentLocation = await Location.getCurrentPositionAsync({});
        await createVehicle({
          ...form,
          pickup_latitude: String(currentLocation.coords.latitude),
          pickup_longitude: String(currentLocation.coords.longitude),
        });
      } else {
        await createVehicle(form);
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
        <Text style={styles.subtitle}>Give renters the details they need to choose your vehicle.</Text>

        <View style={styles.locationNotice}>
          <Text style={styles.label}>Pickup location</Text>
          <Text style={styles.location}>{pickupAddress || "Your registered business address"}</Text>
          <Text style={styles.locationHint}>This is inherited from your operator registration address.</Text>
        </View>

        <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
          {form.imageUri ? (
            <Image source={{ uri: form.imageUri }} style={styles.preview} />
          ) : (
            <Text style={styles.imagePrompt}>Add vehicle photo</Text>
          )}
        </TouchableOpacity>

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
            placeholder="Describe the vehicle"
            placeholderTextColor={Colors.secondary}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton title="Publish vehicle" onPress={submit} loading={isSubmitting} />
      </ScrollView>
      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose {picker?.replaceAll("_", " ")}</Text>
            {picker && options?.[picker].map((option) => (
              <TouchableOpacity key={option.id} style={styles.option} onPress={() => selectOption(picker, option)}>
                <Text style={styles.optionText}>{option.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setPicker(null)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  back: { color: Colors.primary, fontFamily: FontFamily.semiBold, marginBottom: Spacing.xl },
  eyebrow: { color: Colors.secondary, fontFamily: FontFamily.medium, fontSize: FontSize.small },
  title: { color: Colors.dark, fontFamily: FontFamily.bold, fontSize: FontSize.heading, marginTop: Spacing.xs },
  subtitle: { color: Colors.secondary, fontFamily: FontFamily.regular, fontSize: FontSize.small, lineHeight: 21, marginTop: Spacing.sm },
  imagePicker: { alignItems: "center", backgroundColor: Colors.inputBackground, borderRadius: 18, height: 190, justifyContent: "center", marginTop: Spacing.xl, overflow: "hidden" },
  preview: { height: "100%", width: "100%" },
  imagePrompt: { color: Colors.secondary, fontFamily: FontFamily.medium },
  field: { marginTop: Spacing.md },
  label: { color: Colors.dark, fontFamily: FontFamily.semiBold, fontSize: FontSize.small, marginBottom: Spacing.xs, textTransform: "capitalize" },
  input: { backgroundColor: Colors.inputBackground, borderRadius: 12, color: Colors.dark, fontFamily: FontFamily.regular, paddingHorizontal: Spacing.md, paddingVertical: 13 },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  error: { color: Colors.error, fontFamily: FontFamily.regular, marginVertical: Spacing.md },
  locationNotice: { backgroundColor: Colors.logoBackground, borderRadius: 14, marginTop: Spacing.xl, padding: Spacing.md },
  location: { color: Colors.dark, fontFamily: FontFamily.medium, fontSize: FontSize.small },
  locationHint: { color: Colors.secondary, fontFamily: FontFamily.regular, fontSize: 12, marginTop: Spacing.xs },
  sectionTitle: { color: Colors.dark, fontFamily: FontFamily.semiBold, fontSize: FontSize.title, marginTop: Spacing.xl },
  row: { flexDirection: "row", gap: Spacing.md },
  fieldHalf: { flex: 1, marginTop: Spacing.md },
  dropdownText: { color: Colors.dark, fontFamily: FontFamily.regular },
  modalBackdrop: { backgroundColor: "rgba(0,0,0,0.35)", flex: 1, justifyContent: "flex-end" },
  modalCard: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg },
  modalTitle: { color: Colors.dark, fontFamily: FontFamily.bold, fontSize: FontSize.title, marginBottom: Spacing.md },
  option: { borderBottomColor: Colors.border, borderBottomWidth: 1, paddingVertical: Spacing.md },
  optionText: { color: Colors.dark, fontFamily: FontFamily.medium, fontSize: FontSize.body },
  cancel: { color: Colors.secondary, fontFamily: FontFamily.semiBold, paddingVertical: Spacing.lg, textAlign: "center" },
});

function Field({ label, value, onChangeText, placeholder, keyboardType = "default" }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "default" | "numeric" | "decimal-pad" }) {
  return <View style={styles.fieldHalf}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} style={styles.input} placeholder={placeholder} placeholderTextColor={Colors.secondary} /></View>;
}

function Dropdown({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return <View style={styles.fieldHalf}><Text style={styles.label}>{label}</Text><TouchableOpacity onPress={onPress} style={styles.input}><Text style={styles.dropdownText}>{value}</Text></TouchableOpacity></View>;
}
