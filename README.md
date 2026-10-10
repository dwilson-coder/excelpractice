# ExcelPractice

![ExcelPractice banner](https://raw.githubusercontent.com/dwilson-coder/excelpractice/refs/heads/main/og.jpg)

ExcelPractice is a browser-based spreadsheet for practicing Excel formulas and data workflows. Edit cells, try formulas, and explore pivot tables without installing Excel or creating an account.

## Features

**Spreadsheet**
- 100-row by 26-column (A–Z) grid that scrolls in both directions; drag column/row borders to resize (double-click a column border to auto-fit)
- Type directly into the selected cell (no double-click), F2 / double-click to edit in place, Enter/Tab navigation
- Click-and-drag or Shift+click multi-cell selection; click cells while typing a formula to insert references
- Multiple sheets (add, rename, duplicate, delete) with cross-sheet references such as `=Sheet2!A1`
- Undo (Ctrl+Z) / redo (Ctrl+Y), copy / cut / paste (also to and from Excel), fill down/right, find & replace, right-click context menu

**Formulas** — nested, with absolute refs and error values: `SUM AVERAGE COUNT COUNTA MAX MIN MEDIAN PRODUCT ROUND INT ABS SQRT POWER MOD`, `IF IFS IFERROR AND OR NOT`, `SUMIF COUNTIF AVERAGEIF SUMPRODUCT`, text (`CONCAT LEFT RIGHT MID LEN UPPER LOWER PROPER TRIM SUBSTITUTE FIND SEARCH TEXT VALUE`), lookup (`VLOOKUP HLOOKUP XLOOKUP INDEX MATCH`), date (`TODAY NOW DATE YEAR MONTH DAY`). The formula bar has an **Output cell** field to run a formula and place the result in any cell or range.

**Menus & formatting** — File / Edit / View / Insert / Format / Data / Tools / Help menus plus a toolbar: font family and size, bold / italic / underline / strikethrough, text and fill colour, alignment, wrap, number formats (currency, percent, date, decimals), borders, row and column insert/delete/hide.

**Data tools** — sort, remove duplicates, trim spaces, data validation (list dropdowns, number/length rules), conditional formatting (value rules, duplicates, colour scales), charts (column, line, area, pie), and pivot tables that can be inserted as a new sheet.

**Excel compatibility** — open and save `.xlsx` (values, formulas, number formats, fonts, fills, borders, widths, data validation, conditional formatting), import/export CSV/TSV, JSON, and print. Charts, pivot tables, merged cells, macros and cells beyond A1:Z100 in imported files are not carried over (you're warned when this happens).

**Privacy** — everything runs in your browser. Autosave to local storage only with your consent, optionally encrypted with a password (AES-256-GCM, PBKDF2). Encrypted `.xpenc` export. First-visit cookie banner with EU-style granular settings (reopen from the footer), plus Privacy Policy and Terms pages.

## Getting Started

You need Node.js and npm installed.

```bash
git clone https://github.com/dwilson-coder/excelpractice.git
cd excelpractice
npm install
npm run dev
```

Open the local URL printed by Vite in your browser.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Build the app for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run Oxlint |

## Formula Examples

Enter formulas in a cell or the formula bar:

```text
=SUM(A1:A10)
=AVERAGE(B1:B10)
=VLOOKUP("Alice", A2:D10, 3, FALSE)
=XLOOKUP("Bob", A2:A10, D2:D10, "Not Found")
```

The formula reference page in the app includes examples for arithmetic, aggregate functions, lookups, and pivot tables.

## Tech Stack
## Netlify Deployment

The Netlify CLI can create or link the site for local deployment:

```bash
npx netlify login
npx netlify init
npm run build
npx netlify deploy --no-build --dir=dist
```

To publish a production deploy manually, add `--prod` to the deploy command.

GitHub Actions runs lint and build checks on pull requests and deploys production when changes are pushed to `main`. Add these repository secrets under **Settings → Secrets and variables → Actions**:

- `NETLIFY_AUTH_TOKEN`: a Netlify personal access token
- `NETLIFY_SITE_ID`: the site's API ID

## Tech Stack

React, Vite, Tailwind CSS, Zustand, and Framer Motion. XLSX, ZIP and encryption are implemented without extra dependencies (Web Crypto / CompressionStream).
