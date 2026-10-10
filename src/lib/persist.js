/** Browser-local autosave (gated by "functional" consent; optionally AES-GCM encrypted). */
import { hasConsent } from "./consent";
import { encryptBytes, decryptBytes, toBase64, fromBase64 } from "./crypto";
import { normalizeWorkbook } from "./model";

const PLAIN = "xp_workbook";
const ENC = "xp_workbook_enc";
const SETTINGS = "xp_settings";

export const serialize = (doc) => JSON.stringify({ v: 1, title: doc.title, sheets: doc.sheets, activeSheetId: doc.activeSheetId });

export function savedStatus() {
  try {
    if (localStorage.getItem(ENC)) return "encrypted";
    if (localStorage.getItem(PLAIN)) return "plain";
  } catch {
    /* ignore */
  }
  return "none";
}

export function loadPlain() {
  try {
    const raw = localStorage.getItem(PLAIN);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { ...normalizeWorkbook(parsed), title: parsed.title };
  } catch {
    return null;
  }
}

export async function loadEncrypted(password) {
  const b64 = localStorage.getItem(ENC);
  if (!b64) return null;
  const bytes = await decryptBytes(fromBase64(b64), password);
  const parsed = JSON.parse(new TextDecoder().decode(bytes));
  return { ...normalizeWorkbook(parsed), title: parsed.title };
}

export async function save(doc, password) {
  if (!hasConsent("functional")) return false;
  try {
    if (password) {
      localStorage.setItem(ENC, toBase64(await encryptBytes(new TextEncoder().encode(serialize(doc)), password)));
      localStorage.removeItem(PLAIN);
    } else {
      localStorage.setItem(PLAIN, serialize(doc));
      localStorage.removeItem(ENC);
    }
    return true;
  } catch {
    return false; // quota exceeded or storage blocked
  }
}

export function clearSaved() {
  try {
    [PLAIN, ENC].forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export function loadSettings() {
  if (!hasConsent("functional")) return {};
  try {
    return JSON.parse(localStorage.getItem(SETTINGS) || "{}");
  } catch {
    return {};
  }
}
export function saveSettings(s) {
  if (!hasConsent("functional")) return;
  try {
    localStorage.setItem(SETTINGS, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
