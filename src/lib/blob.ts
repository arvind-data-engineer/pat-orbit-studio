import { put } from "@vercel/blob";

/**
 * Upload a Buffer to Vercel Blob storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadToBlob(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const blob = await put(filename, buffer, {
    contentType,
    access: "public",
  });
  return blob.url;
}

/**
 * Download a file from a URL and return it as a Buffer.
 * Handles both regular HTTP URLs and data: URIs.
 */
export async function downloadAsBuffer(urlOrDataUri: string): Promise<Buffer> {
  /* If it's a data URI, decode directly */
  if (urlOrDataUri.startsWith("data:")) {
    const commaIdx = urlOrDataUri.indexOf(",");
    if (commaIdx === -1) throw new Error("Malformed data URI");
    return Buffer.from(urlOrDataUri.substring(commaIdx + 1), "base64");
  }

  /* Otherwise fetch from URL */
  const response = await fetch(urlOrDataUri);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
