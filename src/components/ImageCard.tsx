import { useState, useCallback, useRef } from "react";
import { GripVertical, ImageOff } from "lucide-react";
import { CommonsFile } from "@/types/commons";
import { formatAttribution } from "@/lib/license";
import { useBasket } from "@/hooks/useBasket";
import { useAttributionFormat } from "@/contexts/AttributionContext";
import {
  cleanFilename,
  downloadAttributionFile,
  downloadImageFile,
  fetchImageFile,
  getFireflyDownloadExtension,
} from "@/lib/image-file";

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

interface ImageCardProps {
  file: CommonsFile;
  selected?: boolean;
  onToggleSelect?: (file: CommonsFile) => void;
}

export function ImageCard({ file, selected = false, onToggleSelect }: ImageCardProps) {
  const [imgError, setImgError]       = useState(false);
  const [copied, setCopied]           = useState(false);
  const [selectedSize, setSelectedSize] = useState(800);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSavingAttribution, setIsSavingAttribution] = useState(false);
  const [dragFileState, setDragFileState] = useState<"idle" | "preparing" | "ready" | "error">("idle");
  const preparedDragFile = useRef<{ file: File; size: number } | null>(null);
  const preparingDragFile = useRef<Promise<File> | null>(null);
  const requestedDragSize = useRef(800);

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
      await downloadImageFile(file, selectedSize);
    } catch (err) {
      console.error("Download failed", err);
    } finally {
      setIsDownloading(false);
    }
  }, [file, selectedSize, displayName]);

  const handleDownloadAttribution = useCallback(() => {
    setIsSavingAttribution(true);
    try {
      downloadAttributionFile(file, formatAttribution(file, format));
    } finally {
      setIsSavingAttribution(false);
    }
  }, [file, format]);

  const prepareDragFile = useCallback((): Promise<File> => {
    if (preparedDragFile.current?.size === selectedSize) {
      setDragFileState("ready");
      return Promise.resolve(preparedDragFile.current.file);
    }
    if (preparingDragFile.current) return preparingDragFile.current;

    setDragFileState("preparing");
    let pending: Promise<File>;
    pending = fetchImageFile(file, selectedSize)
      .then((prepared) => {
        if (requestedDragSize.current === selectedSize) {
          preparedDragFile.current = { file: prepared, size: selectedSize };
          setDragFileState("ready");
        }
        return prepared;
      })
      .catch((error) => {
        if (requestedDragSize.current === selectedSize) setDragFileState("error");
        console.error("Could not prepare image for drag and drop", file.title, error);
        throw error;
      })
      .finally(() => {
        if (preparingDragFile.current === pending) preparingDragFile.current = null;
      });
    preparingDragFile.current = pending;
    return pending;
  }, [file, selectedSize]);

  const handleDragFileStart = useCallback((event: React.DragEvent<HTMLImageElement>) => {
    const prepared = preparedDragFile.current;
    if (!prepared || prepared.size !== selectedSize) {
      void prepareDragFile().catch(() => {});
    }

    const transfer = event.dataTransfer;
    transfer.effectAllowed = "copy";
    let fileAdded = false;
    if (prepared?.size === selectedSize) {
      try {
        transfer.items.add(prepared.file);
        fileAdded = true;
      } catch {
        // Some browser and app combinations reject scripted file items; keep the URL payload as a fallback.
      }
    }
    transfer.setData("application/x-common-clip-metadata+json", JSON.stringify({
      title: displayName,
      artist: file.artistText || null,
      year: file.year || null,
      license: file.licenseShortName,
      sourceUrl: file.commonsUrl,
      imageUrl: file.imageInfo.url,
    }));
    // Prefer the actual attributed file. Supplying a URL alongside it can make
    // creative apps import a remote-link placeholder instead of the file.
    if (!fileAdded) {
      transfer.setData("text/uri-list", file.imageInfo.url);
      transfer.setData(
        "text/html",
        `<img src="${file.imageInfo.url.replace(/&/g, "&amp;").replace(/\"/g, "&quot;")}" alt="${displayName.replace(/&/g, "&amp;").replace(/\"/g, "&quot;")}">`,
      );
    }
  }, [displayName, file, prepareDragFile, selectedSize]);

  const handleAttributionDragStart = useCallback((event: React.DragEvent<HTMLButtonElement>) => {
    const transfer = event.dataTransfer;
    transfer.effectAllowed = "copy";
    transfer.setData("text/plain", formatAttribution(file, "plain"));
    transfer.setData("text/markdown", formatAttribution(file, "markdown"));
    transfer.setData("text/html", formatAttribution(file, "html"));
    transfer.setData("application/x-common-clip-metadata+json", JSON.stringify({
      title: displayName,
      artist: file.artistText || null,
      year: file.year || null,
      license: file.licenseShortName,
      licenseUrl: file.imageInfo.extmetadata?.LicenseUrl?.value || null,
      sourceUrl: file.commonsUrl,
      imageUrl: file.imageInfo.url,
      description: file.imageInfo.extmetadata?.ImageDescription?.value || null,
      credit: file.imageInfo.extmetadata?.Credit?.value || null,
      pageId: file.pageId,
    }));
  }, [displayName, file]);

  const handleBasketToggle = useCallback(() => {
    if (inBasket) removeFromBasket(file.pageId);
    else addToBasket(file);
  }, [inBasket, file, addToBasket, removeFromBasket]);

  if (imgError) {
    return (
      <div
        data-testid={`card-broken-${file.pageId}`}
        className="break-inside-avoid mb-4 rounded-xl overflow-hidden border"
       style={{
         background: "hsl(var(--card))",
         borderColor: selected ? "hsl(var(--primary))" : "hsl(var(--card-border))",
         boxShadow: selected ? "0 0 0 1px hsl(var(--primary) / 0.35)" : undefined,
       }}
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
      <div
        className="relative bg-black"
        style={{ minHeight: 140 }}
        onPointerEnter={() => {
          if (dragFileState !== "ready" && dragFileState !== "preparing") {
            void prepareDragFile().catch(() => {});
          }
        }}
      >
        <img
          src={file.imageInfo.thumburl ?? file.imageInfo.url}
          alt={displayName}
          className="w-full object-cover block"
          onError={() => setImgError(true)}
          data-testid={`img-thumbnail-${file.pageId}`}
          loading="lazy"
          draggable
          onDragStart={handleDragFileStart}
          style={{ cursor: "grab" }}
        />
        {dragFileState !== "idle" && (
          <span
            className="absolute bottom-2 left-2 text-[10px] px-2 py-1 rounded-full pointer-events-none"
            style={{
              background: "hsl(var(--background) / 0.82)",
              color: dragFileState === "error" ? "#fca5a5" : "hsl(var(--foreground))",
              backdropFilter: "blur(6px)",
            }}
            aria-live="polite"
          >
            {dragFileState === "preparing" ? "Preparing attributed image…" : dragFileState === "ready" ? "Drag attributed image to your app" : "Drag image link · attribution included"}
          </span>
        )}
        {onToggleSelect && (
          <button
            type="button"
            onClick={() => onToggleSelect(file)}
            aria-label={selected ? `Deselect ${displayName}` : `Select ${displayName}`}
            aria-pressed={selected}
            className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-full border text-sm font-bold transition-all hover:scale-105"
            style={
              selected
                ? {
                    background: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                    borderColor: "hsl(var(--primary))",
                  }
                : {
                    background: "hsl(var(--background) / 0.78)",
                    color: "hsl(var(--foreground))",
                    borderColor: "hsl(var(--foreground) / 0.55)",
                    backdropFilter: "blur(6px)",
                  }
            }
            data-testid={`button-select-${file.pageId}`}
          >
            {selected ? "✓" : ""}
          </button>
        )}
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
            onChange={(e) => {
              const size = Number(e.target.value);
              requestedDragSize.current = size;
              preparedDragFile.current = null;
              preparingDragFile.current = null;
              setSelectedSize(size);
              setDragFileState("idle");
            }}
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
              {isDownloading ? "..." : `Download ${getFireflyDownloadExtension(file).toUpperCase()}`}
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
          <button
            type="button"
            draggable
            onDragStart={handleAttributionDragStart}
            className="text-[11px] px-2 py-1.5 rounded-md font-medium border transition-colors cursor-grab active:cursor-grabbing"
            style={{
              background: "transparent",
              color: "hsl(var(--muted-foreground))",
              borderColor: "hsl(var(--border))",
            }}
            title="Drag formatted citation text or metadata into a document, email, or research notes."
            aria-label={`Drag citation and metadata for ${displayName}`}
            data-testid={`button-drag-attribution-${file.pageId}`}
          >
            <span className="inline-flex items-center gap-1"><GripVertical size={12} />Drag citation</span>
          </button>
          <button
            onClick={handleDownloadAttribution}
            disabled={isSavingAttribution}
            className="text-[11px] px-2 py-1.5 rounded-md font-medium border transition-opacity disabled:opacity-50"
            style={{
              background: "transparent",
              color: "hsl(var(--muted-foreground))",
              borderColor: "hsl(var(--border))",
            }}
            title="Download a matching text sidecar with this image's attribution"
            data-testid={`button-download-attribution-${file.pageId}`}
          >
            {isSavingAttribution ? "Saving…" : "Save .txt"}
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
