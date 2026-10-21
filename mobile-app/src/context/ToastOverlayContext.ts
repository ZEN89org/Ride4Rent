import { createContext } from "react";
import type { ToastProps } from "@/components/common/AppToast";

export const ToastOverlayContext = createContext<ToastProps | null>(null);
