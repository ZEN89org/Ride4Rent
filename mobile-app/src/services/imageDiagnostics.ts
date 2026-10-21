import { Image as ExpoImage } from "expo-image";
import { Image as NativeImage, Platform } from "react-native";
import api, { API_BASE_URL, API_ORIGIN, resolveImageUrl } from "./api";

async function timed<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Timed out after 15 seconds")), 15000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// Explicitly user-triggered. No account tokens, private documents or chat contents
// are included in the report. Only public fleet images are tested.
export async function checkImageLoading(): Promise<string> {
  const lines = [`Platform: ${Platform.OS}`, `API: ${API_BASE_URL}`];
  let imageUrl = `${API_ORIGIN}/storage/vehicles/NgjBfESpFvEKvQKd1urqnE5ODqSp2z23OXow93oA.jpg`;
  try {
    const response = await api.get("/vehicles");
    const body = response.data;
    const vehicles = Array.isArray(body) ? body : body?.data?.data ?? body?.data;
    const firstImage = Array.isArray(vehicles)
      ? vehicles.find((vehicle) => vehicle.image_url)?.image_url
      : null;
    if (firstImage) imageUrl = resolveImageUrl(firstImage) || imageUrl;
    lines.push(`Vehicle API: HTTP ${response.status}`);
  } catch (error) {
    lines.push(`Vehicle API failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
  // Exclude query strings from the report; bypass old cached responses for the test.
  lines.push(`Public image: ${imageUrl.split("?")[0]}`);
  const testUrl = `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}image_check=${Date.now()}`;
  const checks: [string, () => Promise<string>][] = [
    ["Image request", async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(testUrl, { signal: controller.signal });
        return `HTTP ${response.status}, ${response.headers.get("content-type") || "no content type"}`;
      } finally { clearTimeout(timer); }
    }],
    ["Expo image loader", async () => {
      const loaded = await timed(ExpoImage.prefetch(testUrl, { cachePolicy: "memory" }));
      return loaded ? "Loaded" : "Failed to load";
    }],
    ["Android / React Native image loader", async () => {
      const size = await timed(new Promise<{ width: number; height: number }>((resolve, reject) => {
        NativeImage.getSize(testUrl, (width, height) => resolve({ width, height }), reject);
      }));
      return `Loaded ${size.width} x ${size.height}`;
    }],
  ];
  const results = await Promise.all(checks.map(async ([label, run]) => {
    try { return `${label}: ${await run()}`; }
    catch (error) { return `${label}: ${error instanceof Error ? error.message : String(error)}`; }
  }));
  return [...lines, ...results].join("\n\n");
}
