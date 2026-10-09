import React, { createContext, useContext, useState } from "react";
import { AppToast } from "@/components/common/AppToast";
import { AppModal, ModalButton } from "@/components/common/AppModal";
import { createNotification } from "@/services/notificationService";
import { useNotificationCount } from "@/context/NotificationContext";

interface ModalConfig {
  visible: boolean;
  title: string;
  message?: string;
  type?: "info" | "success" | "warning" | "error" | "confirm";
  buttons?: ModalButton[];
}

interface ToastContextValue {
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showModal: (
    title: string,
    message?: string,
    buttons?: ModalButton[],
    type?: "info" | "success" | "warning" | "error" | "confirm"
  ) => void;
  hideModal: () => void;
}

const ToastContext = createContext<ToastContextValue>({
  showSuccess: () => {},
  showError: () => {},
  showInfo: () => {},
  showWarning: () => {},
  showModal: () => {},
  hideModal: () => {},
});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [type, setType] = useState<"success" | "error" | "info" | "warning">("info");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState<string | undefined>(undefined);
  const { refreshUnreadCount } = useNotificationCount();

  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    visible: false,
    title: "",
    message: "",
    type: "info",
    buttons: [{ text: "OK", style: "default" }],
  });

  const showToast = (
    toastType: "success" | "error" | "info" | "warning",
    toastTitle: string,
    toastMsg?: string
  ) => {
    setType(toastType);
    setTitle(toastTitle);
    setMessage(toastMsg);
    setVisible(true);

    // Persist as a notification so user can review it in Notifications screen
    createNotification({
      title: toastTitle,
      message: toastMsg || toastTitle,
      type: toastType,
    })
      .then(() => {
        refreshUnreadCount().catch(() => {});
      })
      .catch(() => {});
  };

  const showSuccess = (t: string, m?: string) => showToast("success", t, m);
  const showError = (t: string, m?: string) => showToast("error", t, m);
  const showInfo = (t: string, m?: string) => showToast("info", t, m);
  const showWarning = (t: string, m?: string) => showToast("warning", t, m);

  const showModal = (
    modalTitle: string,
    modalMsg?: string,
    buttons?: ModalButton[],
    modalType: "info" | "success" | "warning" | "error" | "confirm" = "info"
  ) => {
    setModalConfig({
      visible: true,
      title: modalTitle,
      message: modalMsg,
      type: modalType,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: "OK", style: "default" }],
    });
  };

  const hideModal = () => {
    setModalConfig((prev) => ({ ...prev, visible: false }));
  };

  return (
    <ToastContext.Provider
      value={{ showSuccess, showError, showInfo, showWarning, showModal, hideModal }}
    >
      {children}
      <AppToast
        visible={visible}
        type={type}
        title={title}
        message={message}
        onDismiss={() => setVisible(false)}
      />
      <AppModal
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        buttons={modalConfig.buttons}
        onClose={hideModal}
      />
    </ToastContext.Provider>
  );
};

export const useAppToast = () => useContext(ToastContext);

