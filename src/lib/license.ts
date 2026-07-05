import { CommonsFile } from "../types/commons";

const ALLOWED_LICENSES = new Set([
  "public domain",
  "cc0",
  "cc by 1.0",
  "cc by 2.0",
  "cc by 2.5",
  "cc by 3.0",
  "cc by 4.0",
  "cc by-sa 1.0",
  "cc by-sa 2.0",
  "cc by-sa 2.5",
  "cc by-sa 3.0",
  "cc by-sa 4.0",
]);

export function isAllowedLicense(shortName: string): boolean {
  if (!shortName) return false;
  return ALLOWED_LICENSES.has(shortName.toLowerCase());
}

export function cleanHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

export function formatAttribution(file: CommonsFile, format: "plain" | "markdown" | "html"): string {
  const isPD = file.licenseShortName.toLowerCase() === "public domain" || file.licenseShortName.toLowerCase() === "cc0";
  const title = file.title.replace(/^File:/, "").replace(/\.[^/.]+$/, "").replace(/_/g, " ");
  
  if (format === "plain") {
    if (isPD) {
      return `${title}. Source: Wikimedia Commons. ${file.commonsUrl}`;
    }
    return `"${title}" by ${file.artistText || "Unknown"} (${file.year || "Unknown"}). License: ${file.licenseShortName}. Source: ${file.commonsUrl}`;
  }
  
  if (format === "markdown") {
    if (isPD) {
      return `[${title}](${file.commonsUrl}). Source: Wikimedia Commons.`;
    }
    return `"[${title}](${file.commonsUrl})" by ${file.artistText || "Unknown"} (${file.year || "Unknown"}). License: ${file.licenseShortName}.`;
  }
  
  if (format === "html") {
    if (isPD) {
      return `<a href="${file.commonsUrl}">${title}</a>. Source: Wikimedia Commons.`;
    }
    return `"<a href="${file.commonsUrl}">${title}</a>" by ${file.artistText || "Unknown"} (${file.year || "Unknown"}). License: ${file.licenseShortName}.`;
  }
  
  return "";
}
