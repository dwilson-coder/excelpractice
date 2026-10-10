import { Link } from "react-router-dom";

const UPDATED = "October 9, 2026";

function Page({ title, children }) {
  return (
    <article className="max-w-3xl mx-auto px-6 py-12 text-gray-700 leading-relaxed legal">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">{title}</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: {UPDATED}</p>
      {children}
    </article>
  );
}

const H = ({ children }) => <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-2">{children}</h2>;
const openCookies = () => window.dispatchEvent(new CustomEvent("xp-open-cookie-settings"));

export function Privacy() {
  return (
    <Page title="Privacy Policy">
      <p>
        ExcelPractice (“we”, “us”) is a free, browser-based spreadsheet operated by CodeBox LLC. This policy explains what information the site handles and the choices you have. The short version: <strong>your spreadsheets never leave your device</strong>.
      </p>

      <H>1. Your spreadsheet data</H>
      <p>
        All calculation, formatting, charting, pivot tables, import and export happen locally in your browser. We do not upload, receive, store or analyse the contents of your workbooks, and we have no accounts or servers that hold them.
      </p>

      <H>2. What is stored on your device</H>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Cookie choice</strong> (<code>xp_cookie_consent</code>, local storage): your consent decision, its version and timestamp. Strictly necessary; kept until you change it.</li>
        <li><strong>Autosaved workbook</strong> (<code>xp_workbook</code> or <code>xp_workbook_enc</code>) and <strong>view settings</strong> (<code>xp_settings</code>): stored only if you allow “Functional” storage. If you set a password, the workbook is encrypted with AES-256-GCM (key derived from your password using PBKDF2-SHA-256) before it is stored. We cannot recover a lost password.</li>
      </ul>
      <p className="mt-2">Withdrawing Functional consent deletes the autosaved workbook and settings immediately. You can also clear them from <em>Tools → Clear data saved in this browser</em>.</p>

      <H>3. Cookies and consent (EU/EEA/UK)</H>
      <p>
        On your first visit we ask for consent before storing anything that isn't strictly necessary. Nothing optional is pre-selected, rejecting is as easy as accepting, and you can change your choice at any time via <button type="button" onClick={openCookies} className="underline text-excel-green">Cookie settings</button> in the footer. Our legal basis is your consent (Art. 6(1)(a) GDPR) for optional storage and our legitimate interest (Art. 6(1)(f)) in remembering your choice.
      </p>
      <p className="mt-2">
        Categories: <em>Strictly necessary</em> (always on), <em>Functional</em> (autosave and preferences), <em>Analytics</em> and <em>Marketing</em>. ExcelPractice does not currently load any analytics or advertising tools; those switches exist so that, if that ever changes, nothing runs without your opt-in.
      </p>

      <H>4. Server logs and hosting</H>
      <p>
        The site is delivered by a static hosting provider (Netlify). Like any web host, it may process technical data such as your IP address, browser type and requested URL in standard server logs for security and delivery. We do not combine this with spreadsheet data, which we never receive.
      </p>

      <H>5. Third parties</H>
      <p>We do not sell or share personal data. Links to GitHub, Bluesky and LinkedIn in the footer lead to third-party sites with their own policies.</p>

      <H>6. Your rights</H>
      <p>
        Depending on where you live (for example under the GDPR or UK GDPR) you may have rights of access, rectification, erasure, restriction, portability and objection, and the right to withdraw consent at any time and to complain to your data-protection authority. Because we hold no personal data about you beyond what is described above, most of these can be exercised yourself by clearing your browser's site data.
      </p>

      <H>7. Children</H>
      <p>The site is not directed at children under 13 (or the age required by your country), and we do not knowingly collect their data.</p>

      <H>8. Changes</H>
      <p>If this policy changes materially we'll update the date above and, where required, ask for your consent again.</p>

      <H>9. Contact</H>
      <p>Questions or requests: open an issue via the GitHub link in the footer, or reach CodeBox LLC through <a className="underline text-excel-green" href="https://codeboxllc.net/" target="_blank" rel="noopener noreferrer">codeboxllc.net</a>.</p>

      <p className="mt-10 text-sm text-gray-500">See also our <Link className="underline" to="/terms">Terms of Service</Link>.</p>
    </Page>
  );
}

export function Terms() {
  return (
    <Page title="Terms of Service">
      <p>By using ExcelPractice (the “Service”) you agree to these terms. If you don't agree, please don't use it.</p>

      <H>1. The Service</H>
      <p>ExcelPractice is a free, browser-based spreadsheet for learning and everyday calculations. Features may change or be removed at any time.</p>

      <H>2. Your content</H>
      <p>You own your spreadsheets. They are processed on your device and are not transmitted to us. You are responsible for keeping backups (use File → Save) and for the passwords you set — encrypted data cannot be recovered without them.</p>

      <H>3. Acceptable use</H>
      <p>Don't use the Service to break the law, infringe others' rights, attempt to disrupt or reverse-engineer the hosting infrastructure, or probe it for vulnerabilities without permission.</p>

      <H>4. No professional advice; accuracy</H>
      <p>The formula engine aims to match Excel's behaviour but is not identical, and some Excel features (macros, external links, legacy .xls, charts or pivot tables inside imported files, merged cells and data beyond A1:Z100) are not supported. Verify important results independently. Don't rely on the Service for financial, legal, medical or safety-critical decisions.</p>

      <H>5. Intellectual property</H>
      <p>The site's code, design and branding belong to CodeBox LLC or its licensors. “Excel” and “Microsoft” are trademarks of Microsoft Corporation; ExcelPractice is not affiliated with or endorsed by Microsoft.</p>

      <H>6. Disclaimer of warranties</H>
      <p>The Service is provided “as is” and “as available”, without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement.</p>

      <H>7. Limitation of liability</H>
      <p>To the maximum extent permitted by law, CodeBox LLC will not be liable for indirect, incidental, special, consequential or punitive damages, or for loss of data, profits or goodwill, arising from your use of the Service. Nothing in these terms limits liability that cannot be limited by law.</p>

      <H>8. Changes and termination</H>
      <p>We may update these terms; continued use after an update means you accept it. We may suspend or discontinue the Service at any time.</p>

      <H>9. Governing law</H>
      <p>These terms are governed by the laws of the jurisdiction in which CodeBox LLC is organised, without regard to conflict-of-law rules, except where mandatory consumer-protection law of your country applies.</p>

      <H>10. Contact</H>
      <p>Open an issue via the GitHub link in the footer or visit <a className="underline text-excel-green" href="https://codeboxllc.net/" target="_blank" rel="noopener noreferrer">codeboxllc.net</a>.</p>

      <p className="mt-10 text-sm text-gray-500">See also our <Link className="underline" to="/privacy">Privacy Policy</Link>.</p>
    </Page>
  );
}
