import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import { CATEGORIES, readConsent, saveConsent, hasDecided } from "../../lib/consent";

export const OPEN_EVENT = "xp-open-cookie-settings";

function Toggle({ id, checked, disabled, onChange, label, description }) {
  return (
    <div className="ck-row">
      <div>
        <label htmlFor={`ck-${id}`}>{label}{disabled && <em> · always on</em>}</label>
        <p id={`ck-${id}-d`}>{description}</p>
      </div>
      <input id={`ck-${id}`} type="checkbox" role="switch" className="ck-switch" checked={checked} disabled={disabled} aria-describedby={`ck-${id}-d`} onChange={(e) => onChange(e.target.checked)} />
    </div>
  );
}

function SettingsModal({ onClose }) {
  const current = readConsent()?.choices;
  const [choices, setChoices] = useState({ necessary: true, functional: !!current?.functional, analytics: !!current?.analytics, marketing: !!current?.marketing });
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.querySelector("button")?.focus();
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => (window.removeEventListener("keydown", esc), prev?.focus?.());
  }, [onClose]);
  const save = (c) => (saveConsent(c), onClose());
  return (
    <div className="ck-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ck-modal" role="dialog" aria-modal="true" aria-labelledby="ck-title" ref={ref}>
        <h2 id="ck-title">Cookie &amp; storage settings</h2>
        <p className="ck-lead">
          Choose what ExcelPractice may store on your device. Nothing optional is on until you switch it on, and you can change this at any time from the footer. See our <Link to="/privacy" onClick={onClose}>Privacy Policy</Link>.
        </p>
        {CATEGORIES.map((c) => (
          <Toggle key={c.id} id={c.id} label={c.label} description={c.description} checked={c.required || choices[c.id]} disabled={c.required} onChange={(v) => setChoices((x) => ({ ...x, [c.id]: v }))} />
        ))}
        <div className="ck-actions">
          <button className="btn" onClick={() => save({ functional: false, analytics: false, marketing: false })}>Reject all optional</button>
          <button className="btn" onClick={() => save({ functional: true, analytics: true, marketing: true })}>Accept all</button>
          <button className="btn primary" onClick={() => save(choices)}>Save my choices</button>
        </div>
      </div>
    </div>
  );
}

/** First-visit banner (EU/GDPR style: reject is as easy as accept) + the settings modal. */
export default function CookieConsent() {
  const [banner, setBanner] = useState(false);
  const [settings, setSettings] = useState(false);

  useEffect(() => {
    setBanner(!hasDecided()); // only on the first visit (until a choice is stored)
    const open = () => (setSettings(true), setBanner(false));
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  const choose = (c) => (saveConsent(c), setBanner(false));

  return (
    <>
      {banner && (
        <div className="ck-banner" role="region" aria-label="Cookie consent">
          <Cookie size={20} aria-hidden="true" />
          <div className="ck-text">
            <strong>Your privacy, your choice</strong>
            <p>
              We use only essential storage by default. With your permission we can also save your workbook in this browser so it's there when you return. Details in our <Link to="/privacy">Privacy Policy</Link>.
            </p>
          </div>
          <div className="ck-actions">
            <button className="btn" onClick={() => choose({ functional: false, analytics: false, marketing: false })}>Reject optional</button>
            <button className="btn" onClick={() => (setSettings(true), setBanner(false))}>Customize</button>
            <button className="btn primary" onClick={() => choose({ functional: true, analytics: true, marketing: true })}>Accept all</button>
          </div>
        </div>
      )}
      {settings && <SettingsModal onClose={() => { setSettings(false); setBanner(false); }} />}
    </>
  );
}
