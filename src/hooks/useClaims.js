import { useState, useCallback } from "react";

const STORAGE_KEY = "remittance-tracker-claims";

/**
 * Hook for persisting claims data in localStorage.
 * Returns [claims, setClaims, clearClaims].
 */
export function useClaims() {
  const [claims, setClaimsState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const setClaims = useCallback((next) => {
    setClaimsState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error("Failed to save claims:", e);
    }
  }, []);

  const clearClaims = useCallback(() => {
    setClaimsState([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear claims:", e);
    }
  }, []);

  return [claims, setClaims, clearClaims];
}
