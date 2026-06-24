// src/admin/hooks/useDropdownList.js
//
// Fetches a dropdown list (purpose / obtain_purpose / city) ONCE per mount,
// using the cache in firestoreService.js. Dropdown lists change rarely, so
// they're cached aggressively — opening the Add Certificate form repeatedly
// or revisiting Manage Dropdowns does not refetch unless the list actually
// changed (add/edit/delete invalidates only that specific list's cache).

import { useEffect, useState, useCallback } from "react";
import { fetchDropdownList } from "../../firebase/firestoreService";

export const useDropdownList = (listType) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (opts) => {
    setLoading(true);
    try {
      const data = await fetchDropdownList(listType, opts);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [listType]);

  useEffect(() => {
    load();
  }, [load]);

  // Call after add/edit/delete to pull the freshly-invalidated data.
  const refresh = useCallback(() => load({ force: true }), [load]);

  return { items, loading, refresh };
};
