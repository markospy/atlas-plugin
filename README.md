# Atlas

Plugin de Obsidian para fichas, continuidad y escritura.

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

## Nuevo proyecto

Abre la nota que será el índice y ejecuta **Nuevo proyecto Atlas** en la paleta de comandos. El comando crea, junto a esa nota, las carpetas `Manuscrito/`, `Personajes/`, `Lugares/`, `Objetos/`, `Trama/`, `Estilo/` y `_Memoria/`. En la nota escribe frontmatter `longform` (formato `scenes`, `sceneFolder: Manuscrito`, `scenes` vacío) y la clave `atlas`. No reescribe notas que ya existan; si el índice ya tiene texto, lo conserva. `_Memoria/` es material generado, aparte del manuscrito.

## Proveedores

En **Settings → Atlas** puedes dejar el endpoint vacío: el plugin sigue usable. `localhost`, `127.0.0.1` y `::1` se aceptan siempre. Cualquier otro host se rechaza hasta que actives **Permitir nube** y lo escribas en la lista blanca.

## Marcadores

En el editor, **Insertar [TK]** e **Insertar [INVESTIGAR]** dejan el marcador en el cursor. Asigna el atajo en **Settings → Hotkeys**. **Marcadores del manuscrito** abre el panel: lista los `[TK]` y `[INVESTIGAR: …]` de las notas bajo `Manuscrito/` y salta a la línea. Si borras el marcador del texto, desaparece del panel al volver a ejecutar el comando.
