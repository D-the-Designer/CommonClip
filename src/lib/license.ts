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

function escapeHtml(value: string): string {
  const escaped: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (character) => escaped[character] ?? character);
}

export function formatAttribution(file: CommonsFile, format: "plain" | "markdown" | "html"): string {
  const isPD = file.licenseShortName.toLowerCase() === "public domain" || file.licenseShortName.toLowerCase() === "cc0";
  const title = file.title.replace(/^File:/, "").replace(/\.[^/.]+$/, "").replace(/_/g, " ");
  const artist = file.artistText || "Unknown";
  const year = file.year || "Unknown";
  
  if (format === "plain") {
    if (isPD) {
      return `${title}${file.artistText || file.year ? ` by ${file.artistText || "Unknown"}${file.year ? ` (${file.year})` : ""}` : ""}. License: ${file.licenseShortName}. Source: Wikimedia Commons. ${file.commonsUrl}`;
    }
    return `"${title}" by ${artist} (${year}). License: ${file.licenseShortName}. Source: ${file.commonsUrl}`;
  }
  
  if (format === "markdown") {
    if (isPD) {
      return `[${title}](${file.commonsUrl})${file.artistText ? ` by ${file.artistText}` : ""}${file.year ? ` (${file.year})` : ""}. License: ${file.licenseShortName}.`;
    }
    return `"[${title}](${file.commonsUrl})" by ${artist} (${year}). License: ${file.licenseShortName}.`;
  }
  
  if (format === "html") {
    const linkedTitle = `<a href="${escapeHtml(file.commonsUrl)}">${escapeHtml(title)}</a>`;
    if (isPD) {
      const creator = file.artistText ? ` by ${escapeHtml(file.artistText)}` : "";
      const date = file.year ? ` (${escapeHtml(file.year)})` : "";
      return `<p>${linkedTitle}${creator}${date}. License: ${escapeHtml(file.licenseShortName)}.</p>`;
    }
    return `<p>“${linkedTitle}” by ${escapeHtml(artist)} (${escapeHtml(year)}). License: ${escapeHtml(file.licenseShortName)}.</p>`;
  }
  
  return "";
}
