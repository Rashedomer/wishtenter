import api from "@/lib/api";
import { processImage } from "@/utils/imageUpload";

/** Upload avatar saved during signup (data URL in sessionStorage). */
export async function uploadPendingAvatar(): Promise<string | null> {
  const dataUrl = sessionStorage.getItem("pendingAvatarDataUrl");
  if (!dataUrl) return null;

  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], "avatar.jpg", { type: blob.type || "image/jpeg" });
    const processed = await processImage(file);
    const form = new FormData();
    form.append("image", processed);
    const uploadRes = await api.post("/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const avatarUrl = uploadRes.data.imageUrl;
    await api.put("/creators/me", { avatarUrl });
    sessionStorage.removeItem("pendingAvatarDataUrl");
    return avatarUrl;
  } catch (err) {
    sessionStorage.removeItem("pendingAvatarDataUrl");
    throw err;
  }
}
