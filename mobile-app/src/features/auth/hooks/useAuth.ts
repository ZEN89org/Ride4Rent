import { useContext } from "react";

import { AuthContext } from "@/features/auth/context/AuthContext";

export function useAuth() {

  return useContext(AuthContext);

}
