// src/admin/hooks/useCertificates.js
//
// Paginated certificate list (PAGE_SIZE docs per fetch, not the whole
// collection) + CNIC-only exact search + cheap aggregation metrics.
//
// Cost per action:
// - Open dashboard / click Next / click Previous: PAGE_SIZE reads (default 20)
// - Change city filter: PAGE_SIZE reads (resets to page 1)
// - Search by CNIC: 1 read (direct getDoc by document ID)
// - Add / Edit / Delete: the write itself, + 1 page reload (PAGE_SIZE reads)
//   to show the result, + a metrics refresh (2 reads, via aggregation)

import { useState, useCallback, useEffect } from "react";
import {
  fetchCertificatesPage,
  fetchCertificateMetrics,
  searchCertificateByCnic,
  PAGE_SIZE,
} from "../../firebase/firestoreService";

export const useCertificates = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCity, setFilterCity] = useState("");

  // cursors[i] = the lastDoc SNAPSHOT of page i (0-based), used as the
  // startAfter() cursor to fetch page i+1. cursors[0] is page 1's last doc,
  // which lets you fetch page 2, and so on. Page 1 itself needs no cursor.
  const [cursors, setCursors] = useState([]); // QueryDocumentSnapshot[], not serialized anywhere
  const [pageIndex, setPageIndex] = useState(0); // 0-based: 0 = page 1
  const [hasMore, setHasMore] = useState(false);

  const [metrics, setMetrics] = useState({ total: 0, recentCount: 0 });

  // CNIC search is a separate, parallel mode — it doesn't use pagination at
  // all, since it's always exactly 0 or 1 result.
  const [cnicSearch, setCnicSearch] = useState("");
  const [searchResult, setSearchResult] = useState(undefined); // undefined = not searched, null = not found
  const [searching, setSearching] = useState(false);

  const loadPage = useCallback(
    async ({ cursor = null, index = 0, force = false } = {}) => {
      setLoading(true);
      try {
        const { rows: pageRows, lastDoc, hasMore: more } = await fetchCertificatesPage({
          cursor,
          city: filterCity,
          force,
        });
        setRows(pageRows);
        setHasMore(more);
        setPageIndex(index);
        // Record this page's last-doc snapshot at slot [index] so a future
        // "go to index+1" knows what cursor to start after.
        setCursors((prev) => {
          const next = prev.slice(0, index);
          next[index] = lastDoc;
          return next;
        });
      } finally {
        setLoading(false);
      }
    },
    [filterCity]
  );

  const loadMetrics = useCallback(async (opts) => {
    const m = await fetchCertificateMetrics(opts);
    setMetrics(m);
  }, []);

  // Initial load + reload whenever the city filter changes (resets to page 1)
  useEffect(() => {
    setCursors([]);
    loadPage({ cursor: null, index: 0 });
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCity]);

  const goNext = useCallback(async () => {
    if (!hasMore) return;
    const cursorForNextPage = cursors[pageIndex]; // last doc of the page we're leaving
    await loadPage({ cursor: cursorForNextPage, index: pageIndex + 1 });
  }, [hasMore, cursors, pageIndex, loadPage]);

  const goPrev = useCallback(async () => {
    if (pageIndex === 0) return;
    const targetIndex = pageIndex - 1;
    const cursorForTargetPage = targetIndex === 0 ? null : cursors[targetIndex - 1];
    await loadPage({ cursor: cursorForTargetPage, index: targetIndex });
  }, [pageIndex, cursors, loadPage]);

  const refresh = useCallback(async () => {
    // After add/edit/delete: cache was already invalidated in
    // firestoreService. Reload current page from the same cursor, forced.
    const cursorForCurrentPage = pageIndex === 0 ? null : cursors[pageIndex - 1];
    await loadPage({ cursor: cursorForCurrentPage, index: pageIndex, force: true });
    await loadMetrics({ force: true });
  }, [loadPage, loadMetrics, pageIndex, cursors]);

  const runCnicSearch = useCallback(async () => {
    if (!cnicSearch.trim()) {
      setSearchResult(undefined);
      return;
    }
    setSearching(true);
    try {
      const result = await searchCertificateByCnic(cnicSearch);
      setSearchResult(result); // null = not found, object = found
    } finally {
      setSearching(false);
    }
  }, [cnicSearch]);

  const clearSearch = useCallback(() => {
    setCnicSearch("");
    setSearchResult(undefined);
  }, []);

  return {
    rows,
    loading,
    pageIndex,
    hasMore,
    goNext,
    goPrev,
    filterCity,
    setFilterCity,
    metrics,
    refresh,
    cnicSearch,
    setCnicSearch,
    searchResult,
    searching,
    runCnicSearch,
    clearSearch,
    pageSize: PAGE_SIZE,
  };
};