import { router } from "expo-router";
import { useState } from "react";

import RenterRegistrationForm from "@/features/renter/components/registration/RenterRegistrationForm";
import RenterRegistrationIntro from "@/features/renter/components/registration/RenterRegistrationIntro";

export default function Register() {
  const [step, setStep] = useState(1);

  const handleCancel = () => {
    router.replace("/auth");
  };

  const handleSuccess = () => {
    router.replace("/login");
  };

  if (step === 1) {
    return (
      <RenterRegistrationIntro
        onContinue={() => setStep(2)}
        onBack={() => router.replace("/auth")}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <RenterRegistrationForm
      onBack={() => setStep(1)}
      onCancel={handleCancel}
      onSuccess={handleSuccess}
    />
  );
}
