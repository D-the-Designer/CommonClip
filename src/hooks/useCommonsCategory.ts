import { useState, useEffect, useCallback, useRef } from "react";
import { CommonsFile } from "../types/commons";
import { SubCategory } from "../data/manifest";
import { isAllowedLicense, cleanHtml } from "../lib/license";

const API_BASE = "https://commons.wikimedia.org/w/api.php";
const CACHE_PREFIX = "wikistock_cache_";
const CACHE_ITEM_LIMIT_BYTES = 200_000; // ~200 KB per category

// On module load, evict any oversized legacy cache entries so a previously
// bloated sessionStorage doesn't prevent the app from starting.
try {
  Object.keys(sessionStorage)
    .filter((k) => k.startsWith(CACHE_PREFIX))
    .forEach((k) => {
      const val = sessionStorage.getItem(k) ?? "";
      if (val.length > CACHE_ITEM_LIMIT_BYTES) sessionStorage.removeItem(k);
    });
} catch {
  // sessionStorage unavailable — ignore
}

export function useCommonsCategory(category: SubCategory | null) {
  const [files, setFiles] = useState<CommonsFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // State to track pagination token for category members
  const [cmcontinue, setCmcontinue] = useState<string | undefined>(undefined);
  // State to hold pending titles to fetch imageinfo for
  const [pendingTitles, setPendingTitles] = useState<string[]>([]);
  
  // Track current category to reset state when it changes
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);

  // Load cache on category change
  useEffect(() => {
    if (!category) {
      setFiles([]);
      return;
    }
    
    if (category.id !== currentCategoryId) {
      setCurrentCategoryId(category.id);
      
      const cached = sessionStorage.getItem(`${CACHE_PREFIX}${category.id}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed) && parsed.length > 0) {
            setFiles(parsed);
            // We assume if we loaded from cache, we might still want to fetch more later,
            // but for simplicity, we could consider cache as a full snapshot, or just 
            // set cmcontinue to whatever it was. We'll simplify and say cache is just initial load.
            // A more robust implementation would cache the token and pending titles too.
            setIsLoading(false);
            setHasMore(true); // Always allow trying to load more
            return;
          }
        } catch (e) {
          console.error("Failed to parse cache", e);
        }
      }
      
      // If no valid cache, reset and start fetching
      setFiles([]);
      setCmcontinue(undefined);
      setPendingTitles([]);
      setHasMore(true);
      setError(null);
    }
  }, [category, currentCategoryId]);

  const fetchBatch = useCallback(async () => {
    if (!category || isLoading || !hasMore) return;
    setIsLoading(true);
    setError(null);

    try {
      let currentPendingTitles = [...pendingTitles];
      let currentCmcontinue = cmcontinue;
      let newFiles: CommonsFile[] = [];

      // We want to fetch enough to get at least some valid images, 
      // but to prevent infinite loops, we cap the iterations per call.
      let iterations = 0;
      const MAX_ITERATIONS = 3;

      while (newFiles.length < 10 && hasMore && iterations < MAX_ITERATIONS) {
        iterations++;
        
        // 1. If we don't have enough pending titles, fetch more category members
        if (currentPendingTitles.length < 20) {
          let url = `${API_BASE}?origin=*&action=query&list=categorymembers&cmtype=file&cmtitle=Category:${encodeURIComponent(
            category.commonsCategory
          )}&cmlimit=50&format=json`;
          if (currentCmcontinue) {
            url += `&cmcontinue=${encodeURIComponent(currentCmcontinue)}`;
          }

          const res = await fetch(url);
          const data = await res.json();

          if (data.error) {
            throw new Error(data.error.info || "API Error");
          }

          const members = data.query?.categorymembers || [];
          const titles = members.map((m: any) => m.title);
          currentPendingTitles = [...currentPendingTitles, ...titles];
          
          if (data.continue?.cmcontinue) {
            currentCmcontinue = data.continue.cmcontinue;
          } else {
            currentCmcontinue = undefined;
            if (currentPendingTitles.length === 0) {
              setHasMore(false);
              break; // No more members to fetch at all
            }
          }
        }

        // 2. Take up to 20 titles from pending to fetch imageinfo
        const batchTitles = currentPendingTitles.splice(0, 20);
        if (batchTitles.length === 0) break;

        const infoUrl = `${API_BASE}?origin=*&action=query&titles=${encodeURIComponent(
          batchTitles.join("|")
        )}&prop=imageinfo&iiprop=url|extmetadata|dimensions&iiurlwidth=800&format=json`;

        const infoRes = await fetch(infoUrl);
        const infoData = await infoRes.json();

        const pages = infoData.query?.pages || {};
        const parsedFiles: CommonsFile[] = [];

        Object.values(pages).forEach((p: any) => {
          if (!p.imageinfo || p.imageinfo.length === 0) return;
          const info = p.imageinfo[0];
          const ext = info.extmetadata || {};
          
          const licenseShortName = ext.LicenseShortName?.value || "";
          
          if (isAllowedLicense(licenseShortName)) {
            const yearStr = ext.DateTimeOriginal?.value || "";
            const year = yearStr.substring(0, 4); // simplistic extraction
            
            parsedFiles.push({
              pageId: p.pageid,
              title: p.title,
              categoryId: category.id,
              licenseShortName,
              artistText: cleanHtml(ext.Artist?.value || ""),
              year,
              commonsUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
              imageInfo: {
                url: info.url,
                thumburl: info.thumburl,
                width: info.width,
                height: info.height,
                extmetadata: ext,
                descriptionurl: info.descriptionurl,
              }
            });
          }
        });

        newFiles = [...newFiles, ...parsedFiles];
        
        // Brief pause to respect API rate limits somewhat
        await new Promise(r => setTimeout(r, 200));
      }

      setCmcontinue(currentCmcontinue);
      setPendingTitles(currentPendingTitles);
      
      if (newFiles.length > 0) {
        setFiles(prev => {
          const updated = [...prev, ...newFiles];
          // Cache without bulky extmetadata to stay within sessionStorage quota
          try {
            const slim = updated.map(f => ({
              ...f,
              imageInfo: { ...f.imageInfo, extmetadata: undefined },
            }));
            sessionStorage.setItem(`${CACHE_PREFIX}${category.id}`, JSON.stringify(slim));
          } catch {
            // Quota exceeded — skip cache, app continues normally
          }
          return updated;
        });
      }
      
      if (!currentCmcontinue && currentPendingTitles.length === 0) {
        setHasMore(false);
      }

    } catch (err: any) {
      console.error("Error fetching category", err);
      setError(err.message || "Failed to load images");
    } finally {
      setIsLoading(false);
    }
  }, [category, isLoading, hasMore, cmcontinue, pendingTitles]);

  const loadMore = useCallback(() => {
    fetchBatch();
  }, [fetchBatch]);

  return { files, isLoading, error, loadMore, hasMore };
}
