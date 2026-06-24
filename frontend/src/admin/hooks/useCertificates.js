// src/admin/hooks/useCertificates.js
//
// Fetches certificates ONCE per mount (using the cache — see firestoreService.js).
// If the cache is already warm (e.g. you just added a certificate and came
// back to the Dashboard), this resolves instantly with zero Firestore reads.
// The cache is only invalidated by actual add/edit/delete operations, so
// simply re-opening the Dashboard never costs an extra read.

import { useEffect, useState, useMemo, useCallback } from "react";
import { fetchCertificates } from "../../firebase/firestoreService";

export const useCertificates = () => {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCity, setFilterCity] = useState("");

  const load = useCallback(async (opts) => {
    setLoading(true);
    try {
      const data = await fetchCertificates(opts);
      setCerts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Call this after an add/edit/delete to force a fresh read
  // (the cache was already invalidated by firestoreService, so this
  // is a real but necessary single read — not a wasted one).
  const refresh = useCallback(() => load({ force: true }), [load]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return certs.filter((c) => {
      const matchSearch =
        !s ||
        c.name?.toLowerCase().includes(s) ||
        c.cert_id?.toLowerCase().includes(s) ||
        c.cnic?.toLowerCase().includes(s);
      const matchCity = !filterCity || c.city?.toLowerCase() === filterCity.toLowerCase();
      return matchSearch && matchCity;
    });
  }, [certs, search, filterCity]);

  const metrics = useMemo(() => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return {
      total: certs.length,
      incomplete: certs.filter((c) => !c.student_photo_url || !c.contact_no || !c.address).length,
      recentCount: certs.filter(
        (c) => c.created_at?.seconds && now - c.created_at.seconds * 1000 < sevenDays
      ).length,
    };
  }, [certs]);

  const cities = useMemo(() => [...new Set(certs.map((c) => c.city).filter(Boolean))], [certs]);

  return {
    certs, filtered, loading, search, setSearch, filterCity, setFilterCity,
    metrics, cities, refresh,
  };
};
