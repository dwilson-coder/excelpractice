import { useEffect } from "react";
import { useStore } from "./useStore";
import { hasConsent, CONSENT_EVENT } from "../lib/consent";
import { save, savedStatus, loadPlain } from "../lib/persist";

/**
 * Restores the autosaved workbook on first load and keeps saving changes (debounced).
 * Only active with "functional" consent; encrypted when a password is set.
 */
export function useAutosave() {
  // restore once (and again if consent is granted later in the session)
  useEffect(() => {
    const restore = () => {
      if (!hasConsent("functional")) return;
      const status = savedStatus();
      const s = useStore.getState();
      if (status === "plain" && !s.dirty && !s.past.length) {
        const wb = loadPlain();
        if (wb) s.replaceWorkbook(wb, wb.title);
      } else if (status === "encrypted" && !s.password) s.openDialog("password", { mode: "unlock" });
    };
    restore();
  }, []);

  useEffect(() => {
    let timer;
    const run = async () => {
      const s = useStore.getState();
      if (!hasConsent("functional")) return useStore.setState({ autosaved: "off" });
      if (savedStatus() === "encrypted" && !s.password) return useStore.setState({ autosaved: "paused" });
      const ok = await save({ title: s.title, sheets: s.sheets, activeSheetId: s.activeSheetId }, s.password);
      useStore.setState({ autosaved: ok ? (s.password ? "enc" : "plain") : "off" });
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(run, 800);
    };
    const unsub = useStore.subscribe((s, prev) => {
      if (s.sheets !== prev.sheets || s.title !== prev.title || s.password !== prev.password) schedule();
    });
    window.addEventListener(CONSENT_EVENT, schedule);
    schedule();
    return () => {
      clearTimeout(timer);
      unsub();
      window.removeEventListener(CONSENT_EVENT, schedule);
    };
  }, []);
}
