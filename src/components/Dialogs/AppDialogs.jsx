import { useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { useStore } from "../../store";
import { openFile, saveEncrypted } from "../../lib/actions";
import { loadEncrypted, clearSaved, savedStatus } from "../../lib/persist";
import Modal, { Field } from "./Modal";

export function PasswordDialog({ mode, file }) {
  const s = useStore();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const title = mode === "export" ? "Encrypt & download" : mode === "unlock" ? "Unlock saved workbook" : "Password required";
  const submit = async () => {
    if (!pw) return;
    setBusy(true);
    setErr("");
    try {
      if (mode === "export") {
        if (pw.length < 8) throw new Error("Use at least 8 characters.");
        s.setPassword(pw);
        s.closeDialog();
        await saveEncrypted(pw);
      } else if (mode === "unlock") {
        const wb = await loadEncrypted(pw);
        s.replaceWorkbook(wb, wb.title);
        s.setPassword(pw);
        s.closeDialog();
      } else {
        s.closeDialog();
        await openFile(file, pw);
      }
    } catch (e) {
      setErr(e.message?.includes("8 characters") ? e.message : "Wrong password, or the data is damaged.");
      setBusy(false);
    }
  };
  return (
    <Modal title={title} onClose={s.closeDialog}
      footer={<>
        {mode === "unlock" && <button className="btn" onClick={() => { if (window.confirm("This permanently deletes the encrypted workbook saved in this browser. Continue?")) { clearSaved(); s.closeDialog(); } }}>Delete saved copy</button>}
        <button className="btn" onClick={s.closeDialog}>{mode === "unlock" ? "Start blank" : "Cancel"}</button>
        <button className="btn primary" disabled={!pw || busy} onClick={submit}>{busy ? "Working…" : mode === "export" ? "Encrypt" : "Unlock"}</button>
      </>}>
      <p className="muted">
        {mode === "export" ? "Your workbook is encrypted in your browser with AES-256 before it's downloaded. We never see the password and cannot recover it." : mode === "unlock" ? "Your autosaved workbook is encrypted. Enter its password to continue." : `“${file?.name}” is encrypted. Enter its password.`}
      </p>
      <Field label="Password">
        <input className="xs-input" type="password" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
      </Field>
      {err && <p className="xs-error" role="alert">{err}</p>}
    </Modal>
  );
}

export function PrivacyDialog() {
  const s = useStore();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const status = savedStatus();
  const mismatch = pw && pw2 && pw !== pw2;
  const enable = () => {
    if (pw.length < 8) return s.toast("Use at least 8 characters.", "error");
    if (pw !== pw2) return s.toast("Passwords don't match.", "error");
    s.setPassword(pw);
    s.toast("Encrypted autosave is on. Remember your password — it can't be recovered.");
    setPw("");
    setPw2("");
  };
  return (
    <Modal title="Privacy & security" onClose={s.closeDialog} wide footer={<button className="btn primary" onClick={s.closeDialog}>Done</button>}>
      <div className="xs-callout"><ShieldCheck size={18} /><p>Your spreadsheet is processed <b>entirely in your browser</b>. Nothing is uploaded to a server, and there are no ads or trackers.</p></div>
      <h3 className="xs-h3"><Lock size={14} /> Password-protect autosave</h3>
      {s.password ? (
        <>
          <p className="muted">Encrypted autosave is <b>on</b> (AES-256-GCM, key derived from your password with PBKDF2). You'll be asked for the password when you come back.</p>
          <button className="btn" onClick={() => { if (window.confirm("Turn off encryption? Your workbook will be autosaved unencrypted in this browser.")) s.setPassword(null); }}>Turn off encryption</button>
        </>
      ) : (
        <>
          <p className="muted">Encrypt what this browser stores. {status === "plain" ? "Currently your autosave is stored unencrypted." : ""}</p>
          <div className="xs-row">
            <Field label="Password (8+ characters)"><input className="xs-input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
            <Field label="Confirm"><input className="xs-input" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
          </div>
          {mismatch && <p className="xs-error">Passwords don't match.</p>}
          <button className="btn primary" onClick={enable} disabled={!pw || !pw2}>Enable encrypted autosave</button>
        </>
      )}
      <h3 className="xs-h3">Other controls</h3>
      <div className="xs-btnrow">
        <button className="btn" onClick={() => saveEncrypted()}>Download encrypted copy (.xpenc)</button>
        <button className="btn" onClick={() => window.dispatchEvent(new CustomEvent("xp-open-cookie-settings"))}>Cookie settings</button>
        <button className="btn" onClick={() => { if (window.confirm("Delete the workbook autosaved in this browser?")) { clearSaved(); s.toast("Saved browser data cleared."); } }}>Clear saved data</button>
      </div>
      <p className="muted">Tip: encrypted files can only be opened here (File → Open) with the password. Lose the password and the data is gone — that's the point.</p>
    </Modal>
  );
}

export function RenameDialog() {
  const s = useStore();
  const [name, setName] = useState(s.title);
  const ok = () => (name.trim() && s.setTitle(name.trim()), s.closeDialog());
  return (
    <Modal title="Rename workbook" onClose={s.closeDialog} footer={<><button className="btn" onClick={s.closeDialog}>Cancel</button><button className="btn primary" onClick={ok}>OK</button></>}>
      <Field label="Name (used for downloads)"><input className="xs-input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ok()} /></Field>
    </Modal>
  );
}

const SHORTCUTS = [
  ["Type in any selected cell", "Starts editing immediately"],
  ["F2 / double-click", "Edit in place (arrow keys move the caret)"],
  ["Enter / Shift+Enter", "Commit and move down / up"],
  ["Tab / Shift+Tab", "Commit and move right / left"],
  ["Esc", "Cancel edit"],
  ["Arrow keys (+Shift)", "Move (extend selection)"],
  ["Ctrl+Arrow", "Jump to edge of data"],
  ["Ctrl+A", "Select all"],
  ["Ctrl+C / X / V", "Copy / cut / paste"],
  ["Ctrl+Z / Ctrl+Y", "Undo / redo"],
  ["Ctrl+B / I / U", "Bold / italic / underline"],
  ["Ctrl+D / Ctrl+R", "Fill down / right"],
  ["Ctrl+F / Ctrl+H", "Find / replace"],
  ["Ctrl+1", "Format cells"],
  ["Ctrl+S / O / P", "Save .xlsx / open / print"],
  ["Delete", "Clear contents"],
  ["Click cells while typing =", "Insert cell references"],
];

export function ShortcutsDialog() {
  const close = useStore((s) => s.closeDialog);
  return (
    <Modal title="Keyboard shortcuts" onClose={close} footer={<button className="btn primary" onClick={close}>Close</button>}>
      <table className="xs-keys"><tbody>{SHORTCUTS.map(([k, d]) => <tr key={k}><th scope="row">{k}</th><td>{d}</td></tr>)}</tbody></table>
    </Modal>
  );
}
