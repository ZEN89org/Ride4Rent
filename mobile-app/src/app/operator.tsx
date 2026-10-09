import { router } from "expo-router";
import { useState } from "react";

import { useAppToast } from "@/context/ToastContext";
import OtpVerificationModal from "@/features/auth/components/OtpVerificationModal";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { sendVerificationOtp } from "@/features/auth/services/authService";
import OperatorApplicationSubmitted from "@/features/operator/components/registration/OperatorApplicationSubmitted";
import OperatorBusinessInfo, {
  BusinessInfoData,
} from "@/features/operator/components/registration/OperatorBusinessInfo";
import OperatorBusinessVerification, {
  VerificationData,
} from "@/features/operator/components/registration/OperatorBusinessVerification";
import OperatorOwnerInfo, {
  OwnerInfoData,
} from "@/features/operator/components/registration/OperatorOwnerInfo";
import OperatorRegistrationIntro from "@/features/operator/components/registration/OperatorRegistrationIntro";
import {
  OperatorRegisterData,
} from "@/features/operator/types/operatorService";

import {
  registerOperator,
} from "@/features/operator/services/operatorService";

export default function OperatorRegistration() {
  const { showModal } = useAppToast();
  const { login, logout } = useAuth();
  const [step, setStep] = useState(1);

  const [ownerInfo, setOwnerInfo] =
    useState<OwnerInfoData | null>(null);

  const [businessInfo, setBusinessInfo] =
    useState<BusinessInfoData | null>(null);

  const [pendingVerificationData, setPendingVerificationData] =
    useState<VerificationData | null>(null);

  const [showOtpModal, setShowOtpModal] = useState(false);

  const [showSuccessSheet, setShowSuccessSheet] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const handleCancel = () => {
    router.replace("/login");
  };

  const handleOwnerInfoSubmit = (
    data: OwnerInfoData
  ) => {
    setOwnerInfo(data);
    setStep(3);
  };

  const handleBusinessInfoSubmit = (
    data: BusinessInfoData
  ) => {
    setBusinessInfo(data);
    setStep(4);
  };

  const handleVerificationSubmit = async (
    data: VerificationData
  ) => {
    setPendingVerificationData(data);
    if (!businessInfo?.businessEmail) {
      showModal("Email Required", "Please provide a valid business email.", [{ text: "OK" }], "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      await sendVerificationOtp(businessInfo.businessEmail.trim().toLowerCase());
      setShowOtpModal(true);
    } catch (error: any) {
      console.log("Operator OTP send error:", error.message, error.response?.data);
      const backendErrors = error.response?.data?.errors;
      if (backendErrors?.email) {
        showModal("Notice", backendErrors.email[0], [{ text: "OK" }], "error");
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
      setIsSubmitting(false);
    }
  };

  const handleVerifiedOtp = async (otpCode: string) => {
    if (!ownerInfo || !businessInfo || !pendingVerificationData) {
      return;
    }

    setShowOtpModal(false);
    setIsSubmitting(true);

    try {
      const registrationData: OperatorRegisterData = {
        first_name: ownerInfo.firstName,
        middle_name: ownerInfo.middleName || undefined,
        last_name: ownerInfo.lastName,
        suffix: ownerInfo.suffix || undefined,
        date_of_birth: ownerInfo.dateOfBirth,
        sex: ownerInfo.gender,
        business_name: businessInfo.businessName,
        street_address: businessInfo.streetAddress,
        barangay: businessInfo.barangay,
        municipality: businessInfo.municipality,
        business_contact_number: businessInfo.businessContactNumber,
        business_email: businessInfo.businessEmail.trim().toLowerCase(),
        email: businessInfo.businessEmail.trim().toLowerCase(),
        mobile_number: businessInfo.businessContactNumber,
        password: businessInfo.password,
        password_confirmation: businessInfo.confirmPassword,
        business_permit_front: pendingVerificationData.businessPermitFront,
        business_permit_back: pendingVerificationData.businessPermitBack,
        government_id_front: pendingVerificationData.governmentIdFront,
        government_id_back: pendingVerificationData.governmentIdBack,
        accepted_payment_methods: [],
        otp: otpCode,
      };

      const response = await registerOperator(registrationData);

      // Auto-authenticate so the operator can preview their dashboard right away
      if (response?.user && response?.token) {
        await login(response.user, response.token);
      }

      setShowSuccessSheet(true);
    } catch (error: any) {
      console.log(
        "Operator registration error:",
        error?.response?.data || error
      );
      const backendErrors = error?.response?.data?.errors;
      if (backendErrors) {
        const errorMessages = Object.values(backendErrors).flat().join("\n");
        showModal("Registration Failed", errorMessages, [{ text: "OK" }], "error");
      } else if (error?.response?.data?.message) {
        showModal("Registration Failed", error.response.data.message, [{ text: "OK" }], "error");
      } else {
        showModal("Registration Failed", "An error occurred while submitting your registration.", [{ text: "OK" }], "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExploreDashboard = () => {
    setShowSuccessSheet(false);
    router.replace("/operator-home");
  };

  const handleBackToLogin = async () => {
    setShowSuccessSheet(false);
    await logout();
    router.replace("/login");
  };

  if (step === 1) {
    return (
      <OperatorRegistrationIntro
        onContinue={() => setStep(2)}
        onBack={handleBack}
        onCancel={handleCancel}
      />
    );
  }

  if (step === 2) {
    return (
      <OperatorOwnerInfo
        initialData={ownerInfo}
        onContinue={handleOwnerInfoSubmit}
        onBack={handleBack}
        onCancel={handleCancel}
      />
    );
  }

  if (step === 3) {
    return (
      <OperatorBusinessInfo
        initialData={businessInfo}
        onContinue={handleBusinessInfoSubmit}
        onBack={handleBack}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <>
      <OperatorBusinessVerification
        onBack={handleBack}
        onCancel={handleCancel}
        onSubmit={handleVerificationSubmit}
        isSubmitting={isSubmitting}
      />

      <OtpVerificationModal
        visible={showOtpModal}
        email={businessInfo?.businessEmail || ""}
        onClose={() => setShowOtpModal(false)}
        onVerified={handleVerifiedOtp}
      />

      <OperatorApplicationSubmitted
        visible={showSuccessSheet}
        onExploreDashboard={handleExploreDashboard}
        onBackToLogin={handleBackToLogin}
      />
    </>
  );
}
