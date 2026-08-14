import api from "../../../services/api";

export interface RegisterData {
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  date_of_birth: string;
  sex: string;
  email: string;
  mobile_number: string;
  password: string;
  password_confirmation: string;
}

export interface OperatorRegisterData {
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  date_of_birth: string;
  sex: string;

  email: string;
  mobile_number: string;

  business_name: string;
  business_email: string;
  business_contact_number: string;
  street_address: string;
  barangay: string;
  municipality: string;

  government_id?: string;
  business_permit?: string;
  dti_sec_registration?: string;

  accepted_payment_methods: string[];
  account_name?: string;
  account_number?: string;
  qr_code?: string;

  password: string;
  password_confirmation: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export const register = async (
  data: RegisterData
) => {
  const response = await api.post(
    "/register",
    data
  );

  return response.data;
};

export const registerOperator = async (
  data: OperatorRegisterData
) => {
  const response = await api.post(
    "/operator/register",
    data
  );

  return response.data;
};

export const login = async (
  data: LoginData
) => {
  const response = await api.post(
    "/login",
    data
  );

  return response.data;
};

export const logout = async () => {
  const response = await api.post(
    "/logout"
  );

  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get(
    "/user"
  );

  return response.data;
};
