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

## Personajes

Selecciona el nombre en una nota del proyecto y ejecuta **Nueva ficha de personaje**. Crea `Personajes/<nombre>.md` con `tipo: personaje`, `alias`, `relaciones` y las secciones Físico, Psicología, Voz y Arco. No pisa una ficha que ya exista. Cada relación lleva `con` como `[[nota]]`, `tipo` y, si hace falta, `desde`, `hasta` y `nota`. **Comprobar relaciones del personaje** avisa si `con` no es un wikilink.

## Lugares

Selecciona el nombre y ejecuta **Nuevo lugar**. Crea `Lugares/<nombre>.md` con vista, sonido, olor, tacto, disposición y atmósfera. En el frontmatter, `padre` es el lugar que lo contiene (`[[Casa]]`) y `estados` anota cambios por capítulo (`capitulo` + `descripcion`). No pisa una ficha que ya exista.

## Trama

Selecciona el nombre y ejecuta una de **Nueva trama (Tres actos)**, **Nueva trama (Save the Cat)** o **Nueva trama (Viaje del héroe)**. Crea `Trama/<nombre>.md` con premisa, tema, conflicto central, arcos y subtramas, más los beats del esqueleto elegido como subsecciones. `estructura` en el frontmatter guarda cuál elegiste:

- `tres-actos`: Acto I, Acto II y Acto III.
- `save-the-cat`: los 15 beats de Blake Snyder, de la imagen de apertura a la imagen final.
- `viaje-del-heroe`: las 12 etapas de Vogler, del mundo ordinario al regreso con el elixir.

No pisa una trama que ya exista.

En una escena de `Manuscrito/`, **Añadir campos de escena** agrega al frontmatter `objetivo`, `conflicto`, `resultado`, `pov` y `subtrama` vacíos, sin tocar los que ya tengan valor ni el texto. `pov` y `subtrama` admiten un `[[wikilink]]`.

## Cronología

Una escena declara en su frontmatter `dia` (número relativo, p. ej. `3` o `3.5`), `lugar` (`[[Puerto]]`) y quién está: `pov` y `personajes` (`["[[Marcos]]"]`). Una ficha de lugar (`tipo: lugar`) declara en `viajes` la duración mínima hasta otro lugar (`a` + `dias`); vale en los dos sentidos y, si hay dos rutas, manda la más corta. Los enlaces casan por nombre de archivo y sin distinguir mayúsculas, como en Obsidian: `[[Lugares/Puerto]]`, `[[puerto]]` y `[[Puerto]]` apuntan a `Puerto.md`, aunque su `nombre` sea otro. Los comentarios YAML (`# …`) dentro de `viajes` se ignoran. **Revisar cronología** lee las escenas de `Manuscrito/` y las rutas de las fichas de lugar, y lista los pares de escenas seguidas (por `dia`) en que un personaje cambia de lugar en menos días que el mínimo. Solo avisa, no bloquea. No se comprueban: escenas sin `dia` numérico o sin `lugar`, escenas fuera de `Manuscrito/`, rutas sin declarar o en notas sin `tipo: lugar`, viajes sin `a` o con `dias` no numérico, y los elementos de `viajes` cuya sangría no cuadra con la del primero (la lista se corta ahí). Dos lugares con el mismo nombre de archivo en carpetas distintas se toman por el mismo.

## Objetos

Selecciona el nombre y ejecuta **Nuevo objeto**. Crea `Objetos/<nombre>.md` con descripción, origen, valor material, valor sentimental (para quién y por qué) y función en la trama. En el frontmatter, `funcion` marca su peso narrativo (p. ej. "pistola de Chéjov"), `foreshadowing` enlaza dónde se anuncia y `posesiones` anota cada cambio de poseedor (`poseedor` + `capitulo`, p. ej. `[[Cap 04]]`). `holderAt(ficha, N)` en `src/objects.ts` responde quién tiene el objeto en el capítulo N. No pisa una ficha que ya exista.

## Foreshadowing

Selecciona el nombre y ejecuta **Nueva pista (foreshadowing)**. Crea `Trama/<nombre>.md` con `tipo: pista` y `estado: sembrado`. En el frontmatter, `sembrado` y `resuelto` guardan el capítulo (p. ej. `[[Cap 03]]`), `reforzado` la lista de capítulos donde se recuerda y `objeto` el `[[Objeto]]` ligado. No pisa una pista que ya exista.

Con la pista abierta, **Avanzar pista** la mueve un paso: `sembrado` → `reforzado` → `resuelto`. Solo avanza; una pista resuelta se queda así.

**Tablero de foreshadowing** abre el panel con las pistas sin resolver del proyecto. Debajo, **Objetos que no vuelven** avisa de cada objeto con `funcion` (peso narrativo) que el manuscrito nombra en menos de dos escenas. El aviso no bloquea nada.

## Estilo

Selecciona el nombre y ejecuta **Nueva skill de estilo**. Crea `Estilo/<nombre>.md` con las secciones Regla, Ejemplo mal y Ejemplo bien. En el frontmatter: `alcance` (`global`, `personaje`, `POV`, `capítulo` o `escena`), `aplica_a` (p. ej. `["[[Marcos]]"]` para la voz de un personaje), `severidad` (`sugerencia`, `aviso` u `obligatoria`), `verificacion` (`patron` sin IA, o `ia`) y `patron`, la expresión regular que se usa solo con `verificacion: patron`. No pisa una skill que ya exista.

## Marcadores

En el editor, **Insertar [TK]** e **Insertar [INVESTIGAR]** dejan el marcador en el cursor. Asigna el atajo en **Settings → Hotkeys**. **Marcadores del manuscrito** abre el panel: lista los `[TK]` y `[INVESTIGAR: …]` de las notas bajo `Manuscrito/` y salta a la línea. Si borras el marcador del texto, desaparece del panel al volver a ejecutar el comando.

## Memoria

Con un capítulo abierto (`Cap NN`), **Nueva memoria del capítulo** crea `_Memoria/Cap NN.md` con tres listas en el frontmatter, vacías y opcionales:

- `hechos`: cada uno con `id`, `texto` y `verdad` (`true` o `false`).
- `conocimiento`: cada entrada con `hecho` (el `id`), `quien` (`lector` o `[[Personaje]]`) y `estado`: `ignora`, `sospecha`, `cree-falso` o `sabe`.
- `usos`: cada entrada con `hecho` (el `id`), `quien` (`[[Personaje]]`) y `modo`: `menciona` o `actua` (otro valor se avisa).

**Qué sabe en este capítulo** responde por el texto seleccionado (`[[Elena]]`) o, sin selección, por el lector. Suma las memorias hasta ese capítulo y, si un hecho cambia de estado, gana el más reciente. Avisa de estados no válidos.

**Revisar continuidad** compara los `usos` del capítulo abierto con lo que se sabe hasta ese capítulo, sin IA:
- **Posible spoiler:** alguien menciona un hecho que el lector aún ignora (o no tiene registrado).
- **Personaje omnisciente:** un personaje actúa según un hecho que no `sabe` (actuar según un `cree-falso` propio se respeta y no avisa).
- **Ironía dramática (intencional):** el lector sabe un hecho y un personaje del capítulo no; se marca como ironía, no como error.

También avisa de un `hecho` del capítulo (en `usos` o `conocimiento`) que no está declarado en ningún `hechos` hasta ese capítulo: suele ser un `id` mal escrito.

**Grafo de dependencias de hechos.** Con las memorias de `_Memoria/` (escritas a mano o desde la extracción aprobada), cada capítulo *introduce* los hechos de su `hechos` y *usa* los de su `usos` y su `conocimiento`. Desde cualquier nota del proyecto (`Manuscrito/`, `_Memoria/`, fichas de `Personajes/`, `Lugares/`, `Objetos/`, `Trama/` o la raíz):
- **Quién depende de este hecho:** selecciona el `id` (`carta`) y lista los capítulos que lo usan (si el cap. 3 introduce la carta y el 9 y el 14 la usan: cap. 9 y cap. 14).
- **Copiar grafo de dependencias (JSON):** copia al portapapeles, para depurar, cada hecho con los capítulos que lo introducen y lo usan, las aristas y los avisos.

Si un capítulo usa un hecho que ningún capítulo anterior (o el mismo) introduce, el grafo está incompleto: los dos comandos lo avisan en vez de fallar. Si el `_Memoria/` del proyecto no tiene memorias, también lo avisan en vez de dar un resultado vacío.

**Propagar cambios al editar un capítulo pasado.** Con un capítulo (`Cap NN`) o su memoria abiertos:
- **Propagar cambios:** compara los `hechos` de la memoria del capítulo con los de la última vez que se propagó y marca como desactualizados solo los capítulos posteriores que usaban un hecho eliminado o cambiado (no todo lo posterior). Cada uno lleva su motivo: «El cap. 9 usa «carta», que ya no se introduce en el cap. 3.». Un hecho añadido no marca nada. La primera vez solo guarda la base de todas las memorias del proyecto.
- **Capítulos desactualizados:** lista los marcados, del más antiguo al más reciente, con sus motivos. **Abrir para corregir** abre el capítulo; **Confirmar: ya está reanalizado** limpia la marca, y solo se puede en el más antiguo, para reanalizar en orden. Nada se reescribe solo.

La base y la lista se guardan en `.atlas/propagacion.json`, dentro de la bóveda.

## Índice de entidades

Con una nota del proyecto abierta, ejecuta **Índice de entidades (escanear manuscrito)**. El panel lista los personajes, lugares y objetos del proyecto y, bajo cada ficha, las escenas de `Manuscrito/` que la nombran por `nombre` o por cualquiera de sus `alias` (palabra completa, sin distinguir mayúsculas). El escaneo es local, sin IA, y solo corre cuando ejecutas el comando: vuelve a ejecutarlo tras editar y el índice se rehace sin duplicar escenas.

## Vistazo de entidad

Ejecuta **Vistazo de entidad (panel lateral)** y sigue escribiendo. Al situar el cursor sobre el `nombre` o un `alias` de un personaje, lugar u objeto, el panel muestra su ficha y su estado en el capítulo de la nota (`Cap NN`): relaciones vigentes, quién posee el objeto o en qué estado está el lugar. Si no hay coincidencia, el panel lo dice. Es de solo lectura, lee las fichas una vez por proyecto y se actualiza con un retardo corto para no frenar el tecleo.

## Linter de estilo

**Revisar estilo de la nota** revisa la nota abierta sin IA y lista cada hallazgo con su línea. Pulsa el hallazgo para ir a esa línea. Las reglas base, todas con severidad `aviso`:

| Regla | Avisa cuando |
|---|---|
| `raya-dialogo` | el diálogo abre con guion (`-`, `–`) o con raya seguida de espacio (`— Hola`) |
| `gerundios-encadenados` | hay tres o más gerundios en la misma frase |
| `dijo-repetido` | `dijo` aparece dos veces en una línea, o en dos líneas seguidas con texto |
| `mente-acotacion` | hay un adverbio en `-mente` en la acotación (`—No —dijo tristemente.`) |
| `dequeismo` | aparece `de que` tras un verbo de pensar o decir (`pienso de que`) |

También ejecuta las skills de `Estilo/` con `alcance: global` y `verificacion: patron`. El mensaje es el `nombre` de la skill, con su `severidad`. El patrón no distingue mayúsculas, y una expresión regular inválida se ignora. **Ignorar aquí** añade `%% atlas-ignorar: <regla> %%` al final de la línea. Así se calla esa regla en esa línea y en esa nota. Para recuperar el aviso, borra el comentario. El frontmatter no se revisa.

## Contexto de escena (IA)

`buildSceneContext` (`src/context.ts`) arma el contexto de una escena para la IA sin mandar el libro entero. No tiene interfaz todavía: lo usarán revisar, co-escribir y extraer. Devuelve estas secciones con nombre, en este orden:

| Sección | Contiene |
|---|---|
| `skills` | skills `global`, las de `POV` del `pov` de la escena, las de `personaje` de los presentes y las de `capítulo` del capítulo N; las de `escena` no entran, porque el builder no recibe el nombre de la escena |
| `fichas` | personajes presentes (el `pov` o nombrados por `nombre` o `alias`), objetos y lugares nombrados |
| `mundo` | relaciones, poseedores y estados de lugar en el capítulo N, solo de lo presente |
| `conocimiento` | qué sabe cada personaje presente y el lector en el capítulo N |
| `resumenes` | resúmenes de los capítulos anteriores a N, del más antiguo al más reciente |
| `trama` | `subtrama` de la escena y la nota de trama activa |
| `escena` | texto de la escena, sin frontmatter |

El texto de la escena es la nota sin su frontmatter; un `---` inicial seguido de una línea que no es `clave:` es un corte de escena y se conserva. Una sección vacía no aparece. `presupuesto` es el máximo de caracteres sumando todas las secciones. Si no cabe, se llenan en este orden: escena, skills, fichas, conocimiento, mundo, trama, resúmenes. La primera que no cabe se corta con `…`: la escena y los resúmenes conservan el final, las demás el principio. Las que quedan después se omiten. `recortadas` lista las secciones cortadas u omitidas, para depurar.

## Co-escribir escena (IA)

Comando **Co-escribir escena** en una escena abierta. Elige **Borrador**, **Alternativa** o **Continuación**. Atlas pide la propuesta al endpoint de Ollama (`/api/generate`, ajustes **Endpoint** y **Modelo**) con la nota entera y su contexto de escena (skills, fichas, conocimiento y mundo: 8000 caracteres como máximo, sin contar la escena), y la muestra como diff contra la nota actual: `-` línea quitada, `+` línea añadida.

- **Rechazar** cierra el diff. La nota no cambia.
- **Aprobar** aplica la propuesta. Si la nota cambió mientras esperabas, no se aplica y hay que pedir otra.
- Borrador y alternativa conservan el frontmatter; continuación añade el texto al final.
- Cada decisión queda en el historial de la sesión (en memoria; se pierde al cerrar Obsidian).
- **Aprobar** guarda antes un respaldo de la nota (ver abajo). Si el respaldo falla, la nota no cambia.
- El contexto lleva skills, fichas, mundo y conocimiento; resúmenes y trama todavía no se cargan.

## Respaldos antes de cambios de IA

Antes de aplicar un cambio de IA, Atlas copia la nota tal como estaba en `.atlas/respaldos/<ruta de la nota sin .md>/<fecha ISO>.md`, dentro de la bóveda. Es una carpeta oculta: Obsidian no la indexa, así que no sale en búsquedas, enlaces ni en el grafo.

- **Restaurar respaldo de la nota**, con la nota abierta, lista sus versiones de la más nueva a la más vieja. Al elegir una, la nota vuelve a ese texto. El texto que tenía antes también se respalda, así que restaurar se puede deshacer.
- Retención, por nota y cada vez que se crea un respaldo: se quedan las 10 versiones más nuevas y se borran las de más de 7 días. La más nueva no se borra nunca.
- Atlas solo borra en esa carpeta archivos con nombre de respaldo (`2026-11-15T10-30-00.000Z.md`); los demás no se tocan.
