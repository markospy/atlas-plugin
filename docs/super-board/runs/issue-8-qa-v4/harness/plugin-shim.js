// Node stand-in for Obsidian: records what AtlasPlugin.onload registers.
export class Plugin {
  constructor(app) { this.app = app; this.commands = []; this.views = []; }
  async loadData() { return null; }
  addSettingTab() {}
  registerView(type) { this.views.push(type); }
  addCommand(c) { this.commands.push(c); }
  addRibbonIcon() {} registerEvent() {} registerEditorExtension() {} registerMarkdownPostProcessor() {}
}
export class ItemView { constructor(leaf) { this.leaf = leaf; } }
export class PluginSettingTab { constructor(app, plugin) { this.app = app; this.plugin = plugin; } }
export class Setting {} export class Notice {} export class TFile {} export class MarkdownView {} export class App {}
