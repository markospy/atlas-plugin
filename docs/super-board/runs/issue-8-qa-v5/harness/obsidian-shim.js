// Minimal runtime stand-in for the parts of Obsidian's API GraphView uses.
const SVG_NS = "http://www.w3.org/2000/svg";
function apply(el, o = {}) {
  if (o.text !== undefined) el.textContent = o.text;
  if (o.value !== undefined) el.value = o.value;
  if (o.type !== undefined) el.setAttribute("type", o.type);
  if (o.placeholder !== undefined) el.setAttribute("placeholder", o.placeholder);
  for (const [k, v] of Object.entries(o.attr ?? {})) el.setAttribute(k, String(v));
  return el;
}
const P = Element.prototype;
P.createEl = function (tag, o) { const el = apply(document.createElement(tag), o); if (o && o.value !== undefined) el.value = o.value; this.appendChild(el); return el; };
P.createDiv = function (o) { return this.createEl("div", o); };
P.createSvg = function (tag, o) { const el = apply(document.createElementNS(SVG_NS, tag), o); this.appendChild(el); return el; };
P.empty = function () { while (this.firstChild) this.removeChild(this.firstChild); };
export class ItemView {
  constructor(leaf) { this.leaf = leaf; this.app = leaf.app; this.contentEl = document.getElementById("view"); }
}
export class Notice {}
