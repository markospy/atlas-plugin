import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("el README explica cómo compilar y cargar el plugin en local", async () => {
  const readme = await readFile("README.md", "utf8");

  assert.match(readme, /npm install/);
  assert.match(readme, /npm run build/);
  assert.match(readme, /\.obsidian\/plugins\/atlas/);
  assert.match(readme, /Community plugins/);
  assert.match(readme, /manifest\.json/);
});
