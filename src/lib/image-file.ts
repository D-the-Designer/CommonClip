import { CommonsFile } from "@/types/commons";

export function cleanFilename(title: string): string {
  return title.replace(/^File:/, "").replace(/\.[^/.]+$/, "").replace(/_/g, " ");
}

export function getImageFilename(file: CommonsFile, mimeType?: string): string {
  const baseName =
    cleanFilename(file.title)
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 96) || "common-clip-image";

  const titleExtension = file.title.match(/\.([a-z0-9]{2,5})$/i)?.[1];
  const urlExtension = file.imageInfo.url.match(/\.([a-z0-9]{2,5})(?:$|[?#])/i)?.[1];
  const mimeExtension =
    mimeType === "image/png"
      ? "png"
      : mimeType === "image/webp"
        ? "webp"
        : mimeType === "image/gif"
          ? "gif"
          : mimeType === "image/svg+xml"
            ? "svg"
            : mimeType === "image/jpeg"
              ? "jpg"
              : undefined;
  const extension = (mimeExtension ?? urlExtension ?? titleExtension ?? "jpg").toLowerCase();

  return `${baseName}.${extension === "jpeg" ? "jpg" : extension}`;
}

export function getFireflyDownloadExtension(file: CommonsFile): "jpg" | "png" | "webp" {
  const extension = getImageFilename(file).split(".").pop()?.toLowerCase();
  if (extension === "png" || extension === "webp") return extension;
  if (extension === "jpg" || extension === "jpeg") return "jpg";
  return "png";
}

function getImageMimeType(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  if (extension === "svg") return "image/svg+xml";
  return "image/jpeg";
}

const FIREFLY_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Keep the object URL alive while the browser hands the download to the OS.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
}

async function makeFireflyCompatible(blob: Blob): Promise<{ blob: Blob; mimeType: string }> {
  const mimeType = blob.type.split(";")[0].toLowerCase();
  if (FIREFLY_IMAGE_TYPES.has(mimeType)) {
    return { blob, mimeType };
  }

  const sourceUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create an image conversion canvas");
    context.drawImage(image, 0, 0);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((converted) => {
        if (converted) resolve(converted);
        else reject(new Error("Could not convert image to PNG"));
      }, "image/png");
    });
    return { blob: pngBlob, mimeType: "image/png" };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export async function fetchImageFile(file: CommonsFile, size = 800): Promise<File> {
  const titleParam = encodeURIComponent(file.title);
  const apiUrl = `https://commons.wikimedia.org/w/api.php?origin=*&action=query&titles=${titleParam}&prop=imageinfo&iiprop=url&iilimit=1&iiurlwidth=${size}&format=json`;
  const response = await fetch(apiUrl);
  if (!response.ok) throw new Error(`Image metadata request failed with status ${response.status}`);

  const data = await response.json();
  const pages = data.query?.pages ?? {};
  const page = Object.values(pages)[0] as {
    imageinfo?: Array<{ thumburl?: string; url?: string }>;
  } | undefined;
  const imageUrl = page?.imageinfo?.[0]?.thumburl ?? page?.imageinfo?.[0]?.url ?? file.imageInfo.url;
  const imageResponse = await fetch(imageUrl, {
    mode: "cors",
    credentials: "omit",
    cache: "force-cache",
  });
  if (!imageResponse.ok) throw new Error(`Image request failed with status ${imageResponse.status}`);

  const compatible = await makeFireflyCompatible(await imageResponse.blob());
  return new File([compatible.blob], getImageFilename(file, compatible.mimeType), {
    type: compatible.mimeType,
  });
}

export async function downloadImageFile(file: CommonsFile, size = 800): Promise<void> {
  const preparedFile = await fetchImageFile(file, size);
  triggerBlobDownload(preparedFile, preparedFile.name);
}

export function downloadAttributionFile(file: CommonsFile, attribution: string): void {
  const imageFilename = getImageFilename(file);
  const baseName = imageFilename.replace(/\.[^/.]+$/, "");
  const blob = new Blob([`${attribution}\n`], { type: "text/plain;charset=utf-8" });
  triggerBlobDownload(blob, `${baseName}.txt`);
}
