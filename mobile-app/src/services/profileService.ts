import api from "@/services/api";

export const uploadProfilePhoto = async (imageUri: string): Promise<any> => {
  const filename = imageUri.split("/").pop() || "profile.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image/jpeg`;

  const formData = new FormData();
  formData.append("photo", {
    uri: imageUri,
    name: filename,
    type,
  } as any);

  const response = await api.post("/user/photo", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data.data;
};

const isLocalFileUri = (uri: string | null | undefined): boolean => {
  if (!uri) return false;
  return (
    uri.startsWith("file://") ||
    uri.startsWith("content://") ||
    uri.startsWith("ph://") ||
    uri.startsWith("blob:") ||
    uri.startsWith("/") ||
    uri.startsWith("data:")
  );
};

export const uploadDriversLicense = async (
  frontUri?: string | null,
  backUri?: string | null
): Promise<any> => {
  const formData = new FormData();

  if (frontUri && isLocalFileUri(frontUri)) {
    const cleanUri = frontUri.split("?")[0];
    const filename = cleanUri.split("/").pop() || "license_front.jpg";
    const ext = filename.split(".").pop()?.toLowerCase();
    const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    formData.append("front_image", {
      uri: frontUri,
      name: filename,
      type,
    } as any);
  }

  if (backUri && isLocalFileUri(backUri)) {
    const cleanUri = backUri.split("?")[0];
    const filename = cleanUri.split("/").pop() || "license_back.jpg";
    const ext = filename.split(".").pop()?.toLowerCase();
    const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    formData.append("back_image", {
      uri: backUri,
      name: filename,
      type,
    } as any);
  }

  const response = await api.post("/user/license", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data.data;
};

