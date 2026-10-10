/**
 * Client-side encryption: AES-256-GCM, key derived with PBKDF2-SHA256 (310k iterations).
 * Nothing here leaves the browser. A lost password cannot be recovered.
 */
const ITER = 310_000;
const MAGIC = new TextEncoder().encode("XPENC1");

async function deriveKey(password, salt) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptBytes(bytes, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes));
  const out = new Uint8Array(MAGIC.length + 28 + ct.length);
  out.set(MAGIC, 0);
  out.set(salt, MAGIC.length);
  out.set(iv, MAGIC.length + 16);
  out.set(ct, MAGIC.length + 28);
  return out;
}

export async function decryptBytes(data, password) {
  if (new TextDecoder().decode(data.slice(0, MAGIC.length)) !== "XPENC1") throw new Error("Not an encrypted ExcelPractice file.");
  const salt = data.slice(MAGIC.length, MAGIC.length + 16);
  const iv = data.slice(MAGIC.length + 16, MAGIC.length + 28);
  const key = await deriveKey(password, salt);
  try {
    return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data.slice(MAGIC.length + 28)));
  } catch {
    throw new Error("Wrong password, or the file is damaged.");
  }
}

export const toBase64 = (u8) => {
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
};
export const fromBase64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
