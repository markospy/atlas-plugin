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

## #3 personajes

- [ ] Con el nombre seleccionado, **Nueva ficha de personaje** crea la nota en `Personajes/` y no sustituye una ficha ya existente.
- [ ] **Comprobar relaciones del personaje** acepta `con: "[[Alguien]]"` y avisa si `con` no es un wikilink.

## #4 lugares

- [ ] Con el nombre seleccionado, **Nuevo lugar** crea la nota en `Lugares/` con las secciones sensoriales y no sustituye una ficha ya existente.
- [ ] Un lugar con `padre: "[[Casa]]"` y un estado en el capítulo 12 se lee al reabrir la nota.

## #6 trama

- [ ] Con el nombre seleccionado, **Nueva trama (Save the Cat)** crea la nota en `Trama/` con premisa, tema, conflicto central, arcos, subtramas y los 15 beats, y no sustituye una trama ya existente.
- [ ] **Añadir campos de escena** en una escena con `pov: "[[Elena]]"` agrega los otros cuatro campos vacíos y deja `pov` y el texto como estaban.

## #26 marcadores

- [ ] En una nota del manuscrito, **Insertar [TK]** y **Insertar [INVESTIGAR]** dejan el texto en el cursor. El atajo se asigna en **Settings → Hotkeys**.
- [ ] **Marcadores del manuscrito** lista esos marcadores y el enlace abre la nota en esa línea.
- [ ] Borrar `[TK]` del texto y volver a abrir el panel lo quita de la lista.

## #8 grafo

- [ ] Con dos fichas en `Personajes/` que se relacionan, **Grafo de relaciones** abre un SVG con un nodo por personaje y una arista con el tipo.
- [ ] Elegir un tipo en el selector oculta las aristas de otros tipos.
- [ ] Una relación con `desde: "[[Cap 07]]"` no aparece con capítulo 3 y sí con capítulo 7.
- [ ] Con dos proyectos en la bóveda, el grafo abierto desde una nota de uno solo muestra sus personajes; `con: "[[Personajes/Marcos]]"` une la arista al nodo `Marcos`.

## #13 estilo

- [ ] Con el nombre seleccionado en un capítulo, **Nueva skill de estilo** crea `Estilo/<nombre>.md` del proyecto con `alcance`, `aplica_a`, `severidad`, `verificacion`, `patron` y las secciones Regla / Ejemplo mal / Ejemplo bien.
- [ ] Ejecutarlo otra vez con el mismo nombre avisa "Esa skill ya existe." y no pisa la nota.

## #5 objetos

- [ ] Con el nombre seleccionado en un capítulo, **Nuevo objeto** crea `Objetos/<nombre>.md` del proyecto con descripción, origen, valor material, valor sentimental y función en la trama.
- [ ] Ejecutarlo otra vez con el mismo nombre avisa "Ese objeto ya existe." y no pisa la nota.

## #7 entidades

- [ ] Con un capítulo abierto, **Índice de entidades (escanear manuscrito)** abre el panel a la derecha con Personajes, Lugares y Objetos del proyecto.
- [ ] Bajo cada ficha salen las escenas que la nombran por `nombre` o por un `alias`; clic en una escena la abre.
- [ ] Borrar la mención de un capítulo y ejecutar el comando otra vez la quita del panel, sin repetir fichas ni escenas.

## #14 linter

- [ ] En un capítulo con `- Hola.` y `Pienso de que sí.`, **Revisar estilo de la nota** lista `raya-dialogo` y `dequeismo` con su línea. Al pulsar uno, el cursor va a esa línea.
- [ ] Una skill global con `verificacion: patron` y `patron: '\bya\b'` sale en la lista con su nombre y su severidad.
- [ ] **Ignorar aquí** añade `%% atlas-ignorar: … %%` a la línea y el hallazgo desaparece de la lista. Las otras notas no cambian.

## #10 memoria

- [ ] Con `Manuscrito/Cap 03.md` abierto, **Nueva memoria del capítulo** crea `_Memoria/Cap 03.md` del proyecto con `hechos` y `conocimiento`. Ejecutarlo otra vez avisa "Esa memoria ya existe." y no pisa la nota.
- [ ] Con un hecho `padre` que `[[Elena]]` sabe y el `lector` sospecha, seleccionar `Elena` en el capítulo y ejecutar **Qué sabe en este capítulo** muestra `sabe: …`.
- [ ] Sin selección, el mismo comando muestra `lector en cap. 3` con `sospecha: …`. Un `estado: intuye` sale como aviso y no se cuenta.

## #11 foreshadowing

- [ ] Con el nombre seleccionado en un capítulo, **Nueva pista (foreshadowing)** crea `Trama/<nombre>.md` del proyecto con `tipo: pista` y `estado: sembrado`. Otra vez con el mismo nombre avisa "Esa pista ya existe.".
- [ ] Con la pista abierta, **Avanzar pista** pasa `estado` a `reforzado` y luego a `resuelto`; una vez resuelta no cambia.
- [ ] **Tablero de foreshadowing** lista las pistas sembradas y reforzadas, no las resueltas. Un objeto con `funcion` nombrado en un solo capítulo sale en **Objetos que no vuelven**; al nombrarlo en un segundo capítulo y ejecutar el comando otra vez, desaparece.

## #17 revisar con IA

- [ ] Con endpoint o modelo vacíos, **Revisar escena con IA** muestra el aviso de configurar proveedor y no falla.
- [ ] Con Ollama local (`http://127.0.0.1:11434`, modelo instalado) sobre una escena en `Manuscrito/Cap 01/`, abre la lista de hallazgos con tipo y línea; un clic lleva el cursor a la cita.
- [ ] Tras la revisión, la escena y el resto de notas siguen sin cambios (no hay deshacer pendiente ni archivo modificado).

## #18 co-escritura

- [ ] Con Ollama en `http://127.0.0.1:11434` y **Modelo** `llama3.2` en **Settings → Atlas**, abrir una escena y ejecutar **Co-escribir escena** → **Alternativa** muestra "Pidiendo propuesta…" y luego el diff con líneas `-` y `+`.
- [ ] **Rechazar** cierra el modal y la nota queda igual (Ctrl+Z no tiene nada que deshacer).
- [ ] **Aprobar** escribe la propuesta en la nota y conserva el frontmatter; **Continuación** añade al final sin tocar lo anterior.
- [ ] Editar la nota mientras se espera la propuesta y pulsar **Aprobar** avisa "La nota cambió desde la propuesta." y no escribe.
- [ ] Con **Modelo** vacío, el comando avisa "Configura endpoint y modelo…" y no abre el diff.

## #25 metas y estadísticas

- [ ] Con una escena de `Manuscrito/` abierta, **Progreso de escritura** avisa con las palabras totales del manuscrito, "Hoy: 0 / 500 (0 %)" y "Racha: 0 días" la primera vez.
- [ ] Escribir unas palabras, esperar 5 s y repetir el comando: "Hoy" sube en esas palabras y la racha pasa a 1 día.
- [ ] Poner **Meta diaria** a 0 en **Settings → Atlas**: el aviso dice "sin meta diaria". Tras reiniciar Obsidian, la meta y el registro siguen en `data.json`.
- [ ] Escribir `500abc` en **Meta diaria**: avisa "escribe solo un número entero" y la meta guardada no cambia.
- [ ] Borrar una escena, o moverla fuera de `Manuscrito/`, esperar 5 s y repetir el comando: el total baja sin editar ninguna otra escena.

## #28 respaldos

- [ ] Co-escribir una escena y pulsar **Aprobar** crea `.atlas/respaldos/<ruta de la escena>/<fecha>.md` con el texto de antes (míralo desde el explorador de archivos del sistema; Obsidian no muestra la carpeta).
- [ ] **Restaurar respaldo de la nota** lista esa versión con su fecha; elegirla devuelve la escena al texto de antes y añade otro respaldo con el texto que se sustituyó.
- [ ] En una nota sin respaldos, el mismo comando avisa "Esta nota no tiene respaldos.".
- [ ] Tras 11 aprobaciones en la misma escena quedan 10 archivos en su carpeta de respaldos.

## #21 propagar cambios

- [ ] En un proyecto con `_Memoria/Cap 03` (`hechos: carta`) y `Cap 09` / `Cap 14` que la usan, abrir `Cap 03` y ejecutar **Propagar cambios** avisa "Base guardada para el cap. 3…".
- [ ] Quitar `carta` de los `hechos` de `Cap 03`, guardar y ejecutar **Propagar cambios** avisa "1 eliminados · 2 capítulos desactualizados" y abre la lista con cap. 9 y cap. 14 y el motivo "ya no se introduce en el cap. 3".
- [ ] Solo el cap. 9 tiene **Confirmar: ya está reanalizado**; pulsarlo lo quita y el cap. 14 pasa a tenerlo. **Abrir para corregir** abre el capítulo de `Manuscrito/`.
- [ ] Cerrar y reabrir Obsidian: **Capítulos desactualizados** sigue mostrando lo que no se confirmó.
