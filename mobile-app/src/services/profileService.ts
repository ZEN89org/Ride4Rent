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

export const uploadDriversLicense = async (
  frontUri?: string | null,
  backUri?: string | null
): Promise<any> => {
  const formData = new FormData();

  if (frontUri) {
    const filename = frontUri.split("/").pop() || "license_front.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;
    formData.append("front_image", {
      uri: frontUri,
      name: filename,
      type,
    } as any);
  }

  if (backUri) {
    const filename = backUri.split("/").pop() || "license_back.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;
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
