import api from "@/services/api";

import {
  OperatorRegisterData,
  OperatorStatus,
} from "@/features/operator/types/operatorService";

export const registerOperator = async (
  data: OperatorRegisterData
) => {
  const formData = new FormData();

  formData.append("first_name", data.first_name);
  formData.append("middle_name", data.middle_name ?? "");
  formData.append("last_name", data.last_name);
  formData.append("suffix", data.suffix ?? "");
  formData.append("date_of_birth", data.date_of_birth);
  formData.append("sex", data.sex);
  formData.append("email", data.email);
  formData.append("mobile_number", data.mobile_number);
  formData.append("password", data.password);
  formData.append(
    "password_confirmation",
    data.password_confirmation
  );
  if (data.otp) {
    formData.append("otp", data.otp);
  }

  formData.append("business_name", data.business_name);
  formData.append("business_email", data.business_email);
  formData.append(
    "business_contact_number",
    data.business_contact_number
  );
  formData.append("street_address", data.street_address);
  formData.append("barangay", data.barangay);
  formData.append("municipality", data.municipality);

  if (data.government_id_front) {
    formData.append(
      "government_id_front",
      {
        uri: data.government_id_front,
        name: "government_id_front.jpg",
        type: "image/jpeg",
      } as any
    );
  }

  if (data.government_id_back) {
    formData.append(
      "government_id_back",
      {
        uri: data.government_id_back,
        name: "government_id_back.jpg",
        type: "image/jpeg",
      } as any
    );
  }

  if (data.business_permit_front) {
    formData.append(
      "business_permit_front",
      {
        uri: data.business_permit_front,
        name: "business_permit_front.jpg",
        type: "image/jpeg",
      } as any
    );
  }

  if (data.business_permit_back) {
    formData.append(
      "business_permit_back",
      {
        uri: data.business_permit_back,
        name: "business_permit_back.jpg",
        type: "image/jpeg",
      } as any
    );
  }

  if (data.dti_sec_registration) {
    formData.append(
      "dti_sec_registration",
      data.dti_sec_registration
    );
  }

  formData.append(
    "accepted_payment_methods",
    JSON.stringify(data.accepted_payment_methods)
  );

  if (data.account_name) {
    formData.append("account_name", data.account_name);
  }

  if (data.account_number) {
    formData.append(
      "account_number",
      data.account_number
    );
  }

  if (data.qr_code) {
    formData.append("qr_code", data.qr_code);
  }

  const response = await api.post(
    "/operator/register",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

export const getOperatorStatus =
  async (): Promise<OperatorStatus> => {
    const response = await api.get(
      "/operator/status"
    );

    return response.data.data;
  };
