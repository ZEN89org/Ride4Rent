import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { MUNICIPALITY_COORDINATES } from "@/constants/orientalMindoroLocations";
import { FontFamily, FontSize, Radius, Spacing } from "@/constants/theme";
import {
  getAmenitiesForType,
  getDefaultAmenitiesForType,
} from "@/constants/vehicleAmenities";
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

const FORM_STEPS = [
  {
    id: 1,
    title: "Basics & Photos",
    shortTitle: "Basics",
    icon: "car-info" as const,
  },
  {
    id: 2,
    title: "Specs & Rates",
    shortTitle: "Specs",
    icon: "car-shift-pattern" as const,
  },
  {
    id: 3,
    title: "Features & Rules",
    shortTitle: "Features",
    icon: "shield-car" as const,
  },
];

export default function OperatorVehicleUpload() {
  const { showModal, showWarning } = useAppToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<VehicleFormData>(initialForm);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    getDefaultAmenitiesForType("Sedan")
  );
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<VehicleOptions | null>(null);

  // Picker Modal State
  const [picker, setPicker] = useState<keyof VehicleOptions | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [showCustomBrandInput, setShowCustomBrandInput] = useState(false);
  const [customBrandText, setCustomBrandText] = useState("");

  const { user, isOperatorPending } = useAuth();
  const operatorProfile = user?.operatorProfile ?? user?.operator_profile;
  const pickupAddress = [
    operatorProfile?.street_address,
    operatorProfile?.barangay,
    operatorProfile?.municipality,
  ]
    .filter(Boolean)
    .join(", ");

  const hasRentalPaymentSetup = Boolean(
    operatorProfile?.account_number && String(operatorProfile.account_number).trim()
  );

  useEffect(() => {
    if (!hasRentalPaymentSetup) {
      showModal(
        "Payment Setup Required",
        "Please set up your GCash rental payment details first before listing a vehicle, so renters know where to send reservation fees.",
        [
          {
            text: "Go to Payment Setup",
            onPress: () => router.replace("/operator-profile" as any),
          },
        ],
        "warning"
      );
    }
  }, [hasRentalPaymentSetup, showModal]);

  useEffect(() => {
    getVehicleOptions()
      .then(setOptions)
      .catch(() => setError("Unable to load vehicle options."));
  }, []);

  const selectedName = (key: keyof VehicleOptions, value: string) => {
    if (key === "vehicle_brands" && form.custom_brand) {
      return form.custom_brand;
    }
    if (!options || !options[key]) return "Select";
    return options[key].find((item) => String(item.id) === value)?.name ?? "Select";
  };

  const currentVehicleTypeName = selectedName("vehicle_types", form.vehicle_type_id);
  const isMotorcycle = currentVehicleTypeName.toLowerCase().includes("motorcycle");
  const availableAmenities = getAmenitiesForType(currentVehicleTypeName);

  const toggleAmenity = (amenityId: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenityId)
        ? prev.filter((id) => id !== amenityId)
        : [...prev, amenityId]
    );
  };

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

    // When switching vehicle type, adapt defaults & amenities
    if (key === "vehicle_types") {
      const isMoto = value.name.toLowerCase().includes("motorcycle");
      setSelectedAmenities(getDefaultAmenitiesForType(value.name));

      if (isMoto) {
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
    setPickerSearch("");
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
    setPickerSearch("");
    setCustomBrandText("");
  };

  const filteredOptions = useMemo((): VehicleOption[] => {
    if (!picker || !options || !options[picker]) return [];
    let list = options[picker];

    if (picker === "body_types") {
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
        list = list.filter((item) =>
          motoKeywords.some((kw) => item.name.toLowerCase().includes(kw))
        );
      } else {
        list = list.filter(
          (item) =>
            !motoKeywords.some((kw) => item.name.toLowerCase().includes(kw))
        );
      }
    }

    if (pickerSearch.trim()) {
      const q = pickerSearch.toLowerCase().trim();
      list = list.filter((item) => item.name.toLowerCase().includes(q));
    }

    return list;
  }, [picker, options, isMotorcycle, pickerSearch]);

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

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (images.length === 0) {
        showWarning("Photos Required", "Please upload at least 1 photo of your vehicle.");
        return;
      }
      if (!form.name.trim()) {
        showWarning("Listing Name Required", "Please enter a vehicle listing name.");
        return;
      }
      if (!form.brand_id && !form.custom_brand) {
        showWarning("Brand Required", "Please select or enter the vehicle brand.");
        return;
      }
      if (!form.model.trim()) {
        showWarning("Model Required", "Please enter the vehicle model.");
        return;
      }
      if (!form.plate_number.trim()) {
        showWarning("Plate Number Required", "Please enter the vehicle plate number.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!form.daily_rate.trim()) {
        showWarning("Daily Rate Required", "Please set the daily rental rate in PHP.");
        return;
      }
      setCurrentStep(3);
    }
  };

  const submit = async () => {
    if (isOperatorPending) {
      showModal(
        "Listing Locked",
        "Your operator application is currently under review by our administrators. You cannot publish vehicles until your account is approved.",
        [{ text: "Understood", style: "default" }],
        "warning"
      );
      return;
    }

    if (!hasRentalPaymentSetup) {
      showModal(
        "Payment Setup Required",
        "Please set up your GCash rental payment details in your profile before listing a vehicle.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Set Up Now", onPress: () => router.push("/operator-profile" as any) },
        ],
        "warning"
      );
      return;
    }

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
        features: selectedAmenities,
        imageUris: images,
        imageUri: images[0],
      };

      let uploadLat: string | undefined = undefined;
      let uploadLng: string | undefined = undefined;

      if (operatorProfile?.latitude && operatorProfile?.longitude) {
        uploadLat = String(operatorProfile.latitude);
        uploadLng = String(operatorProfile.longitude);
      } else if (operatorProfile?.municipality && MUNICIPALITY_COORDINATES[operatorProfile.municipality]) {
        uploadLat = String(MUNICIPALITY_COORDINATES[operatorProfile.municipality].latitude);
        uploadLng = String(MUNICIPALITY_COORDINATES[operatorProfile.municipality].longitude);
      } else {
        try {
          const permission = await Location.requestForegroundPermissionsAsync();
          if (permission.granted) {
            const currentLocation = await Location.getCurrentPositionAsync({});
            uploadLat = String(currentLocation.coords.latitude);
            uploadLng = String(currentLocation.coords.longitude);
          }
        } catch {
          // ignore location error
        }
      }

      await createVehicle({
        ...submissionData,
        pickup_address: pickupAddress || undefined,
        pickup_latitude: uploadLat,
        pickup_longitude: uploadLng,
      });

      router.replace("/operator-vehicles");
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message ?? "Unable to list this vehicle.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.dark} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.screenTitle}>List a Vehicle</Text>
          </View>
        </View>

        {/* Status / Review Notices */}
        {isOperatorPending && (
          <View style={styles.pendingWarningBanner}>
            <View style={styles.warningIconCircle}>
              <Ionicons name="time" size={20} color={Colors.dark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingWarningTitle}>Operator Application Under Review</Text>
              <Text style={styles.pendingWarningText}>
                You are currently in Preview Mode. You can test and configure vehicle specs, but fleet publishing will unlock once Admin completes your verification.
              </Text>
            </View>
          </View>
        )}

        {!hasRentalPaymentSetup && (
          <View style={styles.paymentWarningBanner}>
            <View style={styles.warningIconCircle}>
              <Ionicons name="card" size={20} color={Colors.dark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentWarningTitle}>Payment Setup Required</Text>
              <Text style={styles.paymentWarningText}>
                You must configure your GCash rental payment details in your profile so renters know where to send reservation fees.
              </Text>
              <TouchableOpacity
                style={styles.paymentSetupActionBtn}
                onPress={() => router.push("/operator-profile" as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.paymentSetupActionBtnText}>Set Up Payment Now</Text>
                <Ionicons name="arrow-forward" size={13} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Modern Responsive Step Stepper / Pagination Header */}
        <View style={styles.paginationCard}>
          {/* Top Status Row */}
          <View style={styles.paginationTopRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP {currentStep} OF 3</Text>
            </View>
            <View style={styles.stepMetaRight}>
              <MaterialCommunityIcons
                name={FORM_STEPS[currentStep - 1].icon}
                size={16}
                color={Colors.dark}
              />
              <Text style={styles.stepCurrentTitle}>
                {FORM_STEPS[currentStep - 1].title}
              </Text>
            </View>
          </View>

          {/* 3-Segment Fluid Progress Line (Adapts to any width) */}
          <View style={styles.segmentTrackRow}>
            {FORM_STEPS.map((step) => {
              const isPast = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <TouchableOpacity
                  key={step.id}
                  style={styles.segmentTouch}
                  onPress={() => setCurrentStep(step.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.segmentBar,
                      isCurrent && styles.segmentBarCurrent,
                      isPast && styles.segmentBarPast,
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Quick-Jump Step Pills (Clean, compact, shortTitle will never wrap or truncate) */}
          <View style={styles.stepChipsRow}>
            {FORM_STEPS.map((step) => {
              const isPast = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <TouchableOpacity
                  key={step.id}
                  style={[
                    styles.stepChip,
                    isCurrent && styles.stepChipActive,
                    isPast && styles.stepChipPast,
                  ]}
                  onPress={() => setCurrentStep(step.id)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.stepChipDot,
                      isCurrent && styles.stepChipDotActive,
                      isPast && styles.stepChipDotPast,
                    ]}
                  >
                    {isPast ? (
                      <Ionicons name="checkmark" size={10} color={Colors.white} />
                    ) : (
                      <Text
                        style={[
                          styles.stepChipDotNum,
                          isCurrent && styles.stepChipDotNumActive,
                        ]}
                      >
                        {step.id}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepChipText,
                      isCurrent && styles.stepChipTextActive,
                      isPast && styles.stepChipTextPast,
                    ]}
                    numberOfLines={1}
                  >
                    {step.shortTitle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ========================================================================= */}
        {/* STEP 1: BASICS & PHOTOS                                                   */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <View style={{ gap: Spacing.md }}>
            {/* Card 1: Photos */}
            <View style={styles.formCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <MaterialCommunityIcons name="camera-outline" size={19} color={Colors.dark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Vehicle Photos</Text>
                  <Text style={styles.cardSubtitle}>
                    Upload multiple angles (front, rear, interior, dashboard)
                  </Text>
                </View>
                <View style={styles.photoCountBadge}>
                  <Text style={styles.photoCountText}>{images.length}/8</Text>
                </View>
              </View>

              {images.length === 0 ? (
                <TouchableOpacity
                  onPress={pickImages}
                  style={styles.emptyUploader}
                  activeOpacity={0.8}
                >
                  <View style={styles.emptyUploaderIconCircle}>
                    <MaterialCommunityIcons name="cloud-upload-outline" size={28} color={Colors.dark} />
                  </View>
                  <Text style={styles.emptyUploaderTitle}>Upload Vehicle Photos</Text>
                  <Text style={styles.emptyUploaderSub}>
                    Tap to select from gallery (up to 8 high-res photos)
                  </Text>
                  <View style={styles.choosePhotosBtn}>
                    <Ionicons name="images-outline" size={15} color={Colors.white} />
                    <Text style={styles.choosePhotosBtnText}>Select Photos</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.photosContainer}>
                  {/* Primary Cover Photo Preview */}
                  <View style={styles.coverPhotoWrap}>
                    <Image source={{ uri: images[0] }} style={styles.coverPhotoImage} />
                    <View style={styles.coverTagBadge}>
                      <Ionicons name="star" size={11} color={Colors.white} />
                      <Text style={styles.coverTagText}>Cover Photo</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.coverDeleteBtn}
                      onPress={() => removeImage(0)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close" size={15} color={Colors.white} />
                    </TouchableOpacity>
                  </View>

                  {/* Secondary Thumbnails */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.thumbnailsScroll}
                  >
                    {images.slice(1).map((uri, index) => {
                      const realIndex = index + 1;
                      return (
                        <View key={`${uri}-${realIndex}`} style={styles.thumbCard}>
                          <Image source={{ uri }} style={styles.thumbImage} />
                          <TouchableOpacity
                            style={styles.thumbDeleteBtn}
                            onPress={() => removeImage(realIndex)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="close" size={12} color={Colors.white} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.setCoverPill}
                            onPress={() => setCoverImage(realIndex)}
                          >
                            <Text style={styles.setCoverPillText}>Set Cover</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}

                    {images.length < 8 && (
                      <TouchableOpacity
                        style={styles.addMoreCard}
                        onPress={pickImages}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add" size={24} color={Colors.primary} />
                        <Text style={styles.addMoreCardText}>Add More</Text>
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Card 2: Vehicle Classification */}
            <View style={styles.formCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <MaterialCommunityIcons name="car-multiple" size={19} color={Colors.dark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Category & Brand</Text>
                  <Text style={styles.cardSubtitle}>
                    Classify your vehicle type and manufacturer
                  </Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <DropdownField
                    label="Vehicle Type"
                    value={currentVehicleTypeName}
                    onPress={() => setPicker("vehicle_types")}
                    required
                  />
                </View>
                <View style={styles.col}>
                  <DropdownField
                    label="Brand"
                    value={selectedName("vehicle_brands", form.brand_id)}
                    onPress={() => setPicker("vehicle_brands")}
                    required
                  />
                </View>
              </View>
            </View>

            {/* Card 3: Identification & Model */}
            <View style={styles.formCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <MaterialCommunityIcons name="car-info" size={19} color={Colors.dark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Vehicle Identity</Text>
                  <Text style={styles.cardSubtitle}>
                    Model details, year, and registered plate
                  </Text>
                </View>
              </View>

              <FormField
                label="Listing Title"
                value={form.name}
                onChangeText={(val) => update("name", val)}
                placeholder="e.g. 2024 Toyota Vios Prime XLE"
                autoCapitalize="words"
                required
              />

              <View style={styles.row}>
                <View style={styles.col}>
                  <FormField
                    label="Model"
                    value={form.model}
                    onChangeText={(val) => update("model", val)}
                    placeholder="e.g. Vios, NMAX"
                    autoCapitalize="words"
                    required
                  />
                </View>
                <View style={styles.col}>
                  <FormField
                    label="Year Model"
                    value={form.year_model}
                    onChangeText={(val) => update("year_model", val.replace(/\D/g, ""))}
                    placeholder="2024"
                    keyboardType="numeric"
                    required
                  />
                </View>
              </View>

              <FormField
                label="Plate Number / MV File"
                value={form.plate_number}
                onChangeText={(val) => update("plate_number", val.toUpperCase())}
                placeholder="e.g. ABC 1234 or MV-12345"
                autoCapitalize="characters"
                required
              />
            </View>

            {/* Step 1 Actions */}
            <View style={styles.actionsRow}>
              <PrimaryButton
                title="Continue to Specifications"
                onPress={handleNextStep}
              />
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: SPECS & RATES                                                     */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <View style={{ gap: Spacing.md }}>
            {/* Card 1: Mechanical Specs */}
            <View style={styles.formCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <MaterialCommunityIcons name="car-shift-pattern" size={20} color={Colors.dark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Mechanical & Transmission</Text>
                  <Text style={styles.cardSubtitle}>
                    Drivetrain, fuel setup, and chassis
                  </Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <DropdownField
                    label="Body Type"
                    value={selectedName("body_types", form.body_type_id)}
                    onPress={() => setPicker("body_types")}
                  />
                </View>
                <View style={styles.col}>
                  <DropdownField
                    label="Transmission"
                    value={selectedName("transmission_types", form.transmission_type_id)}
                    onPress={() => setPicker("transmission_types")}
                    required
                  />
                </View>
              </View>

              <DropdownField
                label="Fuel Type"
                value={selectedName("fuel_types", form.fuel_type_id)}
                onPress={() => setPicker("fuel_types")}
                required
              />
            </View>

            {/* Card 2: Capacity & Odometer */}
            <View style={styles.formCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <MaterialCommunityIcons name="car-seat" size={20} color={Colors.dark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Capacity & Mileage</Text>
                  <Text style={styles.cardSubtitle}>
                    Passenger seating and odometer reading
                  </Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <FormField
                    label="Seating Capacity"
                    value={form.seating_capacity}
                    onChangeText={(val) => update("seating_capacity", val.replace(/\D/g, ""))}
                    placeholder={isMotorcycle ? "2" : "5"}
                    keyboardType="numeric"
                    required
                  />
                </View>
                <View style={styles.col}>
                  <FormField
                    label="Doors"
                    value={form.number_of_doors}
                    onChangeText={(val) => update("number_of_doors", val.replace(/\D/g, ""))}
                    placeholder={isMotorcycle ? "0" : "4"}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <FormField
                label="Current Mileage"
                value={form.mileage}
                onChangeText={(val) => update("mileage", val.replace(/\D/g, ""))}
                placeholder="15000"
                keyboardType="numeric"
                suffix="km"
              />

              <View style={styles.row}>
                <View style={styles.col}>
                  <FormField
                    label="Exterior Color"
                    value={form.exterior_color}
                    onChangeText={(val) => update("exterior_color", val)}
                    placeholder="e.g. Pearl White"
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.col}>
                  <FormField
                    label="Interior Color"
                    value={form.interior_color}
                    onChangeText={(val) => update("interior_color", val)}
                    placeholder="e.g. Black"
                    autoCapitalize="words"
                  />
                </View>
              </View>
            </View>

            {/* Card 3: Rental Rates & Terms */}
            <View style={styles.formCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <MaterialCommunityIcons name="cash-multiple" size={19} color={Colors.dark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Rental Rates & Booking Terms</Text>
                  <Text style={styles.cardSubtitle}>
                    Daily fees and renter eligibility requirements
                  </Text>
                </View>
              </View>

              <FormField
                label="Daily Rental Rate"
                value={form.daily_rate}
                onChangeText={(val) => update("daily_rate", val.replace(/[^\d.]/g, ""))}
                placeholder="1500"
                keyboardType="decimal-pad"
                prefix="₱"
                helperText="Base rent per 24 hours of usage"
                required
              />

              <FormField
                label="Advance Reservation Fee"
                value={form.reservation_fee}
                onChangeText={(val) => update("reservation_fee", val.replace(/[^\d.]/g, ""))}
                placeholder="500"
                keyboardType="decimal-pad"
                prefix="₱"
                helperText="Secures booking dates; deductible from the total balance"
              />

              <View style={styles.row}>
                <View style={styles.col}>
                  <FormField
                    label="Min. Driver Age"
                    value={form.min_driver_age}
                    onChangeText={(val) => update("min_driver_age", val.replace(/\D/g, ""))}
                    placeholder="21"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.col}>
                  <FormField
                    label="Min. Experience"
                    value={form.min_driving_experience}
                    onChangeText={(val) => update("min_driving_experience", val.replace(/\D/g, ""))}
                    placeholder="1"
                    keyboardType="numeric"
                    suffix="yrs"
                  />
                </View>
              </View>
            </View>

            {/* Step 2 Actions */}
            <View style={styles.twoButtonRow}>
              <TouchableOpacity
                style={styles.secondaryStepBtn}
                onPress={() => setCurrentStep(1)}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={16} color={Colors.dark} />
                <Text style={styles.secondaryStepBtnText}>Back</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  title="Continue to Features"
                  onPress={handleNextStep}
                />
              </View>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: FEATURES & POLICIES                                               */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <View style={{ gap: Spacing.md }}>
            {/* Card 1: Highlights & Amenities */}
            <View style={styles.formCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <MaterialCommunityIcons name="car-electric" size={19} color={Colors.dark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Highlights & Amenities</Text>
                  <Text style={styles.cardSubtitle}>
                    Select features included in this {currentVehicleTypeName || "vehicle"} ({selectedAmenities.length} selected)
                  </Text>
                </View>
              </View>

              <View style={styles.amenitiesGrid}>
                {availableAmenities.map((amenity) => {
                  const isSelected = selectedAmenities.includes(amenity.id);
                  return (
                    <TouchableOpacity
                      key={amenity.id}
                      style={[styles.amenityChip, isSelected && styles.amenityChipSelected]}
                      onPress={() => toggleAmenity(amenity.id)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.amenityIconWrap, isSelected && styles.amenityIconWrapSelected]}>
                        {amenity.iconType === "mci" ? (
                          <MaterialCommunityIcons
                            name={amenity.icon as any}
                            size={16}
                            color={isSelected ? Colors.dark : Colors.dark}
                          />
                        ) : (
                          <Ionicons
                            name={amenity.icon as any}
                            size={16}
                            color={isSelected ? Colors.dark : Colors.dark}
                          />
                        )}
                      </View>
                      <Text
                        style={[styles.amenityLabel, isSelected && styles.amenityLabelSelected]}
                        numberOfLines={2}
                      >
                        {amenity.label}
                      </Text>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                      ) : (
                        <View style={styles.amenityUncheckedCircle} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Card 2: Description */}
            <View style={styles.formCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <Ionicons name="document-text-outline" size={18} color={Colors.dark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Vehicle Description</Text>
                  <Text style={styles.cardSubtitle}>
                    Highlight features, condition, trunk room, or driving tips
                  </Text>
                </View>
              </View>

              <View style={styles.field}>
                <View style={[styles.inputContainer, styles.textareaContainer]}>
                  <TextInput
                    value={form.description}
                    onChangeText={(val) => update("description", val)}
                    placeholder="Detail the vehicle condition, trunk capacity, sound system, fuel efficiency, and any special pickup notes..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    style={[styles.input, styles.textareaInput]}
                  />
                </View>
              </View>
            </View>

            {/* Card 3: Pickup Location Base */}
            <View style={styles.formCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <Ionicons name="location-outline" size={20} color={Colors.dark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Pickup Base & Location</Text>
                  <Text style={styles.cardSubtitle}>
                    Inherited from your operator business registry
                  </Text>
                </View>
              </View>

              <View style={styles.locationCardInner}>
                <View style={styles.locationIconBadge}>
                  <Ionicons name="location" size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationTitle}>
                    {pickupAddress || "Registered Garage Base"}
                  </Text>
                  <Text style={styles.locationHint}>
                    Renters will receive this exact address with map directions upon booking confirmation.
                  </Text>
                </View>
              </View>
            </View>

            {/* Card 4: Standard Policies Summary */}
            <View style={styles.formCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <MaterialCommunityIcons name="shield-car" size={19} color={Colors.dark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Rental Policies</Text>
                  <Text style={styles.cardSubtitle}>
                    Standard rules applied to this vehicle
                  </Text>
                </View>
              </View>

              <View style={styles.policyRow}>
                <MaterialCommunityIcons name="gas-station" size={16} color={Colors.secondary} />
                <Text style={styles.policyText}>Fuel: Return with same fuel level as dispatched</Text>
              </View>
              <View style={styles.policyRow}>
                <Ionicons name="time-outline" size={16} color={Colors.secondary} />
                <Text style={styles.policyText}>Late Return: Contact operator 2 hours in advance</Text>
              </View>
              <View style={styles.policyRow}>
                <Ionicons name="ban-outline" size={16} color={Colors.secondary} />
                <Text style={styles.policyText}>Cleanliness: Strictly no smoking inside the vehicle</Text>
              </View>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorBoxText}>{error}</Text>
              </View>
            ) : null}

            {/* Step 3 Actions */}
            <View style={styles.twoButtonRow}>
              <TouchableOpacity
                style={styles.secondaryStepBtn}
                onPress={() => setCurrentStep(2)}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={16} color={Colors.dark} />
                <Text style={styles.secondaryStepBtnText}>Back</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  title={
                    isOperatorPending
                      ? "Publishing Locked (Under Review)"
                      : "Publish Vehicle to Fleet"
                  }
                  onPress={submit}
                  loading={isSubmitting}
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* OPTION PICKER BOTTOM SHEET MODAL                                          */}
      {/* ========================================================================= */}
      <Modal
        visible={picker !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          setPicker(null);
          setPickerSearch("");
          setShowCustomBrandInput(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              setPicker(null);
              setPickerSearch("");
              setShowCustomBrandInput(false);
            }}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              Choose {picker?.replaceAll("_", " ")}
            </Text>

            {picker === "vehicle_brands" && showCustomBrandInput ? (
              <View style={styles.customBrandWrap}>
                <Text style={styles.customBrandLabel}>Enter Other Brand Name</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    value={customBrandText}
                    onChangeText={setCustomBrandText}
                    placeholder="e.g. CFMoto, SYM, Tesla, Ducati"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    autoFocus
                  />
                </View>
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
              <>
                {/* Search Bar for Brand or long lists */}
                {picker === "vehicle_brands" && (
                  <View style={styles.searchBox}>
                    <Ionicons name="search" size={16} color={Colors.secondary} />
                    <TextInput
                      value={pickerSearch}
                      onChangeText={setPickerSearch}
                      placeholder="Search brands (e.g. Toyota, Honda)..."
                      placeholderTextColor="#94A3B8"
                      style={styles.searchInput}
                    />
                    {pickerSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setPickerSearch("")}>
                        <Ionicons name="close-circle" size={16} color={Colors.secondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <ScrollView style={{ maxHeight: 330 }} showsVerticalScrollIndicator={false}>
                  {filteredOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={styles.optionItem}
                      onPress={() => selectOption(picker!, option)}
                    >
                      <Text style={styles.optionItemText}>{option.name}</Text>
                      <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                    </TouchableOpacity>
                  ))}

                  {/* Manual Brand Entry Option */}
                  {picker === "vehicle_brands" && (
                    <TouchableOpacity
                      style={styles.customOption}
                      onPress={() => setShowCustomBrandInput(true)}
                    >
                      <Ionicons name="add-circle" size={20} color={Colors.primary} />
                      <Text style={styles.customOptionText}>+ Add Other Brand (Type Manually)</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </>
            )}

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => {
                setPicker(null);
                setPickerSearch("");
                setShowCustomBrandInput(false);
              }}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

// =========================================================================
// REUSABLE UNIFIED FORM INPUT COMPONENTS (Matching other registration forms)
// =========================================================================

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  required?: boolean;
  prefix?: string;
  suffix?: string;
  error?: string;
  helperText?: string;
};

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "none",
  required,
  prefix,
  suffix,
  error,
  helperText,
}: FormFieldProps) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.requiredStar}> *</Text>}
      </View>
      <View style={[styles.inputContainer, error ? styles.inputError : null]}>
        {prefix ? (
          <View style={styles.prefixBadge}>
            <Text style={styles.prefixText}>{prefix}</Text>
          </View>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={styles.input}
        />
        {suffix ? <Text style={styles.suffixText}>{suffix}</Text> : null}
      </View>
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
      {helperText && !error ? <Text style={styles.fieldHelperText}>{helperText}</Text> : null}
    </View>
  );
}

type DropdownFieldProps = {
  label: string;
  value: string;
  onPress: () => void;
  required?: boolean;
  error?: string;
};

function DropdownField({ label, value, onPress, required, error }: DropdownFieldProps) {
  const isSelected = value && value !== "Select";
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.requiredStar}> *</Text>}
      </View>
      <TouchableOpacity
        style={[styles.inputContainer, error ? styles.inputError : null]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <Text
          numberOfLines={1}
          style={[styles.dropdownValueText, !isSelected && styles.placeholderText]}
        >
          {value || "Select"}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#64748B" />
      </TouchableOpacity>
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
    </View>
  );
}

// =========================================================================
// STYLES
// =========================================================================

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  screenEyebrow: {
    color: Colors.secondary,
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  screenTitle: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
  },

  // Responsive Stepper / Pagination Header
  paginationCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: Spacing.md,
    marginBottom: Spacing.md,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  paginationTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  stepBadge: {
    backgroundColor: Colors.logoBackground,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  stepBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.dark,
    letterSpacing: 0.5,
  },
  stepMetaRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepCurrentTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
  segmentTrackRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  segmentTouch: {
    flex: 1,
    paddingVertical: 3,
  },
  segmentBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#F1F5F9",
  },
  segmentBarCurrent: {
    backgroundColor: Colors.primary,
  },
  segmentBarPast: {
    backgroundColor: Colors.dark,
  },
  stepChipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  stepChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: Radius.md,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  stepChipActive: {
    backgroundColor: Colors.logoBackground,
    borderColor: Colors.primary,
  },
  stepChipPast: {
    backgroundColor: Colors.white,
    borderColor: Colors.border,
  },
  stepChipDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepChipDotActive: {
    backgroundColor: Colors.primary,
  },
  stepChipDotPast: {
    backgroundColor: Colors.dark,
  },
  stepChipDotNum: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: "#64748B",
  },
  stepChipDotNumActive: {
    color: Colors.dark,
  },
  stepChipText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: "#64748B",
  },
  stepChipTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  stepChipTextPast: {
    fontFamily: FontFamily.medium,
    color: Colors.dark,
  },

  // Form Cards
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: Spacing.md,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cardHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.logoBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  cardSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
    marginTop: 1,
  },
  photoCountBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  photoCountText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.dark,
  },

  // Unified Form Inputs (Matching Registration)
  field: {
    marginBottom: Spacing.sm,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.dark,
  },
  requiredStar: {
    color: "#EF4444",
    fontFamily: FontFamily.bold,
    fontSize: 13,
  },
  inputContainer: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  input: {
    flex: 1,
    minHeight: 44,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.dark,
    paddingVertical: 0,
  },
  dropdownValueText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.dark,
  },
  placeholderText: {
    color: "#94A3B8",
  },
  prefixBadge: {
    marginRight: 6,
    paddingRight: 6,
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
  },
  prefixText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.primary,
  },
  suffixText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.secondary,
    marginLeft: 6,
  },
  fieldErrorText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: "#EF4444",
    marginTop: 4,
  },
  fieldHelperText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 3,
  },

  // Two Column Layout
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  col: {
    flex: 1,
  },

  // Photos Section
  photosContainer: {
    gap: Spacing.sm,
  },
  emptyUploader: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyUploaderIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.logoBackground,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  emptyUploaderTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
    marginTop: 4,
  },
  emptyUploaderSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
    marginTop: 2,
    textAlign: "center",
  },
  choosePhotosBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radius.md,
    marginTop: 12,
  },
  choosePhotosBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.white,
  },
  coverPhotoWrap: {
    position: "relative",
    width: "100%",
    height: 180,
    borderRadius: Radius.md,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
  },
  coverPhotoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  coverTagBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  coverTagText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.white,
  },
  coverDeleteBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailsScroll: {
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  thumbCard: {
    position: "relative",
    width: 90,
    height: 90,
    borderRadius: Radius.md,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  thumbDeleteBtn: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  setCoverPill: {
    position: "absolute",
    bottom: 5,
    left: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 6,
    paddingVertical: 2,
    alignItems: "center",
  },
  setCoverPillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 9,
    color: Colors.white,
  },
  addMoreCard: {
    width: 90,
    height: 90,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  addMoreCardText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.primary,
  },

  // Amenities Grid
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Radius.md,
    width: "48.5%",
    minHeight: 46,
  },
  amenityChipSelected: {
    backgroundColor: Colors.logoBackground,
    borderColor: Colors.primary,
  },
  amenityIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  amenityIconWrapSelected: {
    backgroundColor: Colors.primary,
  },
  amenityLabel: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: Colors.dark,
    lineHeight: 15,
  },
  amenityLabelSelected: {
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  amenityUncheckedCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },

  // Textarea
  textareaContainer: {
    minHeight: 110,
    alignItems: "flex-start",
    paddingVertical: Spacing.sm,
  },
  textareaInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },

  // Location & Policies
  locationCardInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: Colors.logoBackground,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: Spacing.md,
  },
  locationIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  locationTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
    lineHeight: 18,
  },
  locationHint: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
    marginTop: 3,
    lineHeight: 16,
  },
  policyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  policyText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.dark,
    flex: 1,
  },

  // Action Buttons
  actionsRow: {
    marginTop: Spacing.xs,
  },
  twoButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: Spacing.xs,
  },
  secondaryStepBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: Colors.white,
  },
  secondaryStepBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },

  // Error Box
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    padding: Spacing.md,
  },
  errorBoxText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: "#B91C1C",
    flex: 1,
  },

  // Banners
  pendingWarningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: Colors.logoBackground,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  warningIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingWarningTitle: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    marginBottom: 2,
  },
  pendingWarningText: {
    color: Colors.dark,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    lineHeight: 18,
  },
  paymentWarningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: Colors.logoBackground,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  paymentWarningTitle: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    marginBottom: 2,
  },
  paymentWarningText: {
    color: Colors.dark,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    lineHeight: 18,
  },
  paymentSetupActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: Colors.dark,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    marginTop: 8,
  },
  paymentSetupActionBtnText: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: 12,
  },

  // Bottom Sheet Modal
  modalBackdrop: {
    backgroundColor: "rgba(0,0,0,0.5)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    marginBottom: Spacing.md,
    textTransform: "capitalize",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.dark,
    paddingVertical: 0,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomColor: "#F1F5F9",
    borderBottomWidth: 1,
    paddingVertical: 14,
  },
  optionItemText: {
    color: Colors.dark,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
  },
  customOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.logoBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: Spacing.sm,
  },
  customOptionText: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
  },
  customBrandWrap: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  customBrandLabel: {
    color: Colors.dark,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.small,
    marginBottom: Spacing.xs,
  },
  customBrandActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  customBrandCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  cancelText: {
    color: Colors.secondary,
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
  },
  customBrandSave: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  saveText: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: 13,
  },
  modalCancelBtn: {
    marginTop: Spacing.md,
    paddingVertical: 10,
    alignItems: "center",
  },
  modalCancelText: {
    color: Colors.secondary,
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
  },
});
