const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export async function compressImageFile(
  file: File,
  maxBytes = 450_000,
): Promise<{ dataUrl: string; mimeType: string; name: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Formato no soportado. Usa PNG, JPG, WEBP o SVG.");
  }

  if (file.type === "image/svg+xml") {
    const dataUrl = await readFileAsDataUrl(file);
    if (dataUrl.length > maxBytes) {
      throw new Error("El SVG es demasiado pesado. Máximo ~450 KB.");
    }
    return { dataUrl, mimeType: file.type, name: stripExtension(file.name) };
  }

  const bitmap = await createImageBitmap(file);
  const maxSide = 1200;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("No se pudo procesar la imagen.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.92;
  let dataUrl = canvas.toDataURL("image/webp", quality);

  while (dataUrl.length > maxBytes && quality > 0.4) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/webp", quality);
  }

  if (dataUrl.length > maxBytes) {
    throw new Error("La imagen sigue siendo muy pesada. Prueba un archivo más pequeño.");
  }

  return {
    dataUrl,
    mimeType: "image/webp",
    name: stripExtension(file.name),
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}
