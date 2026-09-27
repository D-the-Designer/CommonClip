import { useState, useEffect, useRef, useCallback } from "react";
import { EDITIONS } from "@/data/manifest";
import { CommonsFile } from "@/types/commons";
import { useCommonsCategory } from "@/hooks/useCommonsCategory";
import { useCommonsSearch } from "@/hooks/useCommonsSearch";
import { useAttributionFormat } from "@/contexts/AttributionContext";
import { useBasket } from "@/hooks/useBasket";
import { ImageCard } from "@/components/ImageCard";
import { BasketDrawer } from "@/components/BasketDrawer";
import { downloadAttributionFile, downloadImageFile } from "@/lib/image-file";
import { formatAttribution } from "@/lib/license";

const edition = EDITIONS[0];
const cats    = edition.categories;

const ATTRIBUTION_FORMATS = [
  { value: "plain"    as const, label: "Plain" },
  { value: "markdown" as const, label: "Markdown" },
  { value: "html"     as const, label: "HTML" },
];

type CategoryFilter = "all" | string;

export default function Home() {
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");
  const [basketOpen,   setBasketOpen]   = useState(false);
  const [inputValue,   setInputValue]   = useState("");
  const [selectedFiles, setSelectedFiles] = useState<CommonsFile[]>([]);
  const [batchAction, setBatchAction] = useState<"images" | "attribution" | null>(null);
  const { format, setFormat }           = useAttributionFormat();
  const { basket }                      = useBasket();
  const sentinelRef                     = useRef<HTMLDivElement>(null);
  const loadMoreRef                     = useRef<() => void>(() => {});

  // ── Fixed pool of hooks (always called in same order — React rules).
  //    Positions beyond cats.length receive null → no-op.
  const h0 = useCommonsCategory(cats[0] ?? null);
  const h1 = useCommonsCategory(cats[1] ?? null);
  const h2 = useCommonsCategory(cats[2] ?? null);
  const h3 = useCommonsCategory(cats[3] ?? null);
  const h4 = useCommonsCategory(cats[4] ?? null);
  const h5 = useCommonsCategory(cats[5] ?? null);
  const h6 = useCommonsCategory(cats[6] ?? null);
  const h7 = useCommonsCategory(cats[7] ?? null);

  const allHooks    = [h0, h1, h2, h3, h4, h5, h6, h7];
  const activeHooks = allHooks.slice(0, cats.length);

  // Initial load
  useEffect(() => {
    activeHooks.forEach((h) => h.loadMore());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Search hook ──────────────────────────────────────────────────────────
  const searchHook   = useCommonsSearch();
  const isSearchMode = !!searchHook.activeQuery;

  // ── Derived browse state ─────────────────────────────────────────────────
  const rawBrowseFiles: CommonsFile[] =
    activeFilter === "all"
      ? activeHooks.flatMap((d) => d.files)
      : activeHooks[cats.findIndex((c) => c.id === activeFilter)]?.files ?? [];

  const seenBrowse = new Set<number>();
  const browseFiles = rawBrowseFiles.filter((f) => {
    if (seenBrowse.has(f.pageId)) return false;
    seenBrowse.add(f.pageId);
    return true;
  });

  const totalCount       = activeHooks.reduce((sum, d) => sum + d.files.length, 0);
  const browseIsLoading  =
    activeFilter === "all"
      ? activeHooks.some((d) => d.isLoading)
      : activeHooks[cats.findIndex((c) => c.id === activeFilter)]?.isLoading ?? false;

  // ── Active grid state ────────────────────────────────────────────────────
  const displayFiles = isSearchMode ? searchHook.files      : browseFiles;
  const isLoading    = isSearchMode ? searchHook.isLoading  : browseIsLoading;
  const activeError  = isSearchMode ? searchHook.error      : null;
  const selectedIds = new Set(selectedFiles.map((file) => file.pageId));
  const allVisibleSelected =
    displayFiles.length > 0 && displayFiles.every((file) => selectedIds.has(file.pageId));

  // ── Load-more ────────────────────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    if (isSearchMode) {
      if (searchHook.hasMore && !searchHook.isLoading) searchHook.loadMore();
      return;
    }
    if (activeFilter === "all") {
      activeHooks.forEach((d) => { if (d.hasMore && !d.isLoading) d.loadMore(); });
    } else {
      const idx = cats.findIndex((c) => c.id === activeFilter);
      const d   = activeHooks[idx];
      if (d && d.hasMore && !d.isLoading) d.loadMore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearchMode, searchHook.hasMore, searchHook.isLoading, activeFilter]);

  loadMoreRef.current = handleLoadMore;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMoreRef.current(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // ── Search handlers ──────────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) searchHook.search(inputValue.trim());
  };

  const handleClearSearch = () => {
    searchHook.clear();
    setInputValue("");
  };

  const handleToggleSelect = useCallback((file: CommonsFile) => {
    setSelectedFiles((previous) =>
      previous.some((selected) => selected.pageId === file.pageId)
        ? previous.filter((selected) => selected.pageId !== file.pageId)
        : [...previous, file],
    );
  }, []);

  const handleSelectAllVisible = useCallback(() => {
    setSelectedFiles((previous) => {
      const visibleIds = new Set(displayFiles.map((file) => file.pageId));
      if (displayFiles.length > 0 && displayFiles.every((file) => previous.some((selected) => selected.pageId === file.pageId))) {
        return previous.filter((file) => !visibleIds.has(file.pageId));
      }
      const existingIds = new Set(previous.map((file) => file.pageId));
      return [...previous, ...displayFiles.filter((file) => !existingIds.has(file.pageId))];
    });
  }, [displayFiles]);

  const handleDownloadSelected = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    setBatchAction("images");
    for (const file of selectedFiles) {
      try {
        await downloadImageFile(file, 800);
        await new Promise((resolve) => window.setTimeout(resolve, 600));
      } catch (error) {
        console.error("Selected image download failed", file.title, error);
      }
    }
    setBatchAction(null);
  }, [selectedFiles]);

  const handleDownloadSelectedAttribution = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    setBatchAction("attribution");
    for (const file of selectedFiles) {
      downloadAttributionFile(file, formatAttribution(file, format));
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    }
    setBatchAction(null);
  }, [selectedFiles, format]);

  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>

      {/* ── Header ── */}
      <header
        className="px-6 pt-10 pb-6 border-b"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <p
                className="text-[10px] uppercase tracking-[0.25em] mb-2"
                style={{ color: "hsl(var(--muted-foreground))", fontFamily: "var(--app-font-sans)" }}
              >
                by D the Designer
              </p>
              <h1
                className="text-6xl font-bold tracking-tight"
                style={{ fontFamily: "var(--app-font-serif)", color: "hsl(var(--foreground))" }}
                data-testid="heading-common-clip"
              >
                Common Clip
              </h1>
              <p
                className="mt-2 text-sm"
                style={{ color: "hsl(var(--muted-foreground))", fontFamily: "var(--app-font-sans)" }}
              >
                {edition.description}
              </p>
               <p
                 className="mt-3 text-[11px] uppercase tracking-[0.14em]"
                 style={{ color: "hsl(var(--primary))", fontFamily: "var(--app-font-sans)" }}
                 data-testid="text-firefly-handoff"
               >
                 Drag prepared images into Firefly, email, or other apps · Drag attributions into research notes · Save .txt for a record
               </p>
            </div>

            {/* Attribution format toggle */}
            <div className="flex flex-col gap-1.5">
              <p
                className="text-[10px] uppercase tracking-[0.2em]"
                style={{ color: "hsl(var(--muted-foreground))", fontFamily: "var(--app-font-sans)" }}
              >
                Copy as
              </p>
              <div
                className="flex rounded-lg overflow-hidden border text-xs"
                style={{ borderColor: "hsl(var(--border))" }}
                data-testid="toggle-attribution-format"
              >
                {ATTRIBUTION_FORMATS.map((fmt) => (
                  <button
                    key={fmt.value}
                    onClick={() => setFormat(fmt.value)}
                    className="px-4 py-2 font-medium transition-colors"
                    style={
                      format === fmt.value
                        ? { background: "hsl(var(--primary))",   color: "hsl(var(--primary-foreground))" }
                        : { background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))" }
                    }
                    data-testid={`button-format-${fmt.value}`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Sticky toolbar ── */}
      <div
        className="px-6 py-4 border-b sticky top-0 z-30"
        style={{
          borderColor:    "hsl(var(--border))",
          background:     "hsl(var(--background) / 0.92)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="max-w-7xl mx-auto flex flex-col gap-3">

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "hsl(var(--muted-foreground))" }}
                width={15} height={15} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={'Search any topic\u2026 \u201Cphrenology diagrams\u201D, \u201Ccelestial maps\u201D, \u201Cjapanese woodblock\u201D'}
                className="w-full rounded-lg border pl-9 pr-9 py-2 text-sm outline-none transition-colors"
                style={{
                  background:  "hsl(var(--secondary))",
                  borderColor: isSearchMode ? "hsl(var(--primary))" : "hsl(var(--border))",
                  color:       "hsl(var(--foreground))",
                  fontFamily:  "var(--app-font-sans)",
                }}
                data-testid="input-search"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full w-4 h-4 hover:opacity-70"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                  aria-label="Clear search"
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                    <line x1="18" y1="6"  x2="6"  y2="18" />
                    <line x1="6"  y1="6"  x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-medium shrink-0"
              style={{
                background: "hsl(var(--primary))",
                color:      "hsl(var(--primary-foreground))",
                fontFamily: "var(--app-font-sans)",
              }}
              data-testid="button-search-submit"
            >
              Search
            </button>
          </form>

          {/* Browse mode: category pills */}
          {!isSearchMode && (
            <div className="flex flex-wrap gap-2" data-testid="filter-pills">
              <button
                onClick={() => setActiveFilter("all")}
                className="text-xs px-3.5 py-1.5 rounded-full font-medium transition-all border"
                style={
                  activeFilter === "all"
                    ? { background: "hsl(var(--primary))",   color: "hsl(var(--primary-foreground))", borderColor: "hsl(var(--primary))" }
                    : { background: "transparent",            color: "hsl(var(--muted-foreground))",  borderColor: "hsl(var(--border))" }
                }
                data-testid="pill-all"
              >
                All ({totalCount})
              </button>
              {cats.map((cat, i) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveFilter(cat.id)}
                  className="text-xs px-3.5 py-1.5 rounded-full font-medium transition-all border"
                  style={
                    activeFilter === cat.id
                      ? { background: "hsl(var(--primary))",   color: "hsl(var(--primary-foreground))", borderColor: "hsl(var(--primary))" }
                      : { background: "transparent",            color: "hsl(var(--muted-foreground))",  borderColor: "hsl(var(--border))" }
                  }
                  data-testid={`pill-${cat.id}`}
                >
                  {cat.label} ({activeHooks[i]?.files.length ?? 0})
                </button>
              ))}
            </div>
          )}

          {/* Search mode: context bar */}
          {isSearchMode && (
            <div className="flex items-center gap-3" data-testid="search-context-bar">
              <p
                className="text-xs flex-1 min-w-0 truncate"
                style={{ color: "hsl(var(--muted-foreground))", fontFamily: "var(--app-font-sans)" }}
              >
                <span style={{ color: "hsl(var(--foreground))" }}>
                  Results for{" "}
                  <strong style={{ color: "hsl(var(--primary))" }}>
                    &ldquo;{searchHook.activeQuery}&rdquo;
                  </strong>
                </span>
                {!isLoading && (
                  <span className="ml-2">
                    — {displayFiles.length} licensed image{displayFiles.length !== 1 ? "s" : ""} found
                    {searchHook.hasMore ? " so far" : ""}
                  </span>
                )}
              </p>
              <button
                onClick={handleClearSearch}
                className="text-xs px-3 py-1 rounded-full border shrink-0 hover:opacity-80"
                style={{
                  borderColor: "hsl(var(--border))",
                  color:       "hsl(var(--muted-foreground))",
                  fontFamily:  "var(--app-font-sans)",
                }}
                data-testid="button-clear-search"
              >
                ← Browse collections
              </button>
            </div>
          )}

          <div
            className="flex items-center gap-2 flex-wrap pt-1"
            data-testid="selection-toolbar"
          >
            <span
              className="text-xs mr-auto"
              style={{ color: selectedFiles.length ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
            >
              {selectedFiles.length === 0
                ? "Select images for a batch export"
                : `${selectedFiles.length} image${selectedFiles.length === 1 ? "" : "s"} selected`}
            </span>
            <button
              type="button"
              onClick={handleSelectAllVisible}
              disabled={displayFiles.length === 0}
              className="text-xs px-3 py-1.5 rounded-full border disabled:opacity-40"
              style={{
                color: "hsl(var(--muted-foreground))",
                borderColor: "hsl(var(--border))",
              }}
              data-testid="button-select-all-visible"
            >
              {allVisibleSelected ? "Clear visible" : "Select visible"}
            </button>
            {selectedFiles.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadSelected}
                  disabled={batchAction !== null}
                  className="text-xs px-3 py-1.5 rounded-full font-medium border disabled:opacity-50"
                  style={{
                    background: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                    borderColor: "hsl(var(--primary))",
                  }}
                  data-testid="button-download-selected"
                >
                  {batchAction === "images" ? "Downloading…" : "Download images"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSelectedAttribution}
                  disabled={batchAction !== null}
                  className="text-xs px-3 py-1.5 rounded-full border disabled:opacity-50"
                  style={{
                    color: "hsl(var(--muted-foreground))",
                    borderColor: "hsl(var(--border))",
                  }}
                  data-testid="button-download-selected-attribution"
                >
                  {batchAction === "attribution" ? "Saving…" : "Save .txt files"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFiles([])}
                  disabled={batchAction !== null}
                  className="text-xs px-3 py-1.5 rounded-full border disabled:opacity-50"
                  style={{
                    color: "hsl(var(--muted-foreground))",
                    borderColor: "hsl(var(--border))",
                  }}
                  data-testid="button-clear-selection"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Main grid ── */}
      <main className="px-6 py-8 max-w-7xl mx-auto">

        {activeError && (
          <div
            className="mb-6 px-4 py-3 rounded-lg border text-sm"
            style={{
              borderColor: "hsl(var(--destructive) / 0.4)",
              background:  "hsl(var(--destructive) / 0.1)",
              color:       "hsl(var(--destructive))",
              fontFamily:  "var(--app-font-sans)",
            }}
          >
            {activeError}
          </div>
        )}

        {displayFiles.length === 0 && !isLoading && (
          <div className="text-center py-24" data-testid="state-empty">
            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
              {isSearchMode
                ? `No license-safe images found for \u201C${searchHook.activeQuery}\u201D \u2014 try a broader term.`
                : "No licensed images found yet \u2014 the Commons API may be slow to respond."}
            </p>
          </div>
        )}

        {displayFiles.length > 0 && (
          <div
            className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4"
            data-testid="grid-images"
          >
            {displayFiles.map((file) => (
              <ImageCard
                key={`${file.categoryId}-${file.pageId}`}
                file={file}
                selected={selectedIds.has(file.pageId)}
                onToggleSelect={handleToggleSelect}
              />
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-10" data-testid="state-loading">
            <p
              className="text-[11px] uppercase tracking-[0.25em]"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              {isSearchMode ? "Searching Wikimedia Commons\u2026" : "Loading from Wikimedia Commons\u2026"}
            </p>
          </div>
        )}

        <div ref={sentinelRef} className="h-8" data-testid="scroll-sentinel" />
      </main>

      {/* ── Basket FAB ── */}
      <button
        onClick={() => setBasketOpen(true)}
        className="fixed bottom-6 right-6 flex flex-col items-center justify-center rounded-full shadow-2xl z-50 transition-transform hover:scale-105 border"
        style={{
          width:       56,
          height:      56,
          background:  "hsl(var(--primary))",
          color:       "hsl(var(--primary-foreground))",
          borderColor: "hsl(var(--primary-border))",
        }}
        data-testid="button-basket-fab"
      >
        {basket.length > 0 ? (
          <>
            <span className="text-[9px] uppercase tracking-widest leading-none">Basket</span>
            <span className="text-base font-bold leading-tight">{basket.length}</span>
          </>
        ) : (
          <span className="text-[9px] uppercase tracking-widest text-center leading-tight px-1">
            Basket
          </span>
        )}
      </button>

      <BasketDrawer open={basketOpen} onClose={() => setBasketOpen(false)} />

      {/* ── Footer ── */}
      <footer
        className="border-t px-6 py-10 mt-8"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <div
          className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ fontFamily: "var(--app-font-sans)" }}
        >
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            Made by{" "}
            <span style={{ color: "hsl(var(--foreground))", fontWeight: 500 }}>
              D the Designer
            </span>
          </p>

          <div className="flex items-center gap-5">
            {/* X / Twitter */}
            <a
              href="https://x.com/D_the_Designer"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              @D_the_Designer
            </a>

            {/* GitHub */}
            <a
              href="https://github.com/D_the_Designer"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              @D_the_Designer
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
