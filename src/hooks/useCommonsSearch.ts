import { useState, useCallback, useRef } from "react";
import { CommonsFile } from "../types/commons";
import { isAllowedLicense, cleanHtml } from "../lib/license";

const API_BASE = "https://commons.wikimedia.org/w/api.php";
const SR_LIMIT  = 100;
const INFO_BATCH = 50;
const AUTO_CONTINUE_THRESHOLD = 5;
const MAX_AUTO_CONTINUES      = 6;

export function useCommonsSearch() {
  const [files,       setFiles]       = useState<CommonsFile[]>([]);
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [hasMore,     setHasMore]     = useState(false);
  const [activeQuery, setActiveQuery] = useState("");

  const sroffsetRef    = useRef<number | null>(null);
  const activeQueryRef = useRef("");
  const isLoadingRef   = useRef(false);

  const fetchPage = useCallback(
    async (q: string, offset: number | null, autoContinueDepth = 0) => {
      if (isLoadingRef.current || !q.trim()) return;
      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        let url =
          `${API_BASE}?origin=*&action=query&list=search` +
          `&srnamespace=6&srsearch=${encodeURIComponent(q)}` +
          `&srlimit=${SR_LIMIT}&format=json`;
        if (offset !== null) url += `&sroffset=${offset}`;

        const res  = await fetch(url);
        const data = await res.json();
        if (data.error) throw new Error(data.error.info || "Search API error");

        const results: { pageid: number; title: string }[] =
          data.query?.search ?? [];
        const nextOffset: number | null = data.continue?.sroffset ?? null;

        sroffsetRef.current = nextOffset;

        if (results.length === 0) {
          setHasMore(false);
          return;
        }

        // Batch-fetch imageinfo in chunks of INFO_BATCH
        const collected: CommonsFile[] = [];

        for (let i = 0; i < results.length; i += INFO_BATCH) {
          if (activeQueryRef.current !== q) break;

          const batch  = results.slice(i, i + INFO_BATCH);
          const titles = batch.map((r) => r.title).join("|");

          const infoRes  = await fetch(
            `${API_BASE}?origin=*&action=query` +
            `&titles=${encodeURIComponent(titles)}` +
            `&prop=imageinfo&iiprop=url|extmetadata|dimensions` +
            `&iiurlwidth=800&format=json`
          );
          const infoData = await infoRes.json();
          const pages    = infoData.query?.pages ?? {};

          Object.values(pages).forEach((p: any) => {
            if (!p.imageinfo?.length) return;
            const info = p.imageinfo[0];
            const ext  = info.extmetadata ?? {};
            const lic  = ext.LicenseShortName?.value ?? "";
            if (!isAllowedLicense(lic)) return;
            const year = (ext.DateTimeOriginal?.value ?? "").substring(0, 4);

            collected.push({
              pageId:           p.pageid,
              title:            p.title,
              categoryId:       "search",
              licenseShortName: lic,
              artistText:       cleanHtml(ext.Artist?.value ?? ""),
              year,
              commonsUrl:
                `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
              imageInfo: {
                url:            info.url,
                thumburl:       info.thumburl,
                width:          info.width,
                height:         info.height,
                extmetadata:    ext,
                descriptionurl: info.descriptionurl,
              },
            });
          });

          if (i + INFO_BATCH < results.length) {
            await new Promise((r) => setTimeout(r, 100));
          }
        }

        if (activeQueryRef.current === q) {
          const shouldContinue =
            collected.length < AUTO_CONTINUE_THRESHOLD &&
            nextOffset !== null &&
            autoContinueDepth < MAX_AUTO_CONTINUES;

          setHasMore(!shouldContinue && nextOffset !== null);

          setFiles((prev) => {
            const seen = new Set(prev.map((f) => f.pageId));
            return [...prev, ...collected.filter((f) => !seen.has(f.pageId))];
          });

          if (shouldContinue) {
            isLoadingRef.current = false;
            setIsLoading(false);
            fetchPage(q, nextOffset, autoContinueDepth + 1);
            return;
          }
        }
      } catch (err: any) {
        if (activeQueryRef.current === q) {
          setError(err.message ?? "Search failed");
        }
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    []
  );

  const search = useCallback(
    (q: string) => {
      if (!q.trim()) return;
      activeQueryRef.current = q;
      sroffsetRef.current    = null;
      setActiveQuery(q);
      setFiles([]);
      setHasMore(false);
      setError(null);
      fetchPage(q, null);
    },
    [fetchPage]
  );

  const loadMore = useCallback(() => {
    if (
      !activeQueryRef.current ||
      sroffsetRef.current === null ||
      isLoadingRef.current
    )
      return;
    fetchPage(activeQueryRef.current, sroffsetRef.current);
  }, [fetchPage]);

  const clear = useCallback(() => {
    activeQueryRef.current = "";
    sroffsetRef.current    = null;
    setActiveQuery("");
    setFiles([]);
    setHasMore(false);
    setError(null);
  }, []);

  return { files, isLoading, error, hasMore, activeQuery, search, loadMore, clear };
}
