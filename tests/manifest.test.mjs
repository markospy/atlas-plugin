import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ID_PATTERN = /^[a-z]+(-[a-z]+)*$/;

test("manifest declara id, versión y minAppVersion para plugins de la comunidad", async () => {
  const manifest = JSON.parse(await readFile("manifest.json", "utf8"));

  assert.match(manifest.id, ID_PATTERN);
  assert.equal(manifest.id.endsWith("plugin"), false);
  assert.equal(manifest.id.includes("obsidian"), false);
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.match(manifest.minAppVersion, /^\d+\.\d+\.\d+$/);
  assert.equal(typeof manifest.name, "string");
  assert.equal(manifest.name.length > 0, true);
  assert.equal(typeof manifest.description, "string");
  assert.equal(manifest.description.length > 0, true);
  assert.equal(typeof manifest.author, "string");
  assert.equal(manifest.author.length > 0, true);
  assert.equal(typeof manifest.isDesktopOnly, "boolean");
});
