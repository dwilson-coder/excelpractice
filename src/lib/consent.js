/**
 * Cookie / local-storage consent (GDPR + ePrivacy style).
 * - "necessary" is always on and only remembers your cookie choice.
 * - "functional" gates autosave of the workbook and view settings in this browser (localStorage).
 * - "analytics" / "marketing" are provided so any future third-party tool can be gated behind them;
 *   ExcelPractice does not currently load any.
 * Nothing optional is pre-selected. Choice, version and timestamp are stored in localStorage.
 */
export const CONSENT_KEY = "xp_cookie_consent";
export const CONSENT_VERSION = 1;
export const CONSENT_EVENT = "xp-consent-change";

export const CATEGORIES = [
  { id: "necessary", label: "Strictly necessary", required: true, description: "Remembers your cookie choices so we don't ask again. Stored on your device only; required for the site to work." },
  { id: "functional", label: "Functional / preferences", required: false, description: "Lets the spreadsheet autosave your workbook and remember settings (such as gridlines) in this browser's local storage. Without it, work is lost when you close the tab unless you save a file." },
  { id: "analytics", label: "Analytics", required: false, description: "Would let us measure how the site is used. ExcelPractice does not currently load any analytics tools; this switch will be honoured if that changes." },
  { id: "marketing", label: "Marketing", required: false, description: "Would allow advertising or social-media tracking. ExcelPractice does not currently use any; this switch will be honoured if that changes." },
];

export function readConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== CONSENT_VERSION || typeof parsed.choices !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveConsent(choices) {
  const record = {
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    choices: { necessary: true, functional: !!choices.functional, analytics: !!choices.analytics, marketing: !!choices.marketing },
  };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
  } catch {
    /* storage blocked — consent just won't persist */
  }
  if (!record.choices.functional) {
    try {
      ["xp_workbook", "xp_workbook_enc", "xp_settings"].forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: record }));
  return record;
}

export const hasConsent = (category) => category === "necessary" || !!readConsent()?.choices?.[category];
export const hasDecided = () => readConsent() !== null;
