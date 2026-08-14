import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import PrimaryButton from "@/components/common/PrimaryButton";
import { Colors } from "@/constants/colors";
import {
    FontFamily,
    FontSize,
    Radius,
    Spacing,
} from "@/constants/theme";
import RegistrationHeader from "./RegistrationHeader";

type OperatorBusinessVerificationProps = {
  onBack: () => void;
  onCancel: () => void;
  onSubmit: (data: VerificationData) => void;
  isSubmitting?: boolean;
};

export type VerificationData = {
  governmentIdFront: string;
  governmentIdBack: string;
  businessPermitFront: string;
  businessPermitBack: string;
};

type DocumentType =
  | "governmentIdFront"
  | "governmentIdBack"
  | "businessPermitFront"
  | "businessPermitBack";

type Documents = Record<DocumentType, string>;

export default function OperatorBusinessVerification({
  onBack,
  onCancel,
  onSubmit,
  isSubmitting = false,
}: OperatorBusinessVerificationProps) {
  const [documents, setDocuments] =
    useState<Documents>({
      governmentIdFront: "",
      governmentIdBack: "",
      businessPermitFront: "",
      businessPermitBack: "",
    });

  const [agreed, setAgreed] = useState(false);

  const [errors, setErrors] = useState<{
    governmentId?: string;
    businessPermit?: string;
    agreement?: string;
  }>({});

  const pickDocument = async (
    type: DocumentType
  ) => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow photo library access to upload your documents."
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

    if (result.canceled) {
      return;
    }

    const uri = result.assets[0]?.uri;

    if (!uri) {
      return;
    }

    setDocuments((current) => ({
      ...current,
      [type]: uri,
    }));

    if (
      type === "governmentIdFront" ||
      type === "governmentIdBack"
    ) {
      setErrors((current) => ({
        ...current,
        governmentId: undefined,
      }));
    }

    if (
      type === "businessPermitFront" ||
      type === "businessPermitBack"
    ) {
      setErrors((current) => ({
        ...current,
        businessPermit: undefined,
      }));
    }
  };

  const removeDocument = (
    type: DocumentType
  ) => {
    setDocuments((current) => ({
      ...current,
      [type]: "",
    }));
  };

    const handleSubmit = () => {
    const validationErrors: typeof errors = {};

    if (
        !documents.governmentIdFront ||
        !documents.governmentIdBack
    ) {
        validationErrors.governmentId =
        "Please upload both sides of your government-issued ID.";
    }

    if (
        !documents.businessPermitFront ||
        !documents.businessPermitBack
    ) {
        validationErrors.businessPermit =
        "Please upload both sides of your business permit.";
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

    onSubmit({
        governmentIdFront:
        documents.governmentIdFront,

        governmentIdBack:
        documents.governmentIdBack,

        businessPermitFront:
        documents.businessPermitFront,

        businessPermitBack:
        documents.businessPermitBack,
    });
    };

  return (
    <View style={styles.container}>
      <RegistrationHeader
        currentStep={4}
        totalSteps={4}
        onBack={onBack}
        onCancel={onCancel}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
          Verify Your Business
        </Text>

        <Text style={styles.subtitle}>
          Verify your account before you start listing
          vehicles.
        </Text>

        <DocumentSection
          title="Owner's Government-Issued ID"
          front={documents.governmentIdFront}
          back={documents.governmentIdBack}
          onFrontPress={() =>
            pickDocument("governmentIdFront")
          }
          onBackPress={() =>
            pickDocument("governmentIdBack")
          }
          onRemoveFront={() =>
            removeDocument("governmentIdFront")
          }
          onRemoveBack={() =>
            removeDocument("governmentIdBack")
          }
          error={errors.governmentId}
        />

        <DocumentSection
          title="Business Permit"
          front={documents.businessPermitFront}
          back={documents.businessPermitBack}
          onFrontPress={() =>
            pickDocument("businessPermitFront")
          }
          onBackPress={() =>
            pickDocument("businessPermitBack")
          }
          onRemoveFront={() =>
            removeDocument("businessPermitFront")
          }
          onRemoveBack={() =>
            removeDocument("businessPermitBack")
          }
          error={errors.businessPermit}
        />

        <Pressable
          style={styles.agreement}
          onPress={() => {
            setAgreed(!agreed);

            setErrors((current) => ({
              ...current,
              agreement: undefined,
            }));
          }}
        >
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

        <PrimaryButton
        style={styles.continueButton}
        title={
            isSubmitting
            ? "Submitting..."
            : "Continue"
        }
        onPress={handleSubmit}
        disabled={isSubmitting}
        />

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

type DocumentSectionProps = {
  title: string;
  front: string;
  back: string;
  onFrontPress: () => void;
  onBackPress: () => void;
  onRemoveFront: () => void;
  onRemoveBack: () => void;
  error?: string;
};

function DocumentSection({
  title,
  front,
  back,
  onFrontPress,
  onBackPress,
  onRemoveFront,
  onRemoveBack,
  error,
}: DocumentSectionProps) {
  return (
    <View style={styles.documentSection}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      <View style={styles.documentRow}>
        <DocumentUpload
          label="Front"
          uri={front}
          onPress={onFrontPress}
          onRemove={onRemoveFront}
        />

        <DocumentUpload
          label="Back"
          uri={back}
          onPress={onBackPress}
          onRemove={onRemoveBack}
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

type DocumentUploadProps = {
  label: string;
  uri: string;
  onPress: () => void;
  onRemove: () => void;
};

function DocumentUpload({
  label,
  uri,
  onPress,
  onRemove,
}: DocumentUploadProps) {
  if (uri) {
    return (
      <View style={styles.uploadContainer}>
        <Text style={styles.uploadLabel}>
          {label}
        </Text>

        <View style={styles.imageContainer}>
          <Image
            source={{ uri }}
            style={styles.documentImage}
            resizeMode="cover"
          />

          <Pressable
            style={styles.removeButton}
            onPress={onRemove}
            hitSlop={8}
          >
            <Ionicons
              name="close"
              size={18}
              color={Colors.white}
            />
          </Pressable>

          <Pressable
            style={styles.changeButton}
            onPress={onPress}
          >
            <Text style={styles.changeText}>
              Change
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.uploadContainer}>
      <Text style={styles.uploadLabel}>
        {label}
      </Text>

      <Pressable
        style={styles.uploadPlaceholder}
        onPress={onPress}
      >
        <View style={styles.uploadIcon}>
          <Ionicons
            name="cloud-upload-outline"
            size={28}
            color={Colors.primary}
          />
        </View>

        <Text style={styles.uploadTitle}>
          Upload
        </Text>

        <Text style={styles.uploadDescription}>
          Add image
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
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
    marginBottom: Spacing.xl,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.secondary,
  },

  documentSection: {
    marginBottom: Spacing.xl,
  },

  sectionTitle: {
    marginBottom: Spacing.sm,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.dark,
  },

  documentRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },

  uploadContainer: {
    flex: 1,
  },

  uploadLabel: {
    marginBottom: 5,
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.secondary,
  },

  uploadPlaceholder: {
    minHeight: 150,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D5D5D5",
    borderRadius: Radius.md,
    backgroundColor: "#FAFAFA",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },

  uploadIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF4E8",
    marginBottom: Spacing.sm,
  },

  uploadTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.dark,
  },

  uploadDescription: {
    marginTop: 2,
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
  },

  imageContainer: {
    height: 150,
    borderRadius: Radius.md,
    overflow: "hidden",
    backgroundColor: "#F7F7F7",
    position: "relative",
  },

  documentImage: {
    width: "100%",
    height: "100%",
  },

  removeButton: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
  },

  changeButton: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    height: 34,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
  },

  changeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.white,
  },

  agreement: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: Spacing.sm,
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

  errorText: {
    marginTop: 5,
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
});
