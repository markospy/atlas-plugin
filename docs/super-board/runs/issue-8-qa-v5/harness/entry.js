import { GraphView } from "../../../../../src/graph-view.ts";
// v5: v4 fixture plus R7 (Elena–Iván aliado `hasta` Cap 10, enemigo `desde` Cap 10). Shim: ./obsidian-shim.js.
const notes = {
  "Novela/Personajes/Elena.md": `---\nrelaciones:\n  - con: "[[Personajes/Marcos]]"\n    tipo: hermano\n  - con: "[[Iván|el traidor]]"\n    tipo: rival\n    desde: "[[Cap 07 - parte 2]]"\n  - con: "[[Lucía]]"\n    tipo: amiga\n    desde: "[[Cap 02]]"\n    hasta: "[[Cap 05]]"\n  - con: "[[Iván]]"\n    tipo: aliado\n    hasta: "[[Cap 10]]"\n  - con: "[[Iván]]"\n    tipo: enemigo\n    desde: "[[Libro 2/Cap 10]]"\n---\n`,
  "Novela/Personajes/Marcos.md": `---\nrelaciones:\n  - con: "[[Iván]]"\n    tipo: rival\n    hasta: "[[Cap 03]]"\n---\n`,
  "Novela/Personajes/Iván.md": `---\n---\n`,
  "Novela/Personajes/Lucía.md": `---\n---\n`,
  "Novela/Manuscrito/Cap 01.md": `Capítulo uno.\n`,
  "Otra/Personajes/Elena.md": `---\nrelaciones:\n  - con: "[[Zoe]]"\n    tipo: mentora\n---\n`,
  "Otra/Personajes/Zoe.md": `---\n---\n`,
};
const files = Object.keys(notes).map((path) => ({ path, basename: path.split("/").pop().replace(/\.md$/, "") }));
const q = new URLSearchParams(location.search);
const active = files.find((f) => f.path === (q.get("active") ?? "Novela/Manuscrito/Cap 01.md")) ?? null;
const app = { vault: { getMarkdownFiles: () => files, read: async (f) => notes[f.path] }, workspace: { getActiveFile: () => active } };
const view = new GraphView({ app });
await view.onOpen();
const sel = document.querySelector("select");
if (q.get("tipo") && sel) { sel.value = q.get("tipo"); sel.dispatchEvent(new Event("change")); }
if (q.get("cap")) { const n = document.querySelector("input"); n.value = q.get("cap"); n.dispatchEvent(new Event("change")); }
const nodes = [...document.querySelectorAll("svg circle")].map((c) => c.nextElementSibling.textContent);
const labels = [...document.querySelectorAll("svg line + text")].map((t) => t.textContent);
const out = document.createElement("pre");
out.id = "check";
out.hidden = true;
out.textContent = JSON.stringify({ edges: document.querySelectorAll("svg line").length, nodes, labels });
document.body.appendChild(out);
