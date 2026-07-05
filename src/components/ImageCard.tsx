import { useState, useCallback } from "react";
import { ImageOff } from "lucide-react";
import { CommonsFile } from "@/types/commons";
import { formatAttribution } from "@/lib/license";
import { useBasket } from "@/hooks/useBasket";
import { useAttributionFormat } from "@/contexts/AttributionContext";

const API_BASE = "https://commons.wikimedia.org/w/api.php";

const SIZE_OPTIONS = [
  { label: "Thumb", value: 320 },
  { label: "Small", value: 640 },
  { label: "Medium", value: 800 },
  { label: "Large", value: 1200 },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  jellyfish:    { bg: "rgba(59,130,246,0.18)",  text: "#93c5fd" },
  cephalopods:  { bg: "rgba(139,92,246,0.18)",  text: "#c4b5fd" },
  coral:        { bg: "rgba(236,72,153,0.18)",  text: "#f9a8d4" },
  crustaceans:  { bg: "rgba(249,115,22,0.18)",  text: "#fdba74" },
  fish:         { bg: "rgba(20,184,166,0.18)",  text: "#5eead4" },
};

const CATEGORY_LABELS: Record<string, string> = {
  jellyfish:   "Jellyfish & Cnidarians",
  cephalopods: "Cephalopods & Molluscs",
  coral:       "Coral & Sponges",
  crustaceans: "Crustaceans & Echinoderms",
  fish:        "Fish & Sea Monsters",
};

export function cleanFilename(title: string): string {
  return title.replace(/^File:/, "").replace(/\.[^/.]+$/, "").replace(/_/g, " ");
}

interface ImageCardProps {
  file: CommonsFile;
}

export function ImageCard({ file }: ImageCardProps) {
  const [imgError, setImgError]       = useState(false);
  const [copied, setCopied]           = useState(false);
  const [selectedSize, setSelectedSize] = useState(800);
  const [isDownloading, setIsDownloading] = useState(false);

  const { format }                             = useAttributionFormat();
  const { addToBasket, removeFromBasket, isInBasket } = useBasket();

  const inBasket   = isInBasket(file.pageId);
  const catColor   = CATEGORY_COLORS[file.categoryId] ?? { bg: "rgba(255,255,255,0.08)", text: "#ccc" };
  const catLabel   = CATEGORY_LABELS[file.categoryId] ?? file.categoryId;
  const displayName = cleanFilename(file.title);

  const handleCopyAttribution = useCallback(async () => {
    const text = formatAttribution(file, format);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [file, format]);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      const titleParam = encodeURIComponent(file.title);
      const apiUrl = `${API_BASE}?origin=*&action=query&titles=${titleParam}&prop=imageinfo&iiprop=url&iiurlwidth=${selectedSize}&format=json`;
      const res  = await fetch(apiUrl);
      const data = await res.json();
      const pages = data.query?.pages ?? {};
      const page  = Object.values(pages)[0] as any;
      const downloadUrl =
        page?.imageinfo?.[0]?.thumburl ??
        page?.imageinfo?.[0]?.url ??
        file.imageInfo.url;

      const imgRes = await fetch(downloadUrl);
      const blob   = await imgRes.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href     = objUrl;
      a.download = displayName.replace(/\s+/g, "_") + ".jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch (err) {
      console.error("Download failed", err);
    } finally {
      setIsDownloading(false);
    }
  }, [file, selectedSize, displayName]);

  const handleBasketToggle = useCallback(() => {
    if (inBasket) removeFromBasket(file.pageId);
    else addToBasket(file);
  }, [inBasket, file, addToBasket, removeFromBasket]);

  if (imgError) {
    return (
      <div
        data-testid={`card-broken-${file.pageId}`}
        className="break-inside-avoid mb-4 rounded-xl overflow-hidden border"
        style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}
      >
        <div className="flex flex-col items-center justify-center p-8 gap-3 text-center" style={{ minHeight: 180 }}>
          <ImageOff size={28} style={{ color: "hsl(var(--muted-foreground))" }} />
          <p className="text-xs font-medium leading-snug" style={{ color: "hsl(var(--muted-foreground))" }}>
            {displayName}
          </p>
          <a
            href={file.commonsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline underline-offset-2"
            style={{ color: "hsl(var(--primary))" }}
            data-testid={`link-broken-source-${file.pageId}`}
          >
            Report broken source
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid={`card-image-${file.pageId}`}
      className="break-inside-avoid mb-4 rounded-xl overflow-hidden border transition-shadow hover:shadow-xl"
      style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--card-border))" }}
    >
      {/* Thumbnail */}
      <div className="relative bg-black" style={{ minHeight: 140 }}>
        <img
          src={file.imageInfo.thumburl ?? file.imageInfo.url}
          alt={displayName}
          className="w-full object-cover block"
          onError={() => setImgError(true)}
          data-testid={`img-thumbnail-${file.pageId}`}
          loading="lazy"
        />
        {/* Category chip */}
        <span
          className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-widest"
          style={{ background: catColor.bg, color: catColor.text, backdropFilter: "blur(6px)" }}
          data-testid={`chip-category-${file.pageId}`}
        >
          {catLabel}
        </span>
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-2.5">
        {/* Title */}
        <h3
          className="text-sm font-semibold leading-snug line-clamp-2"
          style={{ fontFamily: "var(--app-font-serif)", color: "hsl(var(--foreground))" }}
          data-testid={`text-title-${file.pageId}`}
        >
          {displayName}
        </h3>

        {/* Artist + year */}
        {(file.artistText || file.year) && (
          <p
            className="text-[11px] leading-snug line-clamp-1"
            style={{ color: "hsl(var(--muted-foreground))" }}
            data-testid={`text-artist-${file.pageId}`}
          >
            {file.artistText}
            {file.artistText && file.year ? " · " : ""}
            {file.year}
          </p>
        )}

        {/* License badge */}
        <span
          className="self-start text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider"
          style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
          data-testid={`badge-license-${file.pageId}`}
        >
          {file.licenseShortName}
        </span>

        {/* Size selector + Download */}
        <div className="flex items-center gap-1.5">
          <select
            value={selectedSize}
            onChange={(e) => setSelectedSize(Number(e.target.value))}
            className="text-[11px] rounded-md px-2 py-1 flex-1 border appearance-none"
            style={{
              background: "hsl(var(--secondary))",
              color: "hsl(var(--secondary-foreground))",
              borderColor: "hsl(var(--border))",
            }}
            data-testid={`select-size-${file.pageId}`}
          >
            {SIZE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} {opt.value}px
              </option>
            ))}
          </select>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="text-[11px] px-2.5 py-1 rounded-md font-medium border transition-opacity disabled:opacity-50 whitespace-nowrap"
            style={{
              background: "hsl(var(--secondary))",
              color: "hsl(var(--secondary-foreground))",
              borderColor: "hsl(var(--border))",
            }}
            data-testid={`button-download-${file.pageId}`}
          >
            {isDownloading ? "..." : "Download"}
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={handleCopyAttribution}
            className="text-[11px] px-2.5 py-1.5 rounded-md font-medium transition-all flex-1 border"
            style={
              copied
                ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderColor: "transparent" }
                : { background: "hsl(20 8% 18%)", color: "hsl(var(--foreground))", borderColor: "hsl(var(--border))" }
            }
            data-testid={`button-copy-${file.pageId}`}
          >
            {copied ? "Copied!" : "Copy attribution"}
          </button>
          <a
            href={file.commonsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] px-2 py-1.5 rounded-md font-medium border"
            style={{ color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }}
            data-testid={`link-source-${file.pageId}`}
          >
            Source ↗
          </a>
          <button
            onClick={handleBasketToggle}
            className="text-[11px] px-2 py-1.5 rounded-md font-medium border transition-all"
            style={
              inBasket
                ? { background: "rgba(178,132,51,0.18)", color: "#c9a55a", borderColor: "rgba(178,132,51,0.4)" }
                : { background: "transparent", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
            }
            data-testid={`button-basket-${file.pageId}`}
          >
            {inBasket ? "In basket" : "+ Basket"}
          </button>
        </div>
      </div>
    </div>
  );
}
