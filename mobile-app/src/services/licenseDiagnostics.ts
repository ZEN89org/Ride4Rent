// Inspect response metadata only. Never log license paths, signed URLs, tokens,
// response bodies or document contents.
export async function diagnoseLicensePhoto(side: "front" | "back", uri: string) {
  if (!/^https?:\/\//i.test(uri)) {
    console.warn("License photo diagnostic", { side, source: "device", result: "Local photo could not be decoded" });
    return;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const url = new URL(uri);
    const expires = Number(url.searchParams.get("expires"));
    const response = await fetch(uri, { method: "HEAD", signal: controller.signal });
    console.warn("License photo diagnostic", {
      side,
      route: url.pathname.startsWith("/documents/") ? "private document" : "other image route",
      signed: url.searchParams.has("signature"),
      expired: expires > 0 ? expires * 1000 <= Date.now() : null,
      status: response.status,
      contentType: response.headers.get("content-type") || "unknown",
      result: response.status === 403 ? "Access or signature rejected"
        : response.status === 404 ? "Document not found"
          : response.ok ? "Server reachable; check image format or image-loader failure"
            : "Server request failed",
    });
  } catch {
    console.warn("License photo diagnostic", { side, result: "Network request failed or timed out" });
  } finally {
    clearTimeout(timer);
  }
}
