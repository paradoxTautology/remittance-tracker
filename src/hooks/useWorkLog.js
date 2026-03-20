import { useState, useCallback } from "react";

const STORAGE_KEY = "remittance-tracker-worklog";

/**
 * Work log entry shape:
 * {
 *   id: string,
 *   claimId: number,         // _id from the claim
 *   patient: string,
 *   dos: string,
 *   cpt: string,
 *   payer: string,
 *   billed: number,
 *   reason_codes: string,
 *   icn: string,
 *   acnt: string,
 *   action: string,          // "appeal", "resubmit", "bill_patient", "write_off", "other"
 *   notes: string,
 *   followUpDate: string,    // ISO date string
 *   workedDate: string,      // when it was worked
 *   status: string,          // "pending", "resolved", "written_off"
 *   resolvedDate: string,    // when auto-resolved
 *   resolvedPaid: number,    // amount paid on resolution
 * }
 */

export function useWorkLog() {
  const [entries, setEntriesState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const save = (data) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save work log:", e);
    }
  };

  const addEntry = useCallback(
    (entry) => {
      const next = [
        ...entries,
        {
          ...entry,
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          workedDate: new Date().toISOString(),
          status: entry.action === "write_off" ? "written_off" : "pending",
          resolvedDate: "",
          resolvedPaid: 0,
        },
      ];
      setEntriesState(next);
      save(next);
    },
    [entries]
  );

  const updateEntry = useCallback(
    (id, updates) => {
      const next = entries.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      );
      setEntriesState(next);
      save(next);
    },
    [entries]
  );

  const removeEntry = useCallback(
    (id) => {
      const next = entries.filter((e) => e.id !== id);
      setEntriesState(next);
      save(next);
    },
    [entries]
  );

  /**
   * Cross-reference new claims against pending work log entries.
   * If a previously denied claim now shows payment, mark as resolved.
   * Match on: patient name (normalized) + DOS + CPT
   */
  const crossReference = useCallback(
    (newClaims) => {
      const pending = entries.filter((e) => e.status === "pending");
      if (!pending.length || !newClaims.length) return 0;

      const normalize = (s) =>
        (s || "").toLowerCase().replace(/[^a-z]/g, "");

      let resolved = 0;
      const updated = entries.map((entry) => {
        if (entry.status !== "pending") return entry;

        const match = newClaims.find((c) => {
          const nameMatch =
            normalize(c.patient) === normalize(entry.patient);
          const dosMatch = (c.dos || "") === (entry.dos || "");
          const cptMatch =
            !entry.cpt || !c.cpt || c.cpt === entry.cpt;
          const paid = parseFloat(c.prov_paid) || 0;
          return nameMatch && dosMatch && cptMatch && paid > 0;
        });

        if (match) {
          resolved++;
          return {
            ...entry,
            status: "resolved",
            resolvedDate: new Date().toISOString(),
            resolvedPaid: parseFloat(match.prov_paid) || 0,
          };
        }
        return entry;
      });

      if (resolved > 0) {
        setEntriesState(updated);
        save(updated);
      }
      return resolved;
    },
    [entries]
  );

  const clearLog = useCallback(() => {
    setEntriesState([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }, []);

  return { entries, addEntry, updateEntry, removeEntry, crossReference, clearLog };
}
