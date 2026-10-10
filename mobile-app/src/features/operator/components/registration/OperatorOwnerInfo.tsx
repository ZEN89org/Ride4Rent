import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

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

import AppBottomSheet from "@/components/common/AppBottomSheet";
import BirthdatePicker from "@/components/common/BirthdatePicker";
import PrimaryButton from "@/components/common/PrimaryButton";
import { Colors } from "@/constants/colors";
import {
  FontFamily,
  FontSize,
  Radius,
  Spacing,
} from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import RegistrationHeader from "./RegistrationHeader";

type OperatorOwnerInfoProps = {
  initialData?: OwnerInfoData | null;
  onBack: () => void;
  onCancel: () => void;
  onContinue: (data: OwnerInfoData) => void;
};

export type OwnerInfoData = {
  lastName: string;
  firstName: string;
  middleName: string;
  suffix: string;
  dateOfBirth: string;
  gender: string;
};

const genders = [
  "Male",
  "Female",
  "Prefer not to say",
];

export default function OperatorOwnerInfo({
  initialData,
  onBack,
  onCancel,
  onContinue,
}: OperatorOwnerInfoProps) {
  const { showModal } = useAppToast();
  const [firstName, setFirstName] = useState(
    initialData?.firstName ?? ""
  );

  const [middleName, setMiddleName] = useState(
    initialData?.middleName ?? ""
  );

  const [lastName, setLastName] = useState(
    initialData?.lastName ?? ""
  );

  const [suffix, setSuffix] = useState(
    initialData?.suffix ?? ""
  );

  const [dateMonth, setDateMonth] = useState(
    initialData?.dateOfBirth?.split("-")[1] ?? ""
  );

  const [dateDay, setDateDay] = useState(
    initialData?.dateOfBirth?.split("-")[2] ?? ""
  );

  const [dateYear, setDateYear] = useState(
    initialData?.dateOfBirth?.split("-")[0] ?? ""
  );

  const [gender, setGender] = useState(
    initialData?.gender ?? ""
  );

  const [showDatePicker, setShowDatePicker] =
    useState(false);

  const [showGenderPicker, setShowGenderPicker] =
    useState(false);

  const [errors, setErrors] = useState<{
    lastName?: string;
    firstName?: string;
    dateOfBirth?: string;
    gender?: string;
  }>({});

  const validateDate = () => {
    if (!dateMonth || !dateDay || !dateYear) {
      return false;
    }

    const date = new Date(
      Number(dateYear),
      Number(dateMonth) - 1,
      Number(dateDay)
    );

    return (
      date.getFullYear() ===
        Number(dateYear) &&
      date.getMonth() ===
        Number(dateMonth) - 1 &&
      date.getDate() === Number(dateDay)
    );
  };

  const validateAge = () => {
    if (!dateMonth || !dateDay || !dateYear) {
      return false;
    }

    const y = Number(dateYear);
    const m = Number(dateMonth);
    const d = Number(dateDay);
    const today = new Date();
    let age = today.getFullYear() - y;
    const mDiff = today.getMonth() + 1 - m;
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < d)) {
      age--;
    }
    return age >= 18;
  };

  const formatDate = () => {
    if (!validateDate()) {
      return "";
    }

    return `${dateYear}-${dateMonth.padStart(
      2,
      "0"
    )}-${dateDay.padStart(2, "0")}`;
  };

  const clearError = (
    field: keyof typeof errors
  ) => {
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const updated = { ...current };
      delete updated[field];

      return updated;
    });
  };

  const handleContinue = () => {
    const hasAnyData =
      lastName.trim() ||
      firstName.trim() ||
      middleName.trim() ||
      suffix.trim() ||
      dateMonth ||
      dateDay ||
      dateYear ||
      gender;

    if (!hasAnyData) {
      showModal(
        "Information Required",
        "Please fill in your information before continuing.",
        [{ text: "OK" }],
        "warning"
      );
      return;
    }

    const validationErrors: typeof errors = {};

    if (!lastName.trim()) {
      validationErrors.lastName =
        "Last name is required.";
    }

    if (!firstName.trim()) {
      validationErrors.firstName =
        "First name is required.";
    }

    if (!dateMonth || !dateDay || !dateYear) {
      validationErrors.dateOfBirth =
        "Date of birth is required.";
    } else if (!validateDate()) {
      validationErrors.dateOfBirth =
        "Please select a valid date of birth.";
    } else if (!validateAge()) {
      validationErrors.dateOfBirth =
        "You must be at least 18 years old to register.";
    }

    if (!gender) {
      validationErrors.gender =
        "Gender is required.";
    }

    if (
      Object.keys(validationErrors).length > 0
    ) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    onContinue({
      lastName: lastName.trim(),
      firstName: firstName.trim(),
      middleName: middleName.trim(),
      suffix: suffix.trim(),
      dateOfBirth: formatDate(),
      gender,
    });
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <RegistrationHeader
        currentStep={2}
        totalSteps={4}
        onBack={onBack}
        onCancel={onCancel}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>
            Owner Information
          </Text>

          <Text style={styles.subtitle}>
            Let’s begin with the business owner’s
            personal information.
          </Text>

          <View style={styles.row}>
            <FormField
              label="Last Name"
              placeholder="e.g. Dela Cruz"
              value={lastName}
              onChangeText={(value) => {
                setLastName(value);
                clearError("lastName");
              }}
              error={errors.lastName}
            />

            <FormField
              label="First Name"
              placeholder="e.g. Juan"
              value={firstName}
              onChangeText={(value) => {
                setFirstName(value);
                clearError("firstName");
              }}
              error={errors.firstName}
            />
          </View>

          <View style={styles.row}>
            <FormField
              label="Middle Name (Optional)"
              placeholder="e.g. Santos"
              value={middleName}
              onChangeText={setMiddleName}
            />

            <FormField
              label="Suffix (Optional)"
              placeholder="Jr., Sr., III"
              value={suffix}
              onChangeText={setSuffix}
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <BirthdatePicker
                label="Date of Birth"
                value={formatDate()}
                onChange={(_, parts) => {
                  setDateYear(parts.year);
                  setDateMonth(parts.month);
                  setDateDay(parts.day);
                  clearError("dateOfBirth");
                }}
                error={errors.dateOfBirth}
              />
            </View>

            <DropdownField
              label="Gender"
              value={
                gender || "Select your gender"
              }
              onPress={() => {
                clearError("gender");
                setShowGenderPicker(true);
              }}
              error={errors.gender}
            />
          </View>

          <PrimaryButton
            style={styles.continueButton}
            title="Continue"
            onPress={handleContinue}
          />

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>

      <GenderPickerModal
        visible={showGenderPicker}
        value={gender}
        onClose={() =>
          setShowGenderPicker(false)
        }
        onSelect={(value) => {
          setGender(value);
          setShowGenderPicker(false);
          clearError("gender");
        }}
      />
    </SafeAreaView>
  );
}

type FormFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
};

function FormField({
  label,
  placeholder,
  value,
  onChangeText,
  error,
}: FormFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
      </Text>

      <View
        style={[
          styles.inputContainer,
          error && styles.inputError,
        ]}
      >
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#A0A0A0"
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="words"
          autoCorrect
          style={styles.input}
        />
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
  value: string;
  onPress: () => void;
  error?: string;
};

function DropdownField({
  label,
  value,
  onPress,
  error,
}: DropdownFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
      </Text>

      <Pressable
        style={[
          styles.inputContainer,
          error && styles.inputError,
        ]}
        onPress={onPress}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.dropdownText,
            value.startsWith("Select") &&
              styles.placeholder,
          ]}
        >
          {value}
        </Text>

        <Ionicons
          name="chevron-down"
          size={19}
          color={Colors.secondary}
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

type DatePickerModalProps = {
  visible: boolean;
  month: string;
  day: string;
  year: string;
  onClose: () => void;
  onConfirm: (
    month: string,
    day: string,
    year: string
  ) => void;
};

function DatePickerModal({
  visible,
  month,
  day,
  year,
  onClose,
  onConfirm,
}: DatePickerModalProps) {
  const months = Array.from(
    { length: 12 },
    (_, index) =>
      String(index + 1).padStart(2, "0")
  );

  const days = Array.from(
    { length: 31 },
    (_, index) =>
      String(index + 1).padStart(2, "0")
  );

  const currentYear =
    new Date().getFullYear();

  const minimumAge = 18;
  const oldestAge = 100;

  const maximumBirthYear =
    currentYear - minimumAge;

  const minimumBirthYear =
    currentYear - oldestAge;

  const years = Array.from(
    {
      length:
        maximumBirthYear -
        minimumBirthYear +
        1,
    },
    (_, index) =>
      String(
        maximumBirthYear - index
      )
  );

  const [selectedMonth, setSelectedMonth] =
    useState(month || "01");

  const [selectedDay, setSelectedDay] =
    useState(day || "01");

  const [selectedYear, setSelectedYear] =
    useState(
      year ||
        String(currentYear - 18)
    );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={onClose}
        />

        <View style={styles.pickerCard}>
          <Text style={styles.pickerTitle}>
            Date of Birth
          </Text>

          <Text style={styles.pickerSubtitle}>
            Select your birth date
          </Text>

          <View style={styles.dateColumns}>
            <PickerColumn
              title="Month"
              values={months}
              value={selectedMonth}
              onSelect={setSelectedMonth}
            />

            <PickerColumn
              title="Day"
              values={days}
              value={selectedDay}
              onSelect={setSelectedDay}
            />

            <PickerColumn
              title="Year"
              values={years}
              value={selectedYear}
              onSelect={setSelectedYear}
            />
          </View>

          <PrimaryButton
            title="Confirm"
            onPress={() =>
              onConfirm(
                selectedMonth,
                selectedDay,
                selectedYear
              )
            }
          />

          <Pressable
            style={styles.modalCancel}
            onPress={onClose}
          >
            <Text
              style={
                styles.modalCancelText
              }
            >
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

type PickerColumnProps = {
  title: string;
  values: string[];
  value: string;
  onSelect: (value: string) => void;
};

function PickerColumn({
  title,
  values,
  value,
  onSelect,
}: PickerColumnProps) {
  return (
    <View style={styles.pickerColumn}>
      <Text style={styles.columnTitle}>
        {title}
      </Text>

      <ScrollView
        style={styles.columnScroll}
        showsVerticalScrollIndicator={false}
      >
        {values.map((item) => (
          <Pressable
            key={item}
            style={[
              styles.pickerItem,
              item === value &&
                styles.pickerItemActive,
            ]}
            onPress={() =>
              onSelect(item)
            }
          >
            <Text
              style={[
                styles.pickerItemText,
                item === value &&
                  styles.pickerItemTextActive,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

type GenderPickerModalProps = {
  visible: boolean;
  value: string;
  onClose: () => void;
  onSelect: (value: string) => void;
};

function GenderPickerModal({
  visible,
  value,
  onClose,
  onSelect,
}: GenderPickerModalProps) {
  return (
    <AppBottomSheet visible={visible} onClose={onClose}>
      <View style={{ paddingBottom: 16 }}>
        <Text style={styles.pickerTitle}>
          Select Gender
        </Text>

        <Text style={styles.pickerSubtitle}>
          Choose the option that best
          describes you.
        </Text>

        {genders.map((item) => (
          <Pressable
            key={item}
            style={[
              styles.genderOption,
              item === value &&
                styles.genderOptionActive,
            ]}
            onPress={() =>
              onSelect(item)
            }
          >
            <Text
              style={[
                styles.genderText,
                item === value &&
                  styles.genderTextActive,
              ]}
            >
              {item}
            </Text>

            {item === value && (
              <Ionicons
                name="checkmark"
                size={20}
                color={Colors.primary}
              />
            )}
          </Pressable>
        ))}

        <Pressable
          style={styles.modalCancel}
          onPress={onClose}
        >
          <Text
            style={
              styles.modalCancelText
            }
          >
            Cancel
          </Text>
        </Pressable>
      </View>
    </AppBottomSheet>
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

  row: {
    flexDirection: "row",
    gap: Spacing.sm,
  },

  field: {
    flex: 1,
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

  errorText: {
    marginTop: 4,
    fontFamily: FontFamily.regular,
    fontSize: 11,
    lineHeight: 15,
    color: "#E53935",
  },

  continueButton: {
    marginTop: 50,
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
    backgroundColor:
      "rgba(0, 0, 0, 0.45)",
  },

  pickerCard: {
    width: "90%",
    maxHeight: "75%",
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    elevation: 15,
  },

  genderCard: {
    width: "90%",
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    elevation: 15,
  },

  pickerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    color: Colors.dark,
  },

  pickerSubtitle: {
    marginTop: 4,
    marginBottom: Spacing.lg,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
  },

  dateColumns: {
    flexDirection: "row",
    gap: Spacing.sm,
    height: 230,
    marginBottom: Spacing.lg,
  },

  pickerColumn: {
    flex: 1,
  },

  columnTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.secondary,
  },

  columnScroll: {
    borderRadius: Radius.md,
    backgroundColor: "#F7F7F7",
  },

  pickerItem: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  pickerItemActive: {
    backgroundColor: "#FFF4E8",
  },

  pickerItemText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.dark,
  },

  pickerItemTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.primary,
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

  genderOption: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    backgroundColor: "#F7F7F7",
  },

  genderOptionActive: {
    backgroundColor: "#FFF4E8",
  },

  genderText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.dark,
  },

  genderTextActive: {
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },
});
