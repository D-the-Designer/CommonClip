import { CommonsFile } from "@/types/commons";
import { cleanHtml, formatAttribution } from "@/lib/license";

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

function escapeXml(value: string): string {
  return value.replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;", "'": "&apos;" })[char]!);
}

function makeXmpPacket(file: CommonsFile): Uint8Array {
  const title = cleanFilename(file.title);
  const creator = cleanHtml(file.artistText || "Unknown");
  const license = file.licenseShortName || "Unknown license";
  const licenseUrl = file.imageInfo.extmetadata.LicenseUrl?.value || "";
  const credit = cleanHtml(file.imageInfo.extmetadata.Credit?.value || creator);
  const description = cleanHtml(file.imageInfo.extmetadata.ImageDescription?.value || "");
  const attribution = formatAttribution(file, "plain");
  const fullDescription = [attribution, description && `Description: ${description}`].filter(Boolean).join("\n\n");
  const packet = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>\n` +
    `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">` +
    `<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/" xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/">` +
    `<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(title)}</rdf:li></rdf:Alt></dc:title>` +
    `<dc:creator><rdf:Seq><rdf:li>${escapeXml(creator)}</rdf:li></rdf:Seq></dc:creator>` +
    `<dc:description><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(fullDescription)}</rdf:li></rdf:Alt></dc:description>` +
    `<dc:rights><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(license)}</rdf:li></rdf:Alt></dc:rights>` +
    `<dc:source>${escapeXml(file.commonsUrl)}</dc:source>` +
    `<photoshop:Credit>${escapeXml(credit)}</photoshop:Credit>` +
    `<photoshop:Source>${escapeXml(file.commonsUrl)}</photoshop:Source>` +
    `<xmpRights:WebStatement>${escapeXml(licenseUrl || file.commonsUrl)}</xmpRights:WebStatement>` +
    `<xmpRights:UsageTerms><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(license)}</rdf:li></rdf:Alt></xmpRights:UsageTerms>` +
    `</rdf:Description></rdf:RDF></x:xmpmeta>\n<?xpacket end="w"?>`;
  return new TextEncoder().encode(packet);
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function ascii(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return new TextDecoder().decode(bytes.subarray(offset, offset + length));
}

function embedJpegXmp(bytes: Uint8Array, xmp: Uint8Array): Uint8Array {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("Invalid JPEG image data");
  const identifier = ascii("http://ns.adobe.com/xap/1.0/\0");
  const payload = concatBytes(identifier, xmp);
  const segmentLength = payload.length + 2;
  if (segmentLength > 0xffff) throw new Error("Image attribution metadata is too large");
  const segment = new Uint8Array(payload.length + 4);
  segment.set([0xff, 0xe1, (segmentLength >> 8) & 0xff, segmentLength & 0xff]);
  segment.set(payload, 4);
  return concatBytes(bytes.subarray(0, 2), segment, bytes.subarray(2));
}

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = ascii(type);
  const chunk = new Uint8Array(data.length + 12);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length, false);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  view.setUint32(data.length + 8, crc32(chunk.subarray(4, data.length + 8)), false);
  return chunk;
}

function embedPngXmp(bytes: Uint8Array, xmp: Uint8Array): Uint8Array {
  if (!PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)) throw new Error("Invalid PNG image data");
  const keyword = ascii("XML:com.adobe.xmp");
  const data = concatBytes(keyword, new Uint8Array([0, 0, 0, 0]), keyword, new Uint8Array([0]), xmp);
  const chunks: Uint8Array[] = [PNG_SIGNATURE];
  let offset = 8;
  let inserted = false;
  while (offset + 12 <= bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, bytes.length - offset);
    const length = view.getUint32(0, false);
    const type = readAscii(bytes, offset + 4, 4);
    const next = offset + 12 + length;
    if (next > bytes.length) throw new Error("Invalid PNG chunk length");
    if (type === "iTXt" && readAscii(bytes, offset + 8, Math.min(17, length)) === "XML:com.adobe.xmp") {
      offset = next;
      continue;
    }
    if (type === "IEND" && !inserted) {
      chunks.push(pngChunk("iTXt", data));
      inserted = true;
    }
    chunks.push(bytes.subarray(offset, next));
    offset = next;
  }
  if (!inserted) throw new Error("PNG end marker was not found");
  return concatBytes(...chunks);
}

interface WebpChunk {
  type: string;
  data: Uint8Array;
}

function webpChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(8 + data.length + (data.length & 1));
  chunk.set(ascii(type), 0);
  new DataView(chunk.buffer).setUint32(4, data.length, true);
  chunk.set(data, 8);
  return chunk;
}

function embedWebpXmp(bytes: Uint8Array, xmp: Uint8Array): Uint8Array {
  if (readAscii(bytes, 0, 4) !== "RIFF" || readAscii(bytes, 8, 4) !== "WEBP") throw new Error("Invalid WebP image data");
  const chunks: WebpChunk[] = [];
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = readAscii(bytes, offset, 4);
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset + 4, 4).getUint32(0, true);
    const end = offset + 8 + length + (length & 1);
    if (end > bytes.length) throw new Error("Invalid WebP chunk length");
    if (type !== "XMP ") chunks.push({ type, data: bytes.subarray(offset + 8, offset + 8 + length) });
    offset = end;
  }

  const vp8x = chunks.find((chunk) => chunk.type === "VP8X");
  if (vp8x) {
    vp8x.data = vp8x.data.slice();
    vp8x.data[0] |= 0x04;
  } else {
    const imageChunk = chunks.find((chunk) => chunk.type === "VP8 " || chunk.type === "VP8L");
    if (!imageChunk) throw new Error("WebP image data chunk was not found");
    let width: number;
    let height: number;
    let alpha = chunks.some((chunk) => chunk.type === "ALPH");
    if (imageChunk.type === "VP8L") {
      const data = imageChunk.data;
      if (data[0] !== 0x2f || data.length < 5) throw new Error("Invalid lossless WebP header");
      width = 1 + data[1] + ((data[2] & 0x3f) << 8);
      height = 1 + ((data[2] >> 6) & 0x03) + (data[3] << 2) + ((data[4] & 0x0f) << 10);
      alpha ||= (data[4] & 0x10) !== 0;
    } else {
      const data = imageChunk.data;
      if (data.length < 10 || data[3] !== 0x9d || data[4] !== 0x01 || data[5] !== 0x2a) throw new Error("Invalid lossy WebP header");
      width = new DataView(data.buffer, data.byteOffset + 6, 2).getUint16(0, true) & 0x3fff;
      height = new DataView(data.buffer, data.byteOffset + 8, 2).getUint16(0, true) & 0x3fff;
    }
    if (width < 1 || height < 1 || width > 0x1000000 || height > 0x1000000) throw new Error("Invalid WebP dimensions");
    const extendedHeader = new Uint8Array(10);
    extendedHeader[0] = 0x04 | (alpha ? 0x10 : 0);
    extendedHeader[4] = (width - 1) & 0xff;
    extendedHeader[5] = ((width - 1) >> 8) & 0xff;
    extendedHeader[6] = ((width - 1) >> 16) & 0xff;
    extendedHeader[7] = (height - 1) & 0xff;
    extendedHeader[8] = ((height - 1) >> 8) & 0xff;
    extendedHeader[9] = ((height - 1) >> 16) & 0xff;
    chunks.unshift({ type: "VP8X", data: extendedHeader });
  }
  chunks.push({ type: "XMP ", data: xmp });
  const encodedChunks = chunks.map((chunk) => webpChunk(chunk.type, chunk.data));
  const body = concatBytes(ascii("WEBP"), ...encodedChunks);
  const header = new Uint8Array(8);
  header.set(ascii("RIFF"), 0);
  new DataView(header.buffer).setUint32(4, body.length, true);
  return concatBytes(header, body);
}

async function addAttributionMetadata(blob: Blob, mimeType: string, file: CommonsFile): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const xmp = makeXmpPacket(file);
  const embedded = mimeType === "image/jpeg"
    ? embedJpegXmp(bytes, xmp)
    : mimeType === "image/png"
      ? embedPngXmp(bytes, xmp)
      : mimeType === "image/webp"
        ? embedWebpXmp(bytes, xmp)
        : bytes;
  return new Blob([embedded], { type: mimeType });
}

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
  // The gallery already has the current file URLs from Commons. Re-querying by
  // title can fail for cached/renamed files and was blocking drag preparation.
  const thumbUrl = file.imageInfo.thumburl;
  const imageUrl = thumbUrl ?? file.imageInfo.url;
  let imageResponse = await fetch(imageUrl, {
    mode: "cors",
    credentials: "omit",
    cache: "force-cache",
  });
  if (!imageResponse.ok && thumbUrl && thumbUrl !== file.imageInfo.url) {
    imageResponse = await fetch(file.imageInfo.url, {
      mode: "cors",
      credentials: "omit",
      cache: "force-cache",
    });
  }
  if (!imageResponse.ok) throw new Error(`Image request failed with status ${imageResponse.status}`);

  const compatible = await makeFireflyCompatible(await imageResponse.blob());
  const attributed = await addAttributionMetadata(compatible.blob, compatible.mimeType, file);
  return new File([attributed], getImageFilename(file, compatible.mimeType), {
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
