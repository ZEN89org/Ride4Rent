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

import AppFooter from "@/components/common/AppFooter";
import PrimaryButton from "@/components/common/PrimaryButton";
import { useAppToast } from "@/context/ToastContext";
import { Colors } from "@/constants/colors";
import {
    FontFamily,
    FontSize,
    Radius,
    Spacing,
} from "@/constants/theme";
import { register, sendVerificationOtp } from "@/features/auth/services/authService";
import OtpVerificationModal from "@/features/auth/components/OtpVerificationModal";
import RegistrationHeader from "./RegistrationHeader";

type RenterRegistrationFormProps = {
  onBack: () => void;
  onCancel: () => void;
  onSuccess: () => void;
};

const genders = [
  "Male",
  "Female",
  "Prefer not to say",
];

type FormErrors = {
  lastName?: string;
  firstName?: string;
  dateOfBirth?: string;
  gender?: string;
  email?: string;
  mobileNumber?: string;
  password?: string;
  confirmPassword?: string;
  agreement?: string;
};

export default function RenterRegistrationForm({
  onBack,
  onCancel,
  onSuccess,
}: RenterRegistrationFormProps) {
  const { showModal } = useAppToast();
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [showDatePicker, setShowDatePicker] =
    useState(false);
  const [showGenderPicker, setShowGenderPicker] =
    useState(false);

  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);

  const [dateMonth, setDateMonth] = useState("");
  const [dateDay, setDateDay] = useState("");
  const [dateYear, setDateYear] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});

  const validateMobileNumber = (value: string) => {
    return /^(09\d{9}|\+639\d{9})$/.test(value);
  };

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

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
      date.getFullYear() === Number(dateYear) &&
      date.getMonth() === Number(dateMonth) - 1 &&
      date.getDate() === Number(dateDay)
    );
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

  const handleRegister = async () => {
    const requiredFieldsAreEmpty =
      !lastName.trim() &&
      !firstName.trim() &&
      !dateMonth &&
      !dateDay &&
      !dateYear &&
      !gender &&
      !email.trim() &&
      !mobileNumber.trim() &&
      !password &&
      !confirmPassword &&
      !agreed;

    if (requiredFieldsAreEmpty) {
      setErrors({});

      showModal(
        "Incomplete Information",
        "Please complete all required fields.",
        [
          {
            text: "OK",
            style: "default",
          },
        ],
        "warning"
      );

      return;
    }

    const validationErrors: FormErrors = {};

    if (!lastName.trim()) {
      validationErrors.lastName = "Last name is required.";
    }

    if (!firstName.trim()) {
      validationErrors.firstName = "First name is required.";
    }

    if (!dateMonth || !dateDay || !dateYear) {
      validationErrors.dateOfBirth =
        "Date of birth is required.";
    } else if (!validateDate()) {
      validationErrors.dateOfBirth =
        "Please select a valid date of birth.";
    }

    if (!gender) {
      validationErrors.gender = "Gender is required.";
    }

    if (!email.trim()) {
      validationErrors.email = "Email is required.";
    } else if (!validateEmail(email.trim())) {
      validationErrors.email =
        "Please enter a valid email address.";
    }

    if (!mobileNumber.trim()) {
      validationErrors.mobileNumber =
        "Mobile number is required.";
    } else if (
      !validateMobileNumber(mobileNumber.trim())
    ) {
      validationErrors.mobileNumber =
        "Use a valid Philippine mobile number.";
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

    if (!agreed) {
      validationErrors.agreement =
        "Please agree to the Terms of Service & Privacy Policy.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    try {
      setLoading(true);
      await sendVerificationOtp(email.trim().toLowerCase());
      setShowOtpModal(true);
    } catch (error: any) {
      console.log("Send OTP Error:", error.message, error.response?.data);
      const backendErrors = error.response?.data?.errors;
      if (backendErrors?.email) {
        setErrors({ email: backendErrors.email[0] });
      } else if (error.response?.data?.message) {
        showModal("Notice", error.response.data.message, [{ text: "OK" }], "error");
      } else if (error.message === "Network Error") {
        showModal(
          "Connection Error",
          "Could not reach backend server. Please verify php artisan serve --host=0.0.0.0 is running.",
          [{ text: "OK" }],
          "error"
        );
      } else {
        showModal("Notice", error.message || "Unable to send verification code to this Gmail address.", [{ text: "OK" }], "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifiedOtp = async (otpCode: string) => {
    setShowOtpModal(false);
    try {
      setLoading(true);
      await register({
        first_name: firstName.trim(),
        middle_name: middleName.trim() || undefined,
        last_name: lastName.trim(),
        suffix: suffix.trim() || undefined,
        date_of_birth: `${dateYear}-${dateMonth}-${dateDay}`,
        sex: gender,
        email: email.trim().toLowerCase(),
        mobile_number: mobileNumber.trim(),
        password,
        password_confirmation: confirmPassword,
        otp: otpCode,
      });

      onSuccess();
    } catch (error: any) {
      console.log("Registration Error:", error.message, error.response?.data);
      const backendErrors = error.response?.data?.errors;

      if (backendErrors) {
        const mappedErrors: FormErrors = {};

        if (backendErrors.email) {
          mappedErrors.email = backendErrors.email[0];
        }

        if (backendErrors.mobile_number) {
          mappedErrors.mobileNumber = backendErrors.mobile_number[0];
        }

        if (backendErrors.password) {
          mappedErrors.password = backendErrors.password[0];
        }

        if (backendErrors.password_confirmation) {
          mappedErrors.confirmPassword =
            backendErrors.password_confirmation[0];
        }

        setErrors(mappedErrors);
      } else if (error.response?.data?.message) {
        showModal(
          "Registration Failed",
          error.response.data.message,
          [{ text: "OK" }],
          "error"
        );
      } else {
        showModal(
          "Registration Failed",
          "Registration failed. Please try again.",
          [{ text: "OK" }],
          "error"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
      >
        <View style={styles.container}>
          <RegistrationHeader
            currentStep={2}
            totalSteps={2}
            onBack={onBack}
            onCancel={onCancel}
          />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={styles.title}>
            Personal Information
          </Text>

          <Text style={styles.subtitle}>
            Tell us a little about yourself to get started.
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
              autoCapitalize="words"
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
              autoCapitalize="words"
              error={errors.firstName}
            />
          </View>

          <View style={styles.row}>
            <FormField
              label="Middle Name (Optional)"
              placeholder="e.g. Santos"
              value={middleName}
              onChangeText={setMiddleName}
              autoCapitalize="words"
            />

            <FormField
              label="Suffix (Optional)"
              placeholder="Jr., Sr., III"
              value={suffix}
              onChangeText={setSuffix}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.row}>
            <FormField
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                clearError("email");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
            />

            <FormField
              label="Mobile No."
              placeholder="09XXXXXXXXX"
              value={mobileNumber}
              onChangeText={(value) => {
                setMobileNumber(value);
                clearError("mobileNumber");
              }}
              keyboardType="phone-pad"
              autoCorrect={false}
              error={errors.mobileNumber}
            />
          </View>

          <View style={styles.row}>
            <DropdownField
              label="Date of Birth"
              value={
                formatDate() || "Select your birth date"
              }
              onPress={() => {
                clearError("dateOfBirth");
                setShowDatePicker(true);
              }}
              error={errors.dateOfBirth}
            />

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

          <Pressable
            style={styles.agreement}
            onPress={() => {
              setAgreed(!agreed);
              clearError("agreement");
            }}
          >
            <View>
              <View
                style={[
                  styles.checkbox,
                  agreed && styles.checkboxActive,
                  errors.agreement &&
                    styles.checkboxError,
                ]}
              >
                {agreed && (
                  <Ionicons
                    name="checkmark"
                    size={15}
                    color={Colors.white}
                  />
                )}
              </View>
            </View>

            <Text style={styles.agreementText}>
              I certify that the information I provided is
              accurate. By clicking Continue, I agree to the{" "}
              <Text style={styles.link}>
                Terms of Service
              </Text>{" "}
              &{" "}
              <Text style={styles.link}>
                Privacy Policy
              </Text>
              .
            </Text>
          </Pressable>

          {errors.agreement && (
            <Text style={styles.errorText}>
              {errors.agreement}
            </Text>
          )}

          <PrimaryButton style={{ marginTop: 50}}
            title={
              loading
                ? "Creating Account..."
                : "Continue"
            }
            disabled={loading}
            onPress={handleRegister}
          />

          <AppFooter />

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>

      <DatePickerModal
        visible={showDatePicker}
        month={dateMonth}
        day={dateDay}
        year={dateYear}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(month, day, year) => {
          setDateMonth(month);
          setDateDay(day);
          setDateYear(year);
          setShowDatePicker(false);
          clearError("dateOfBirth");
        }}
      />

      <GenderPickerModal
        visible={showGenderPicker}
        value={gender}
        onClose={() => setShowGenderPicker(false)}
        onSelect={(value) => {
          setGender(value);
          setShowGenderPicker(false);
          clearError("gender");
        }}
      />

      <OtpVerificationModal
        visible={showOtpModal}
        email={email.trim().toLowerCase()}
        onClose={() => setShowOtpModal(false)}
        onVerified={handleVerifiedOtp}
      />
    </KeyboardAvoidingView>
  </SafeAreaView>
  );
}

type FormFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad";
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
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

  const currentYear = new Date().getFullYear();

  const years = Array.from(
    { length: 100 },
    (_, index) =>
      String(currentYear - index)
  );

  const [selectedMonth, setSelectedMonth] =
    useState(month || "01");

  const [selectedDay, setSelectedDay] =
    useState(day || "01");

  const [selectedYear, setSelectedYear] =
    useState(year || String(currentYear - 18));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
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
            <Text style={styles.modalCancelText}>
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
            onPress={() => onSelect(item)}
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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={onClose}
        />

        <View style={styles.genderCard}>
          <Text style={styles.pickerTitle}>
            Select Gender
          </Text>

          <Text style={styles.pickerSubtitle}>
            Choose the option that best describes you.
          </Text>

          {genders.map((item) => (
            <Pressable
              key={item}
              style={[
                styles.genderOption,
                item === value &&
                  styles.genderOptionActive,
              ]}
              onPress={() => onSelect(item)}
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

  keyboardContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
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

  agreement: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: Spacing.md,
    marginBottom: 0,
  },

  checkbox: {
    width: 21,
    height: 21,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#CFCFCF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
    marginTop: 1,
  },

  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  checkboxError: {
    borderColor: "#E53935",
  },

  agreementText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.secondary,
  },

  link: {
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
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
