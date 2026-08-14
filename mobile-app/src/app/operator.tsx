import { router } from "expo-router";
import { useState } from "react";

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
  const [step, setStep] = useState(1);

  const [ownerInfo, setOwnerInfo] =
    useState<OwnerInfoData | null>(null);

  const [businessInfo, setBusinessInfo] =
    useState<BusinessInfoData | null>(null);

  const [showSuccessSheet, setShowSuccessSheet] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const handleCancel = () => {
    router.replace("/auth");
  };

  const handleBack = () => {
    if (step === 1) {
      router.replace("/auth");
      return;
    }

    setStep((current) => current - 1);
  };

  const handleOwnerContinue = (
    data: OwnerInfoData
  ) => {
    setOwnerInfo(data);
    setStep(3);
  };

  const handleBusinessContinue = (
    data: BusinessInfoData
  ) => {
    setBusinessInfo(data);
    setStep(4);
  };

  const handleSubmit = async (
    verification: VerificationData
  ) => {
    if (!ownerInfo || !businessInfo) {
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const registrationData: OperatorRegisterData = {
        first_name: ownerInfo.firstName,
        middle_name:
          ownerInfo.middleName || undefined,
        last_name: ownerInfo.lastName,
        suffix: ownerInfo.suffix || undefined,

        date_of_birth: ownerInfo.dateOfBirth,
        sex: ownerInfo.gender,

        email: businessInfo.businessEmail,
        mobile_number:
          businessInfo.businessContactNumber,

        password: businessInfo.password,
        password_confirmation:
          businessInfo.confirmPassword,

        business_name: businessInfo.businessName,
        business_email: businessInfo.businessEmail,
        business_contact_number:
          businessInfo.businessContactNumber,

        street_address:
          businessInfo.streetAddress,

        barangay:
          businessInfo.barangay,

        municipality:
          businessInfo.municipality,

        government_id_front:
          verification.governmentIdFront,

        government_id_back:
          verification.governmentIdBack,

        business_permit_front:
          verification.businessPermitFront,

        business_permit_back:
          verification.businessPermitBack,

        dti_sec_registration:
          undefined,

        accepted_payment_methods: [],

        account_name: "",
        account_number: "",

        qr_code: undefined,
      };

      await registerOperator(registrationData);

      setShowSuccessSheet(true);
    } catch (error: any) {
      console.log(
        "Operator registration error:",
        error?.response?.data || error
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    setShowSuccessSheet(false);
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
      onContinue={handleOwnerContinue}
      onBack={handleBack}
      onCancel={handleCancel}
    />
    );
  }

  if (step === 3) {
    return (
    <OperatorBusinessInfo
      initialData={businessInfo}
      onContinue={handleBusinessContinue}
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
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      <OperatorApplicationSubmitted
        visible={showSuccessSheet}
        onBackToLogin={handleBackToLogin}
      />
    </>
  );
}
