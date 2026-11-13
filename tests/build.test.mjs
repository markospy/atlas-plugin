import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";

test("npm run build produce main.js y onload no escribe en consola", async () => {
  const result = spawnSync("npm", ["run", "build"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  assert.equal(
    result.status,
    0,
    `build falló\n${result.stdout}\n${result.stderr}`,
  );

  const built = await stat("main.js");
  assert.equal(built.isFile(), true);
  assert.equal(built.size > 0, true);

  const require = createRequire(import.meta.url);
  const nodeModule = require("node:module");
  const originalRequire = nodeModule.prototype.require;
  nodeModule.prototype.require = function (id) {
    if (id === "obsidian") {
      class Plugin {
        constructor(app, manifest) {
          this.app = app;
          this.manifest = manifest;
        }
        addCommand() {}
        addSettingTab() {}
        async loadData() {
          return null;
        }
        async saveData() {}
      }
      class PluginSettingTab {
        constructor(app, plugin) {
          this.app = app;
          this.plugin = plugin;
        }
      }
      return new Proxy(
        { Plugin, PluginSettingTab },
        {
          get(target, prop) {
            if (prop in target) return target[prop];
            return class {};
          },
        },
      );
    }
    return originalRequire.apply(this, arguments);
  };

  const errors = [];
  const originalError = console.error;
  console.error = (...args) => {
    errors.push(args);
  };

  try {
    const pluginPath = require.resolve("../main.js");
    delete require.cache[pluginPath];
    const loaded = require(pluginPath);
    const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
    const plugin = new loaded.default({ workspace: {} }, manifest);
    await plugin.onload();
    assert.equal(errors.length, 0);
  } finally {
    console.error = originalError;
    nodeModule.prototype.require = originalRequire;
  }
});
