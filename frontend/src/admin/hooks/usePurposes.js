// src/admin/hooks/usePurposes.js
import { useDropdownList } from "./useDropdownList";

// Kept as a thin wrapper for backward compatibility with existing imports.
export const usePurposes = () => {
  const { items, loading, refresh } = useDropdownList("purpose");
  return { purposes: items, loading, refresh };
};
