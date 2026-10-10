/** Tiny XML parser — enough for OOXML parts. Works in browsers and Node. */
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
export const decodeEntities = (s) =>
  s.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (m, e) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENT[e] ?? m;
  });
export const escapeXml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

const strip = (n) => n.replace(/^.*:/, "");

export function parseXml(xml) {
  const root = { name: "#root", attrs: {}, children: [], text: "" };
  const stack = [root];
  const re = /<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  const attrRe = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = re.exec(xml))) {
    const top = stack[stack.length - 1];
    if (m[1] !== undefined) top.text += m[1];
    else if (m[6] !== undefined) top.text += decodeEntities(m[6]);
    else if (m[3] !== undefined) {
      if (m[2]) {
        if (stack.length > 1) stack.pop();
      } else {
        const attrs = {};
        let a;
        attrRe.lastIndex = 0;
        while ((a = attrRe.exec(m[4]))) attrs[strip(a[1])] = decodeEntities(a[2] ?? a[3]);
        const node = { name: strip(m[3]), attrs, children: [], text: "" };
        top.children.push(node);
        if (!m[5]) stack.push(node);
      }
    }
  }
  return root.children[0] ?? root;
}

export const kids = (n, name) => (n ? n.children.filter((c) => c.name === name) : []);
export const kid = (n, name) => (n ? n.children.find((c) => c.name === name) : undefined);
