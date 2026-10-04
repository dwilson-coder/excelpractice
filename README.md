# ExcelPractice

![ExcelPractice banner](https://raw.githubusercontent.com/dwilson-coder/excelpractice/refs/heads/main/og.jpg)

ExcelPractice is a browser-based spreadsheet for practicing Excel formulas and data workflows. Edit cells, try formulas, and explore pivot tables without installing Excel or creating an account.

## Features

- 50-row by 26-column editable spreadsheet grid
- Multiple sheets for organizing practice data
- Formula evaluation for cell references, arithmetic, and ranges
- Supported functions: `SUM`, `AVERAGE`, `COUNT`, `MAX`, `MIN`, `ROUND`, `VLOOKUP`, and `XLOOKUP`
- Pivot table configuration with row and column fields, value fields, and aggregation options
- Keyboard navigation and an interactive ribbon
- Formula reference with syntax examples

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

React, Vite, Tailwind CSS, Zustand, and TanStack Virtual.
