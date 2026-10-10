/**
 * XLSX import/export with no third-party dependencies.
 * Round-trips: values, formulas, number formats, fonts, fills, alignment, borders, column widths,
 * row heights, hidden rows, data validation (list/number/length) and conditional formatting
 * (cell value, text contains, duplicates, 2-colour scale).
 * Dropped on import: charts, images, pivot caches, macros, merged cells, cells outside A1:Z100.
 */
import { zip, unzip, bytesToText } from "./zip";
import { parseXml, kid, kids, escapeXml } from "./xml";
import { createEvaluator, isError, parseLiteral, shiftFormula, lettersToCol, toCellRef } from "../utils/formulaEngine";
import { numFmtCode, parseNumFmt } from "../utils/format";
import { ROWS, COLS, DEFAULT_FONT, DEFAULT_FONT_SIZE } from "../utils/constants";
import { createSheet, createWorkbook, key, unkey, newId } from "./model";

const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

const OP_TO_XL = { gt: "greaterThan", lt: "lessThan", eq: "equal", ne: "notEqual", ge: "greaterThanOrEqual", le: "lessThanOrEqual", between: "between", notBetween: "notBetween" };
const XL_TO_OP = Object.fromEntries(Object.entries(OP_TO_XL).map(([a, b]) => [b, a]));
const argb = (hex) => "FF" + hex.replace("#", "").toUpperCase();
const hexFromArgb = (v) => (v ? "#" + v.slice(-6).toLowerCase() : undefined);

// ═════════════════════════════ WRITER ═════════════════════════════════
export async function workbookToXlsx(wb) {
  const evaluator = createEvaluator(wb.sheets);
  const fonts = [{ xml: `<font><sz val="${DEFAULT_FONT_SIZE}"/><name val="${DEFAULT_FONT}"/></font>` }];
  const fills = [{ xml: `<fill><patternFill patternType="none"/></fill>` }, { xml: `<fill><patternFill patternType="gray125"/></fill>` }];
  const borders = [{ xml: `<border><left/><right/><top/><bottom/><diagonal/></border>` }];
  const numFmts = new Map();
  const xfs = [`<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>`];
  const xfIndex = new Map();
  const dxfs = [];
  const dxfIndex = new Map();

  const intern = (list, xml) => {
    let i = list.findIndex((x) => x.xml === xml);
    if (i < 0) i = list.push({ xml }) - 1;
    return i;
  };

  function xfFor(style) {
    if (!style || !Object.keys(style).length) return 0;
    const k = JSON.stringify(style);
    if (xfIndex.has(k)) return xfIndex.get(k);
    const hasFont = style.b || style.i || style.u || style.s || style.color || style.fs || style.ff;
    const fontXml =
      "<font>" + (style.b ? "<b/>" : "") + (style.i ? "<i/>" : "") + (style.s ? "<strike/>" : "") + (style.u ? "<u/>" : "") +
      `<sz val="${style.fs || DEFAULT_FONT_SIZE}"/>` + (style.color ? `<color rgb="${argb(style.color)}"/>` : "") +
      `<name val="${escapeXml(style.ff || DEFAULT_FONT)}"/></font>`;
    const fontId = hasFont ? intern(fonts, fontXml) : 0;
    const fillId = style.bg ? intern(fills, `<fill><patternFill patternType="solid"><fgColor rgb="${argb(style.bg)}"/><bgColor indexed="64"/></patternFill></fill>`) : 0;
    const bd = style.bd;
    const side = (n, on) => (on ? `<${n} style="thin"><color auto="1"/></${n}>` : `<${n}/>`);
    const borderId = bd ? intern(borders, `<border>${side("left", bd.l)}${side("right", bd.r)}${side("top", bd.t)}${side("bottom", bd.b)}<diagonal/></border>`) : 0;
    let numFmtId = 0;
    const code = numFmtCode(style);
    if (code !== "General") {
      if (code === "@") numFmtId = 49;
      else {
        if (!numFmts.has(code)) numFmts.set(code, 164 + numFmts.size);
        numFmtId = numFmts.get(code);
      }
    }
    const align = style.ha || style.wrap ? `<alignment${style.ha ? ` horizontal="${style.ha}"` : ""}${style.wrap ? ' wrapText="1"' : ""}/>` : "";
    const xml =
      `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"` +
      `${numFmtId ? ' applyNumberFormat="1"' : ""}${fontId ? ' applyFont="1"' : ""}${fillId ? ' applyFill="1"' : ""}` +
      `${borderId ? ' applyBorder="1"' : ""}${align ? ' applyAlignment="1">' + align + "</xf>" : "/>"}`;
    xfs.push(xml);
    xfIndex.set(k, xfs.length - 1);
    return xfs.length - 1;
  }

  function dxfFor(style = {}) {
    const k = JSON.stringify(style);
    if (dxfIndex.has(k)) return dxfIndex.get(k);
    const xml =
      "<dxf>" +
      (style.color || style.b ? `<font>${style.b ? "<b/>" : ""}${style.color ? `<color rgb="${argb(style.color)}"/>` : ""}</font>` : "") +
      (style.bg ? `<fill><patternFill patternType="solid"><fgColor rgb="${argb(style.bg)}"/><bgColor rgb="${argb(style.bg)}"/></patternFill></fill>` : "") +
      "</dxf>";
    dxfs.push(xml);
    dxfIndex.set(k, dxfs.length - 1);
    return dxfs.length - 1;
  }

  const sheetXmls = wb.sheets.map((sheet) => {
    const rowsMap = new Map();
    const touch = (r) => {
      if (!rowsMap.has(r)) rowsMap.set(r, new Map());
      return rowsMap.get(r);
    };
    for (const k of new Set([...Object.keys(sheet.cells), ...Object.keys(sheet.styles)])) {
      const [r, c] = unkey(k);
      touch(r).set(c, k);
    }
    for (const r of Object.keys(sheet.rowHeights)) touch(Number(r));
    for (const r of Object.keys(sheet.hiddenRows)) touch(Number(r));

    const rowXml = [...rowsMap.keys()]
      .sort((a, b) => a - b)
      .map((r) => {
        const inRow = rowsMap.get(r);
        const cs = [...inRow.keys()]
          .sort((a, b) => a - b)
          .map((c) => {
            const k = inRow.get(c);
            const raw = sheet.cells[k];
            let style = sheet.styles[k];
            const ref = toCellRef(r, c);
            if (raw === undefined || raw === "") return style ? `<c r="${ref}" s="${xfFor(style)}"/>` : "";
            if (typeof raw === "string" && raw[0] === "=" && raw.length > 1) {
              const v = evaluator.value(sheet.id, r, c);
              const f = `<f>${escapeXml(raw.slice(1))}</f>`;
              const s = xfFor(style);
              const sa = s ? ` s="${s}"` : "";
              if (v === null || v === undefined) return `<c r="${ref}"${sa}>${f}</c>`;
              if (isError(v)) return `<c r="${ref}"${sa} t="e">${f}<v>${escapeXml(v.code)}</v></c>`;
              if (typeof v === "boolean") return `<c r="${ref}"${sa} t="b">${f}<v>${v ? 1 : 0}</v></c>`;
              if (typeof v === "number") return `<c r="${ref}"${sa}>${f}<v>${v}</v></c>`;
              return `<c r="${ref}"${sa} t="str">${f}<v>${escapeXml(v)}</v></c>`;
            }
            const forcedText = typeof raw === "string" && raw[0] === "'";
            const lit = parseLiteral(raw);
            if (typeof lit === "string" || forcedText) {
              const s = xfFor(style);
              return `<c r="${ref}"${s ? ` s="${s}"` : ""} t="inlineStr"><is><t xml:space="preserve">${escapeXml(forcedText ? raw.slice(1) : lit)}</t></is></c>`;
            }
            if (/^\s*[-+]?(\d+\.?\d*|\.\d+)%\s*$/.test(String(raw)) && !style?.nf) {
              style = { ...style, nf: "percent", dec: (String(raw).split(".")[1] || "").replace(/\D/g, "").length };
            }
            const s = xfFor(style);
            const sa = s ? ` s="${s}"` : "";
            if (typeof lit === "boolean") return `<c r="${ref}"${sa} t="b"><v>${lit ? 1 : 0}</v></c>`;
            return `<c r="${ref}"${sa}><v>${lit}</v></c>`;
          })
          .join("");
        const ht = sheet.rowHeights[r];
        return `<row r="${r + 1}"${ht ? ` ht="${(ht * 0.75).toFixed(2)}" customHeight="1"` : ""}${sheet.hiddenRows[r] ? ' hidden="1"' : ""}>${cs}</row>`;
      })
      .join("");

    const colEntries = Object.entries(sheet.colWidths).map(([c, px]) => [Number(c), px]).sort((a, b) => a[0] - b[0]);
    const cols = colEntries.length ? `<cols>${colEntries.map(([c, px]) => `<col min="${c + 1}" max="${c + 1}" width="${Math.max((px - 5) / 7, 1).toFixed(2)}" customWidth="1"/>`).join("")}</cols>` : "";

    let cf = "";
    sheet.cf.forEach((rule, i) => {
      const sq = rule.range.toUpperCase();
      const top = sq.split(":")[0];
      const pr = i + 1;
      const f = (v) => (isNaN(Number(v)) || v === "" ? `"${escapeXml(v)}"` : v);
      let inner = "";
      if (rule.type === "cellIs") inner = `<cfRule type="cellIs" dxfId="${dxfFor(rule.style)}" priority="${pr}" operator="${OP_TO_XL[rule.op] || "equal"}"><formula>${f(rule.v1)}</formula>${rule.op === "between" ? `<formula>${f(rule.v2)}</formula>` : ""}</cfRule>`;
      else if (rule.type === "text") inner = `<cfRule type="containsText" dxfId="${dxfFor(rule.style)}" priority="${pr}" operator="containsText" text="${escapeXml(rule.v1)}"><formula>NOT(ISERROR(SEARCH("${escapeXml(rule.v1)}",${top})))</formula></cfRule>`;
      else if (rule.type === "duplicates") inner = `<cfRule type="duplicateValues" dxfId="${dxfFor(rule.style)}" priority="${pr}"/>`;
      else if (rule.type === "scale") {
        const [lo, hi] = rule.colors || ["#ffffff", "#63be7b"];
        inner = `<cfRule type="colorScale" priority="${pr}"><colorScale><cfvo type="min"/><cfvo type="max"/><color rgb="${argb(lo)}"/><color rgb="${argb(hi)}"/></colorScale></cfRule>`;
      }
      if (inner) cf += `<conditionalFormatting sqref="${sq}">${inner}</conditionalFormatting>`;
    });

    const dv = sheet.validations.length
      ? `<dataValidations count="${sheet.validations.length}">${sheet.validations
          .map((v) => {
            const f1 = v.type === "list" ? `"${escapeXml(v.list || "")}"` : escapeXml(v.v1 ?? "");
            const f2 = v.op === "between" || v.op === "notBetween" ? `<formula2>${escapeXml(v.v2 ?? "")}</formula2>` : "";
            return `<dataValidation type="${v.type}"${v.type !== "list" ? ` operator="${OP_TO_XL[v.op] || "between"}"` : ""} allowBlank="1" showInputMessage="1" showErrorMessage="1"${v.message ? ` error="${escapeXml(v.message)}"` : ""} sqref="${v.range.toUpperCase()}"><formula1>${f1}</formula1>${f2}</dataValidation>`;
          })
          .join("")}</dataValidations>`
      : "";

    const view = sheet.showGrid === false ? `<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>` : "";
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS}" xmlns:r="${REL}">${view}<sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${rowXml}</sheetData>${cf}${dv}<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;
  });

  const numFmtXml = numFmts.size ? `<numFmts count="${numFmts.size}">${[...numFmts].map(([code, id]) => `<numFmt numFmtId="${id}" formatCode="${escapeXml(code)}"/>`).join("")}</numFmts>` : "";
  const styles =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${NS}">${numFmtXml}` +
    `<fonts count="${fonts.length}">${fonts.map((f) => f.xml).join("")}</fonts>` +
    `<fills count="${fills.length}">${fills.map((f) => f.xml).join("")}</fills>` +
    `<borders count="${borders.length}">${borders.map((f) => f.xml).join("")}</borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs>` +
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
    `<dxfs count="${dxfs.length}">${dxfs.join("")}</dxfs></styleSheet>`;

  const safeName = (n) => escapeXml(n.replace(/[\\/?*[\]:]/g, "_").slice(0, 31) || "Sheet");
  const workbookXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}" xmlns:r="${REL}"><bookViews><workbookView/></bookViews><sheets>` +
    wb.sheets.map((s, i) => `<sheet name="${safeName(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
    `</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`;
  const wbRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    wb.sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
    `<Relationship Id="rId${wb.sheets.length + 1}" Type="${REL}/styles" Target="styles.xml"/></Relationships>`;
  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    wb.sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

  return zip([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rootRels },
    { name: "xl/workbook.xml", data: workbookXml },
    { name: "xl/_rels/workbook.xml.rels", data: wbRels },
    { name: "xl/styles.xml", data: styles },
    ...sheetXmls.map((x, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: x })),
  ]);
}

// ═════════════════════════════ READER ═════════════════════════════════
const THEME = ["FFFFFF", "000000", "E7E6E6", "44546A", "4472C4", "ED7D31", "A5A5A5", "FFC000", "5B9BD5", "70AD47"];
function colorOf(node) {
  if (!node) return undefined;
  const a = node.attrs;
  if (a.rgb) return hexFromArgb(a.rgb);
  if (a.theme !== undefined) {
    let hex = THEME[Number(a.theme)] ?? "000000";
    const tint = parseFloat(a.tint || "0");
    if (tint) {
      const ch = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
      hex = ch.map((v) => Math.round(tint > 0 ? v + (255 - v) * tint : v * (1 + tint)).toString(16).padStart(2, "0")).join("");
    }
    return "#" + hex.toLowerCase();
  }
  return undefined;
}

function readStyles(root) {
  const numFmts = {};
  for (const n of kids(kid(root, "numFmts"), "numFmt")) numFmts[n.attrs.numFmtId] = n.attrs.formatCode;
  const fonts = kids(kid(root, "fonts"), "font").map((f) => ({
    b: !!kid(f, "b") && kid(f, "b").attrs.val !== "0",
    i: !!kid(f, "i") && kid(f, "i").attrs.val !== "0",
    s: !!kid(f, "strike"),
    u: !!kid(f, "u") && kid(f, "u").attrs.val !== "none",
    fs: kid(f, "sz") ? parseFloat(kid(f, "sz").attrs.val) : undefined,
    ff: kid(f, "name")?.attrs.val,
    color: colorOf(kid(f, "color")),
  }));
  const fills = kids(kid(root, "fills"), "fill").map((f) => {
    const p = kid(f, "patternFill");
    return p && p.attrs.patternType === "solid" ? colorOf(kid(p, "fgColor")) : undefined;
  });
  const borders = kids(kid(root, "borders"), "border").map((b) => {
    const on = (n) => !!kid(b, n)?.attrs.style;
    const bd = { l: on("left"), r: on("right"), t: on("top"), b: on("bottom") };
    return bd.l || bd.r || bd.t || bd.b ? bd : undefined;
  });
  const baseFont = fonts[0] || {};
  const xfs = kids(kid(root, "cellXfs"), "xf").map((xf, idx) => {
    if (idx === 0) return {};
    const s = {};
    const f = fonts[Number(xf.attrs.fontId)] || {};
    if (f.b) s.b = true;
    if (f.i) s.i = true;
    if (f.u) s.u = true;
    if (f.s) s.s = true;
    if (f.fs && f.fs !== (baseFont.fs ?? DEFAULT_FONT_SIZE)) s.fs = f.fs;
    if (f.ff && f.ff !== baseFont.ff) s.ff = f.ff;
    if (f.color && f.color !== "#000000") s.color = f.color;
    const bg = fills[Number(xf.attrs.fillId)];
    if (bg) s.bg = bg;
    const bd = borders[Number(xf.attrs.borderId)];
    if (bd) s.bd = bd;
    const al = kid(xf, "alignment");
    if (al?.attrs.horizontal && ["left", "center", "right"].includes(al.attrs.horizontal)) s.ha = al.attrs.horizontal;
    if (al?.attrs.wrapText === "1") s.wrap = true;
    Object.assign(s, parseNumFmt(Number(xf.attrs.numFmtId || 0), numFmts));
    return s;
  });
  const dxfs = kids(kid(root, "dxfs"), "dxf").map((d) => {
    const s = {};
    const f = kid(d, "font");
    if (f && kid(f, "b")) s.b = true;
    const c = colorOf(kid(f, "color"));
    if (c) s.color = c;
    const p = kid(kid(d, "fill"), "patternFill");
    const bg = colorOf(kid(p, "bgColor")) || colorOf(kid(p, "fgColor"));
    if (bg) s.bg = bg;
    return s;
  });
  return { xfs, dxfs };
}

const textOf = (n) => {
  if (!n) return "";
  if (n.name === "t") return n.text;
  return n.children.filter((c) => c.name !== "rPh" && c.name !== "phoneticPr").map(textOf).join("");
};

function parseSheetXml(root, shared, styles, name, warnings) {
  const sheet = createSheet(name);
  let dropped = 0;
  const sharedMasters = new Map();

  for (const col of kids(kid(root, "cols"), "col")) {
    const min = Number(col.attrs.min) - 1;
    const max = Number(col.attrs.max) - 1;
    const w = parseFloat(col.attrs.width);
    if (!isNaN(w) && col.attrs.hidden !== "1") for (let c = min; c <= Math.min(max, COLS - 1); c++) sheet.colWidths[c] = Math.round(w * 7 + 5);
  }

  for (const row of kids(kid(root, "sheetData"), "row")) {
    const r = Number(row.attrs.r) - 1;
    if (r >= ROWS) {
      if (row.children.length) dropped++;
      continue;
    }
    if (row.attrs.ht && row.attrs.customHeight === "1") sheet.rowHeights[r] = Math.round(parseFloat(row.attrs.ht) / 0.75);
    if (row.attrs.hidden === "1") sheet.hiddenRows[r] = true;
    for (const c of kids(row, "c")) {
      const m = c.attrs.r.match(/^([A-Z]+)(\d+)$/);
      if (!m) continue;
      const col = lettersToCol(m[1]);
      if (col >= COLS) {
        dropped++;
        continue;
      }
      const k = key(r, col);
      const style = styles.xfs[Number(c.attrs.s || 0)];
      if (style && Object.keys(style).length) sheet.styles[k] = { ...style };
      const f = kid(c, "f");
      const v = kid(c, "v");
      let raw;
      if (f) {
        if (f.attrs.t === "shared") {
          if (f.text) sharedMasters.set(f.attrs.si, { text: f.text, r, c: col });
          const master = sharedMasters.get(f.attrs.si);
          if (master) raw = f.text ? "=" + f.text : shiftFormula("=" + master.text, r - master.r, col - master.c);
        } else if (f.text) raw = "=" + f.text;
      }
      if (raw === undefined) {
        const t = c.attrs.t;
        if (t === "s") raw = shared[Number(v?.text)] ?? "";
        else if (t === "inlineStr") raw = textOf(kid(c, "is"));
        else if (t === "str") raw = v?.text ?? "";
        else if (t === "b") raw = v?.text === "1" ? "TRUE" : "FALSE";
        else if (t === "e") raw = v?.text ?? "#N/A";
        else raw = v ? v.text.trim() : "";
        // keep text that merely *looks* like a number/boolean/formula as text
        if ((t === "s" || t === "inlineStr" || t === "str") && raw !== "" && (parseLiteral(raw) !== raw || raw[0] === "=" || raw[0] === "'")) raw = "'" + raw;
      }
      if (raw !== "" && raw !== undefined) sheet.cells[k] = raw;
    }
  }

  for (const dv of kids(kid(root, "dataValidations"), "dataValidation")) {
    const type = dv.attrs.type;
    const range = (dv.attrs.sqref || "").split(" ")[0];
    if (!range || !["list", "whole", "decimal", "textLength"].includes(type)) continue;
    const f1 = kid(dv, "formula1")?.text ?? "";
    const entry = { id: newId(), range, type, op: XL_TO_OP[dv.attrs.operator] || "between", message: dv.attrs.error || "" };
    if (type === "list") {
      if (!/^".*"$/.test(f1)) continue; // list sourced from a range — not supported
      entry.list = f1.slice(1, -1);
    } else {
      entry.v1 = f1;
      entry.v2 = kid(dv, "formula2")?.text ?? "";
    }
    sheet.validations.push(entry);
  }

  for (const cf of kids(root, "conditionalFormatting")) {
    const range = (cf.attrs.sqref || "").split(" ")[0];
    for (const rule of kids(cf, "cfRule")) {
      const style = styles.dxfs[Number(rule.attrs.dxfId)] || {};
      const base = { id: newId(), range, style };
      const unq = (s) => (s ?? "").replace(/^"(.*)"$/, "$1");
      if (rule.attrs.type === "cellIs") {
        const fs = kids(rule, "formula");
        sheet.cf.push({ ...base, type: "cellIs", op: XL_TO_OP[rule.attrs.operator] || "eq", v1: unq(fs[0]?.text), v2: unq(fs[1]?.text) });
      } else if (rule.attrs.type === "containsText") sheet.cf.push({ ...base, type: "text", v1: rule.attrs.text || "" });
      else if (rule.attrs.type === "duplicateValues") sheet.cf.push({ ...base, type: "duplicates" });
      else if (rule.attrs.type === "colorScale") {
        const colors = kids(kid(rule, "colorScale"), "color").map(colorOf);
        if (colors.length >= 2) sheet.cf.push({ id: base.id, range, type: "scale", colors: [colors[0], colors[colors.length - 1]] });
      }
    }
  }

  if (kid(kid(root, "sheetViews"), "sheetView")?.attrs.showGridLines === "0") sheet.showGrid = false;
  if (dropped) warnings.push(`"${name}": ${dropped} row(s)/cell(s) outside A1:Z${ROWS} were not imported.`);
  return sheet;
}

/** @param {Uint8Array} bytes @returns {Promise<{workbook, warnings:string[]}>} */
export async function xlsxToWorkbook(bytes) {
  const files = await unzip(bytes);
  const read = (name) => {
    const f = files.get(name);
    return f ? parseXml(bytesToText(f)) : null;
  };
  const wbXml = read("xl/workbook.xml");
  if (!wbXml) throw new Error("This doesn't look like an .xlsx workbook (xl/workbook.xml is missing).");
  const relMap = {};
  for (const r of kids(read("xl/_rels/workbook.xml.rels"), "Relationship")) {
    const t = r.attrs.Target;
    relMap[r.attrs.Id] = t.startsWith("/") ? t.slice(1) : "xl/" + t;
  }
  const shared = kids(read("xl/sharedStrings.xml"), "si").map(textOf);
  const stylesRoot = read("xl/styles.xml");
  const styles = stylesRoot ? readStyles(stylesRoot) : { xfs: [], dxfs: [] };

  const warnings = [];
  const sheets = [];
  for (const s of kids(kid(wbXml, "sheets"), "sheet")) {
    const path = relMap[s.attrs.id];
    const root = path && read(path);
    if (root) sheets.push(parseSheetXml(root, shared, styles, s.attrs.name, warnings));
  }
  if (!sheets.length) return { workbook: createWorkbook(), warnings: ["No worksheets found in file."] };
  const names = [...files.keys()];
  if (names.some((k) => k.startsWith("xl/charts/"))) warnings.push("Charts in the file were not imported.");
  if (names.some((k) => k.startsWith("xl/pivotTables/"))) warnings.push("Pivot tables were not imported (their values are kept).");
  return { workbook: { sheets, activeSheetId: sheets[0].id }, warnings };
}
