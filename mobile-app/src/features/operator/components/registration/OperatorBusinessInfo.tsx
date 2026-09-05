import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import PrimaryButton from "@/components/common/PrimaryButton";
import { Colors } from "@/constants/colors";
import { ORIENTAL_MINDORO_LOCATIONS } from "@/constants/orientalMindoroLocations";
import {
  FontFamily,
  FontSize,
  Radius,
  Spacing,
} from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import RegistrationHeader from "./RegistrationHeader";

type OperatorBusinessInfoProps = {
  initialData?: BusinessInfoData | null;
  onBack: () => void;
  onCancel: () => void;
  onContinue: (data: BusinessInfoData) => void;
};

export type BusinessInfoData = {
  businessName: string;
  streetAddress: string;
  barangay: string;
  municipality: string;
  businessContactNumber: string;
  businessEmail: string;
  password: string;
  confirmPassword: string;
};

type FormErrors = {
  businessName?: string;
  streetAddress?: string;
  barangay?: string;
  municipality?: string;
  businessContactNumber?: string;
  businessEmail?: string;
  password?: string;
  confirmPassword?: string;
};

const MUNICIPALITIES = ORIENTAL_MINDORO_LOCATIONS.map(
  (location) => location.name
);

export default function OperatorBusinessInfo({
  initialData,
  onBack,
  onCancel,
  onContinue,
}: OperatorBusinessInfoProps) {
  const { showModal } = useAppToast();
  const [businessName, setBusinessName] = useState(
    initialData?.businessName ?? ""
  );

  const [streetAddress, setStreetAddress] = useState(
    initialData?.streetAddress ?? ""
  );

  const [barangay, setBarangay] = useState(
    initialData?.barangay ?? ""
  );

  const [municipality, setMunicipality] = useState(
    initialData?.municipality ?? ""
  );

  const [businessContactNumber, setBusinessContactNumber] =
    useState(initialData?.businessContactNumber ?? "");

  const [businessEmail, setBusinessEmail] = useState(
    initialData?.businessEmail ?? ""
  );

  const [password, setPassword] = useState(
    initialData?.password ?? ""
  );

  const [confirmPassword, setConfirmPassword] =
    useState(initialData?.confirmPassword ?? "");

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [showMunicipalityPicker, setShowMunicipalityPicker] =
    useState(false);

  const [showBarangayPicker, setShowBarangayPicker] =
    useState(false);

  const [barangays, setBarangays] = useState<string[]>([]);

  const [errors, setErrors] = useState<FormErrors>({});

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validateMobileNumber = (value: string) => {
    return /^(09\d{9}|\+639\d{9})$/.test(value);
  };

  const clearError = (field: keyof FormErrors) => {
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const updated = { ...current };
      delete updated[field];

      return updated;
    });
  };

  const handleMunicipalitySelect = (
    selectedMunicipality: string
  ) => {
    const municipalityData =
      ORIENTAL_MINDORO_LOCATIONS.find(
        (item) => item.name === selectedMunicipality
      );

    setMunicipality(selectedMunicipality);
    setBarangay("");
    setShowMunicipalityPicker(false);
    setShowBarangayPicker(false);

    clearError("municipality");
    clearError("barangay");

    if (!municipalityData) {
      setBarangays([]);
      return;
    }

    setBarangays(
      [...municipalityData.barangays].sort((a, b) =>
        a.localeCompare(b)
      )
    );
  };

  const handleBarangaySelect = (
    selectedBarangay: string
  ) => {
    setBarangay(selectedBarangay);

    clearError("barangay");

    setShowBarangayPicker(false);
  };

  const openMunicipalityPicker = () => {
    setShowBarangayPicker(false);
    setShowMunicipalityPicker(true);
  };

  const openBarangayPicker = () => {
    if (!municipality || barangays.length === 0) {
      return;
    }

    setShowMunicipalityPicker(false);
    setShowBarangayPicker(true);
  };

  const handleContinue = () => {
    const hasAnyData =
      businessName.trim() ||
      streetAddress.trim() ||
      barangay.trim() ||
      municipality.trim() ||
      businessContactNumber.trim() ||
      businessEmail.trim() ||
      password ||
      confirmPassword;

    if (!hasAnyData) {
      showModal(
        "Information Required",
        "Please fill in your business information before continuing.",
        [{ text: "OK" }],
        "warning"
      );
      return;
    }

    const validationErrors: FormErrors = {};

    if (!businessName.trim()) {
      validationErrors.businessName =
        "Business name is required.";
    }

    if (!municipality.trim()) {
      validationErrors.municipality =
        "Municipality is required.";
    }

    if (!barangay.trim()) {
      validationErrors.barangay =
        "Barangay is required.";
    }

    if (!streetAddress.trim()) {
      validationErrors.streetAddress =
        "Street, building, or house number is required.";
    }

    if (!businessContactNumber.trim()) {
      validationErrors.businessContactNumber =
        "Business contact number is required.";
    } else if (
      !validateMobileNumber(
        businessContactNumber.trim()
      )
    ) {
      validationErrors.businessContactNumber =
        "Use a valid Philippine mobile number.";
    }

    if (!businessEmail.trim()) {
      validationErrors.businessEmail =
        "Business email is required.";
    } else if (
      !validateEmail(businessEmail.trim())
    ) {
      validationErrors.businessEmail =
        "Please enter a valid email address.";
    }

    if (!password) {
      validationErrors.password =
        "Password is required.";
    } else if (password.length < 8) {
      validationErrors.password =
        "Password must be at least 8 characters.";
    }

    if (!confirmPassword) {
      validationErrors.confirmPassword =
        "Please confirm your password.";
    } else if (password !== confirmPassword) {
      validationErrors.confirmPassword =
        "Passwords do not match.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    onContinue({
      businessName: businessName.trim(),
      streetAddress: streetAddress.trim(),
      barangay: barangay.trim(),
      municipality: municipality.trim(),
      businessContactNumber:
        businessContactNumber.trim(),
      businessEmail:
        businessEmail.trim().toLowerCase(),
      password,
      confirmPassword,
    });
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <RegistrationHeader
        currentStep={3}
        totalSteps={4}
        onBack={onBack}
        onCancel={onCancel}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={styles.title}>
            Business & Account Information
          </Text>

          <Text style={styles.subtitle}>
            Tell us about your rental business.
          </Text>

          <FormField
            label="Business Name"
            placeholder="e.g. Juan's Car Rental"
            value={businessName}
            onChangeText={(value) => {
              setBusinessName(value);
              clearError("businessName");
            }}
            autoCapitalize="words"
            error={errors.businessName}
          />

          <DropdownField
            label="Municipality"
            placeholder="Select municipality"
            value={municipality}
            onPress={openMunicipalityPicker}
            error={errors.municipality}
          />

          <DropdownField
            label="Barangay"
            placeholder={
              !municipality
                ? "Select municipality first"
                : barangays.length === 0
                ? "No barangays available"
                : "Select barangay"
            }
            value={barangay}
            disabled={
              !municipality ||
              barangays.length === 0
            }
            onPress={openBarangayPicker}
            error={errors.barangay}
          />

          <FormField
            label="Street / Building / House No."
            placeholder="e.g. 123 Rizal Street"
            value={streetAddress}
            onChangeText={(value) => {
              setStreetAddress(value);
              clearError("streetAddress");
            }}
            error={errors.streetAddress}
          />

          <FormField
            label="Business Contact Number"
            placeholder="09XXXXXXXXX"
            value={businessContactNumber}
            onChangeText={(value) => {
              setBusinessContactNumber(value);
              clearError(
                "businessContactNumber"
              );
            }}
            keyboardType="phone-pad"
            autoCorrect={false}
            error={
              errors.businessContactNumber
            }
          />

          <FormField
            label="Business Email Address"
            placeholder="business@example.com"
            value={businessEmail}
            onChangeText={(value) => {
              setBusinessEmail(value);
              clearError("businessEmail");
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.businessEmail}
          />

          <FormField
            label="Password"
            placeholder="Create a password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              clearError("password");

              if (
                confirmPassword &&
                value === confirmPassword
              ) {
                clearError("confirmPassword");
              }
            }}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.password}
            rightIcon={
              <Pressable
                onPress={() =>
                  setShowPassword(!showPassword)
                }
                hitSlop={10}
              >
                <Ionicons
                  name={
                    showPassword
                      ? "eye-off-outline"
                      : "eye-outline"
                  }
                  size={21}
                  color={Colors.secondary}
                />
              </Pressable>
            }
          />

          <FormField
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              clearError("confirmPassword");
            }}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.confirmPassword}
            rightIcon={
              <Pressable
                onPress={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
                hitSlop={10}
              >
                <Ionicons
                  name={
                    showConfirmPassword
                      ? "eye-off-outline"
                      : "eye-outline"
                  }
                  size={21}
                  color={Colors.secondary}
                />
              </Pressable>
            }
          />

          <PrimaryButton
            style={styles.continueButton}
            title="Continue"
            onPress={handleContinue}
          />

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>

      <SelectionModal
        visible={showMunicipalityPicker}
        title="Select Municipality"
        subtitle="Choose the location of your rental business."
        items={MUNICIPALITIES}
        selectedValue={municipality}
        onSelect={handleMunicipalitySelect}
        onClose={() =>
          setShowMunicipalityPicker(false)
        }
      />

      <SelectionModal
        visible={showBarangayPicker}
        title="Select Barangay"
        subtitle={
          municipality
            ? `Barangays in ${municipality}`
            : "Select a municipality first."
        }
        items={barangays}
        selectedValue={barangay}
        onSelect={handleBarangaySelect}
        onClose={() =>
          setShowBarangayPicker(false)
        }
      />
    </SafeAreaView>
  );
}

type FormFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?:
    | "default"
    | "email-address"
    | "phone-pad";
  secureTextEntry?: boolean;
  autoCapitalize?:
    | "none"
    | "sentences"
    | "words"
    | "characters";
  autoCorrect?: boolean;
  rightIcon?: React.ReactNode;
  error?: string;
};

function FormField({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  secureTextEntry = false,
  autoCapitalize = "sentences",
  autoCorrect = true,
  rightIcon,
  error,
}: FormFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.inputContainer,
          error && styles.inputError,
        ]}
      >
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#A0A0A0"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          returnKeyType="next"
        />

        {rightIcon}
      </View>

      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
}

type DropdownFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
  error?: string;
};

function DropdownField({
  label,
  placeholder,
  value,
  onPress,
  disabled = false,
  error,
}: DropdownFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        style={[
          styles.inputContainer,
          error && styles.inputError,
          disabled && styles.disabledInput,
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.dropdownText,
            !value && styles.placeholder,
            disabled &&
              styles.disabledDropdownText,
          ]}
        >
          {value || placeholder}
        </Text>

        <Ionicons
          name="chevron-down"
          size={19}
          color={
            disabled
              ? "#C5C5C5"
              : Colors.secondary
          }
        />
      </Pressable>

      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
}

type SelectionModalProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  items: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
};

function SelectionModal({
  visible,
  title,
  subtitle,
  items,
  selectedValue,
  onSelect,
  onClose,
}: SelectionModalProps) {
  const [search, setSearch] = useState("");

  const filteredItems = items.filter((item) =>
    item
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleClose = () => {
    setSearch("");
    onClose();
  };

  const handleSelect = (value: string) => {
    setSearch("");
    onSelect(value);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={handleClose}
        />

        <View style={styles.selectionCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text style={styles.pickerTitle}>
                {title}
              </Text>

              <Text style={styles.pickerSubtitle}>
                {subtitle}
              </Text>
            </View>

            <Pressable
              onPress={handleClose}
              hitSlop={10}
            >
              <Ionicons
                name="close"
                size={23}
                color={Colors.secondary}
              />
            </Pressable>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={19}
              color={Colors.secondary}
            />

            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor="#A0A0A0"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <ScrollView
            style={styles.selectionList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {filteredItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No results found.
                </Text>
              </View>
            ) : (
              filteredItems.map((item) => (
                <Pressable
                  key={item}
                  style={[
                    styles.selectionItem,
                    item === selectedValue &&
                      styles.selectionItemActive,
                  ]}
                  onPress={() =>
                    handleSelect(item)
                  }
                >
                  <Text
                    style={[
                      styles.selectionItemText,
                      item === selectedValue &&
                        styles.selectionItemTextActive,
                    ]}
                  >
                    {item}
                  </Text>

                  {item === selectedValue && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={Colors.primary}
                    />
                  )}
                </Pressable>
              ))
            )}
          </ScrollView>

          <Pressable
            style={styles.modalCancel}
            onPress={handleClose}
          >
            <Text style={styles.modalCancelText}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
  },

  keyboardContainer: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: 140,
  },

  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
    color: Colors.dark,
  },

  subtitle: {
    marginTop: 4,
    marginBottom: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.secondary,
  },

  field: {
    marginBottom: Spacing.sm,
  },

  label: {
    marginBottom: 5,
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.dark,
  },

  inputContainer: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E2E2",
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
  },

  inputError: {
    borderColor: "#E53935",
  },

  disabledInput: {
    backgroundColor: "#F7F7F7",
  },

  input: {
    flex: 1,
    minHeight: 44,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.dark,
    paddingVertical: 0,
  },

  dropdownText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.dark,
  },

  placeholder: {
    color: "#A0A0A0",
  },

  disabledDropdownText: {
    color: "#A0A0A0",
  },

  errorText: {
    marginTop: 4,
    fontFamily: FontFamily.regular,
    fontSize: 11,
    lineHeight: 15,
    color: "#E53935",
  },

  continueButton: {
    marginTop: 40,
  },

  bottomSpacing: {
    height: Spacing.md,
  },

  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },

  selectionCard: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    elevation: 15,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  modalHeaderText: {
    flex: 1,
    paddingRight: Spacing.md,
  },

  pickerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    color: Colors.dark,
  },

  pickerSubtitle: {
    marginTop: 4,
    marginBottom: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.secondary,
  },

  searchContainer: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E2E2",
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: "#F7F7F7",
  },

  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    minHeight: 42,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.dark,
  },

  selectionList: {
    maxHeight: 350,
  },

  selectionItem: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: 4,
  },

  selectionItemActive: {
    backgroundColor: "#FFF4E8",
  },

  selectionItemText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.dark,
  },

  selectionItemTextActive: {
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },

  emptyContainer: {
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.secondary,
  },

  modalCancel: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },

  modalCancelText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.primary,
  },
});
