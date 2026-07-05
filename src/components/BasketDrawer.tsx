import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CommonsFile } from "@/types/commons";
import { formatAttribution } from "@/lib/license";
import { useBasket } from "@/hooks/useBasket";
import { useAttributionFormat } from "@/contexts/AttributionContext";
import { cleanFilename } from "@/components/ImageCard";

const API_BASE = "https://commons.wikimedia.org/w/api.php";

async function downloadFile(file: CommonsFile, size = 800): Promise<void> {
  const titleParam = encodeURIComponent(file.title);
  const apiUrl = `${API_BASE}?origin=*&action=query&titles=${titleParam}&prop=imageinfo&iiprop=url&iiurlwidth=${size}&format=json`;
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
  a.download = cleanFilename(file.title).replace(/\s+/g, "_") + ".jpg";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objUrl);
}

interface BasketDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function BasketDrawer({ open, onClose }: BasketDrawerProps) {
  const { basket, removeFromBasket, clearBasket } = useBasket();
  const { format } = useAttributionFormat();
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [batchCopied, setBatchCopied] = useState(false);

  const handleDownloadAll = async () => {
    setIsBatchDownloading(true);
    for (const file of basket) {
      try {
        await downloadFile(file);
        await new Promise((r) => setTimeout(r, 600));
      } catch (e) {
        console.error("Failed to download", file.title, e);
      }
    }
    setIsBatchDownloading(false);
  };

  const handleCopyAllAttributions = async () => {
    const text = basket.map((f) => formatAttribution(f, format)).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setBatchCopied(true);
      setTimeout(() => setBatchCopied(false), 2500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[400px] flex flex-col p-0"
        style={{ background: "hsl(var(--sidebar))", borderColor: "hsl(var(--sidebar-border))" }}
      >
        <SheetHeader
          className="px-5 pt-6 pb-4 border-b"
          style={{ borderColor: "hsl(var(--sidebar-border))" }}
        >
          <SheetTitle
            className="text-xl"
            style={{ fontFamily: "var(--app-font-serif)", color: "hsl(var(--foreground))" }}
          >
            Basket
            <span className="ml-2 text-sm font-normal" style={{ color: "hsl(var(--muted-foreground))" }}>
              {basket.length} {basket.length === 1 ? "item" : "items"}
            </span>
          </SheetTitle>
        </SheetHeader>

        {basket.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
            <p
              className="text-sm text-center leading-relaxed"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Your basket is empty.
              <br />
              Add images while browsing to collect and batch-download them.
            </p>
          </div>
        ) : (
          <>
            {/* Batch actions */}
            <div
              className="px-5 py-4 flex flex-col gap-2 border-b"
              style={{ borderColor: "hsl(var(--sidebar-border))" }}
            >
              <button
                onClick={handleDownloadAll}
                disabled={isBatchDownloading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold border transition-opacity disabled:opacity-50"
                style={{
                  background: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  borderColor: "hsl(var(--primary-border))",
                }}
                data-testid="button-download-all"
              >
                {isBatchDownloading
                  ? "Downloading..."
                  : `Download All (${basket.length})`}
              </button>
              <button
                onClick={handleCopyAllAttributions}
                className="w-full py-2.5 rounded-lg text-sm font-medium border transition-colors"
                style={
                  batchCopied
                    ? {
                        background: "rgba(178,132,51,0.18)",
                        color: "#c9a55a",
                        borderColor: "rgba(178,132,51,0.4)",
                      }
                    : {
                        background: "hsl(var(--secondary))",
                        color: "hsl(var(--secondary-foreground))",
                        borderColor: "hsl(var(--border))",
                      }
                }
                data-testid="button-copy-all"
              >
                {batchCopied ? "Copied all attributions!" : "Copy All Attributions"}
              </button>
              <button
                onClick={clearBasket}
                className="w-full py-2 rounded-lg text-xs font-medium border"
                style={{
                  background: "transparent",
                  color: "hsl(var(--muted-foreground))",
                  borderColor: "hsl(var(--border))",
                }}
                data-testid="button-clear-basket"
              >
                Clear Basket
              </button>
            </div>

            {/* Item list */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 px-5 py-4">
              {basket.map((file) => (
                <div
                  key={file.pageId}
                  className="flex items-center gap-3 p-2.5 rounded-xl border"
                  style={{
                    background: "hsl(var(--card))",
                    borderColor: "hsl(var(--card-border))",
                  }}
                  data-testid={`basket-item-${file.pageId}`}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-black flex-shrink-0">
                    <img
                      src={file.imageInfo.thumburl ?? file.imageInfo.url}
                      alt={cleanFilename(file.title)}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-medium leading-snug line-clamp-2"
                      style={{ fontFamily: "var(--app-font-serif)", color: "hsl(var(--foreground))" }}
                    >
                      {cleanFilename(file.title)}
                    </p>
                    <p
                      className="text-[10px] mt-0.5 uppercase tracking-wider"
                      style={{ color: "hsl(var(--muted-foreground))" }}
                    >
                      {file.licenseShortName}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromBasket(file.pageId)}
                    className="flex-shrink-0 text-[10px] px-2 py-1 rounded border uppercase tracking-wide"
                    style={{
                      color: "hsl(var(--muted-foreground))",
                      borderColor: "hsl(var(--border))",
                    }}
                    data-testid={`button-remove-basket-${file.pageId}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
