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

## #2 vault

- [ ] Con una nota índice abierta, **Nuevo proyecto Atlas** crea `Manuscrito/`, `Personajes/`, `Lugares/`, `Objetos/`, `Trama/`, `Estilo/` y `_Memoria/` junto a esa nota.
- [ ] La nota índice queda con `longform.format: scenes`, `sceneFolder: Manuscrito` y `atlas.version: 1`. El texto que ya tenía sigue debajo.
- [ ] Ejecutar el comando otra vez no duplica el frontmatter ni borra un capítulo que ya esté en `Manuscrito/`.

## #15 proveedores

- [ ] **Settings → Atlas**: con el endpoint vacío, el comando **Nuevo proyecto Atlas** sigue disponible.
- [ ] Un endpoint `http://127.0.0.1:11434` no muestra aviso.
- [ ] Un endpoint `https://api.openai.com/v1` muestra el aviso de host no permitido.
- [ ] Tras activar **Permitir nube** y escribir `api.openai.com` en la lista blanca, ese endpoint ya no avisa.
