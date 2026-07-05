// Client-side image compression: resize to max width, encode JPEG q≈0.82.
// Returns a new File (falls back to original if browser lacks canvas/toBlob).
export async function compressImage(file, { maxWidth = 1080, quality = 0.82 } = {}) {
  if (!file || !file.type?.startsWith("image/")) return file;
  // GIF: keep original to preserve animation
  if (file.type === "image/gif") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bitmap.width);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) return file;
    // Only replace if smaller
    if (blob.size >= file.size) return file;
    const name = (file.name || "photo").replace(/\.(png|webp|heic|heif|jpeg|jpg)$/i, ".jpg");
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch (_e) {
    return file;
  }
}
