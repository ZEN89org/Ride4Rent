import api from "@/services/api";

import {
    OperatorRegistrationData,
    OperatorStatus,
} from "@/features/operator/types/operatorService";

export const registerOperator = async (
  data: OperatorRegistrationData
) => {
  const response = await api.post(
    "/operator/register",
    data
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
