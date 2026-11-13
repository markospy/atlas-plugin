# Checks en Obsidian

Los corre una persona, al final, en una bóveda vacía. Los `tests/*.test.mjs` no sustituyen esta lista.

Prepara el plugin una vez:

1. En esta carpeta: `npm install` y `npm run build`.
2. Copia `manifest.json` y `main.js` a `<bóveda>/.obsidian/plugins/atlas/`. La carpeta tiene que llamarse `atlas`.

## #1 scaffold

- [ ] **Settings → Community plugins**: tras activar community plugins, **Atlas** aparece en Installed plugins.
- [ ] Activar **Atlas** no escribe ningún error en la consola (Ctrl+Shift+I, o Cmd-Option-I en macOS).
- [ ] Desactivar **Atlas** tampoco escribe ningún error en la consola.
- [ ] Cambiar `name` en `manifest.json`, reiniciar Obsidian y comprobar que el nombre mostrado cambia. Volver a dejar `Atlas`.
