# Atlas

Plugin de Obsidian para fichas, continuidad y escritura. Esta versión solo carga: no registra comandos ni vistas.

## Desarrollar

Usa una bóveda vacía. No desarrolles en la bóveda donde está el manuscrito.

```bash
npm install
npm run dev
```

`npm run dev` recompila `main.js` al guardar. `npm run build` comprueba los tipos y genera `main.js` de producción.

## Cargar en Obsidian

1. Copia esta carpeta a `<bóveda>/.obsidian/plugins/atlas`. La carpeta tiene que llamarse `atlas`, el mismo `id` de `manifest.json`.
2. Abre **Settings → Community plugins**.
3. Activa **Turn on community plugins**.
4. En **Installed plugins**, activa **Atlas**.

Reinicia Obsidian después de cambiar `manifest.json`. Tras cambiar el TypeScript, ejecuta **Reload app without saving** en la paleta de comandos.
