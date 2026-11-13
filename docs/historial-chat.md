# Historial del chat: análisis de plugins de escritura y diseño de Atlas

Conversación del 13 de noviembre de 2026. Se recogen los mensajes del usuario y las respuestas finales del asistente (sin los pasos intermedios de herramientas).

---

## 🧑 Usuario

https://github.com/alfredclark/obsidian-novelists-assistant
https://github.com/leethobbit/obsidian-inkswell-plugin
https://github.com/eventidemiles/eventide-quill
https://github.com/stardustdreams/loreweaver
https://github.com/rebornwalker/penseed-obsidian

Esto 5 repos corresponden a plugins de obsidian que ayuda en la tarea de escribir. Revisalos y enumera los puntos fuertes y débiles de cada unos de ellos.

## 🤖 Asistente

Revisé los cinco repos leyendo el código y la documentación. No ejecuté sus tests ni los compilé, porque el entorno no permite correr código de terceros; los números de tests son recuentos de casos en el código fuente.

#### Resumen comparativo

| Plugin | Versión | Tamaño (TS) | Tests | IA | Enfoque |
|---|---|---|---|---|---|
| **Inkswell** | 1.26.0 | ~68k líneas | ~1.465 casos | Ninguna | Suite completa: planificar, escribir, revisar, publicar |
| **Eventide Quill** | 2.3.2 | ~56k líneas | ~1.250 casos + e2e | Local o en la nube | Linter de prosa + IA "editora" y co-escritora |
| **Novelists Assistant** | 0.4.1 | ~4,9k líneas | 0 | Ninguna | Maquetación y utilidades, muy orientado a novela china |
| **Penseed** | 1.0.63 | ~5,4k líneas | 0 | En la nube (SaaS) | Coherencia, foreshadowing y "lo que sabe el lector" |
| **Loreweaver** | 0.1.2 | ~1,2k líneas | 0 | Ollama local | Grafo de personajes + tablero de foreshadowing |

---

#### 1. Inkswell (leethobbit)

**Puntos fuertes**
- Es la propuesta más completa. Cubre todo el ciclo en una sola vista: Home, Plan (beat sheets, Kanban, rejilla de tramas por capítulo), Write (modo continuo, sprints, marcadores en línea), Revise, Publish y además Codex y Track.
- **Compatible con Longform.** Lee y escribe el mismo frontmatter `longform`, así que los proyectos existentes no necesitan migración. Sus datos propios van bajo la clave `inkswell`.
- Local de verdad: no hace llamadas de red, no tiene telemetría y no usa IA.
- Cuida mucho tus datos: carpeta "Inkswell conflicts" para versiones desplazadas, copias diarias de `data.json` durante 7 días, recuperación automática si el archivo se corrompe y una tabla clara de dónde vive cada dato.
- Ingeniería sólida: unos 1.465 casos de test, CI, ESLint con `eslint-plugin-obsidianmd`, stylelint y cero dependencias en tiempo de ejecución.
- Exporta a Word sin dependencias externas; PDF y EPUB vía pandoc, que se desactiva solo si no está instalado. Funciona en móvil, con interfaz adaptada a tablet y teléfono.
- Interfaz en 7 idiomas, aunque las traducciones son borradores opcionales.
- Documentación excelente, incluida una guía de importación desde una carpeta, Scrivener o Word.

**Puntos débiles**
- Proyecto joven y muy rápido: empezó en junio de 2026 y ya va por la 1.26. Hay riesgo de regresiones y de cambios de interfaz frecuentes.
- Muy pesado y con mucha curva de aprendizaje. Algunos archivos son enormes, como `write-panel.ts` con 2.541 líneas.
- Guarda beats, revisiones, checklists y ajustes de compilación en el frontmatter de la nota índice, que puede crecer mucho y entrar en conflicto al sincronizar entre dispositivos (el propio README lo advierte).
- Importar proyectos que no vienen de Longform es manual: hay que añadir escena por escena y solo detecta notas directamente en la carpeta de escenas, sin subcarpetas.
- Sin IA por diseño, una ventaja o un inconveniente según quién lo use.
- Lo mantiene una sola persona.

#### 2. Eventide Quill (eventidemiles)

**Puntos fuertes**
- Enfoque "primero feedback": se presenta como editor, no como generador de texto. Tiene un linter de prosa determinista y sin coste (voz pasiva, adverbios, repeticiones, telling vs. showing) más reglas específicas para detectar muletillas típicas de la IA.
- Proveedores flexibles: Ollama o LM Studio por defecto, cualquier endpoint compatible con OpenAI y conectores nativos de Anthropic (con prompt caching) y Gemini. Asigna modelos por función: chat, embeddings y visión.
- Funciona por capas: sin modelo ya sirven el linter, el dashboard y el extractor de personajes; con modelo se activan el resto de funciones.
- Co-escritor con herramientas (leer notas, grep, proponer ediciones) que **siempre muestra un diff que apruebas o rechazas**; nunca escribe directamente. Incluye subagentes y compactación automática del contexto, muy útil con modelos locales.
- Seguridad cuidada: `fetch_url` bloquea redes privadas y localhost (protección SSRF), Fandom va limitado por una lista de dominios permitidos, y puede limpiar metadatos EXIF/GPS de las imágenes.
- La ingeniería más madura del grupo: unos 1.250 tests unitarios, tests e2e en Obsidian real (wdio), detección de código duplicado (jscpd), detección de código huérfano (knip) y CI de lint y e2e. MIT, sin muros de pago.

**Puntos débiles**
- Archivos monolíticos: `main.ts` tiene 6.492 líneas, `settings.ts` 3.986 y `co-writer.ts` 4.774. Eso hace el código difícil de mantener y de revisar.
- Exceso de funciones (lorebook, coach, visión, Fandom, cola asíncrona, memorias…) y unos ajustes enormes. Abruma a quien solo quiere escribir.
- El README orienta a desarrolladores: el "Quick start" es clonar y compilar, y apenas explica la instalación para usuarios finales.
- Las funciones con IA dependen de la calidad del modelo; con modelos locales pequeños el resultado puede ser flojo. Con proveedores en la nube el manuscrito sale de tu equipo, aunque solo si lo configuras.
- El linter de prosa parece pensado sobre todo para inglés.
- Un único mantenedor y un proyecto también reciente (junio de 2026).

#### 3. Novelists Assistant (alfredclark)

**Puntos fuertes**
- Herramientas prácticas y concretas para quien escribe a diario: sangría de primera línea, interlineado, fuentes separadas para edición y lectura, y líneas de cuaderno de manuscrito.
- Gestión de capítulos y volúmenes: crea el siguiente capítulo con numeración automática (incluidos números chinos), crea y disuelve volúmenes y renumera con vista previa.
- Excelente para escritura en chino: cierra automáticamente los signos de puntuación (compatible con el método de entrada), cuenta caracteres CJK individualmente y tiene interfaz en chino simplificado y tradicional.
- Panel lateral de "Lore" y "Outline" con búsqueda y vista previa, y enlazado automático de los nombres del lore en la nota.
- Código modular y ordenado (una carpeta por función, Svelte para la interfaz), con ESLint, Prettier, stylelint y svelte-check.

**Puntos débiles**
- Solo escritorio (`isDesktopOnly: true`).
- Sin tests.
- La exportación es básica: portapapeles y `.txt`, sin DOCX, EPUB ni PDF.
- No tiene planificación ni foreshadowing reales (solo carpetas), ni estadísticas de progreso.
- Muy orientado a la novela web china: varias funciones aportan poco a quien escribe en español o inglés.
- Versión 0.x y licencia GPL-3.0, más restrictiva si quieres reutilizar el código.

#### 4. Penseed (rebornwalker)

**Puntos fuertes**
- La propuesta conceptual más original: separa **lo que sabe el lector** de lo que sabe cada personaje, para evitar desvelar giros antes de tiempo o crear ironía dramática a propósito.
- Seguimiento del foreshadowing de principio a fin (sembrado → seguimiento → resolución), detección de contradicciones y reglas del mundo.
- Análisis incremental: lee cada capítulo una vez, y si editas uno antiguo calcula qué capítulos posteriores quedan afectados y los vuelve a analizar en orden. Escala bien a cientos de capítulos.
- Buen flujo de usuario: inicio de sesión con código de dispositivo sin copiar tokens, guarda el token en el SecretStorage de Obsidian, tablero Kanban sincronizado con la web y salto con resaltado a la frase exacta del capítulo.
- Política de privacidad clara: por defecto no guarda el texto original, y la opción de guardarlo (cifrado) es voluntaria.

**Puntos débiles**
- **Es solo un cliente de un SaaS de pago** (penseed.app). Toda la inteligencia está en un servidor cerrado: necesitas cuenta de Google, sistema de créditos y cuota, y si el servicio desaparece el plugin deja de servir.
- **Tu manuscrito sale de tu equipo** hacia un tercero, un problema serio para muchos autores.
- Exige analizar en orden estricto desde el capítulo 1; un error de orden "contamina" todo lo posterior (el propio README lo admite).
- Código frágil: `main.ts` de 1.962 líneas, sin tests, sin lint ni CI, y el `main.js` compilado está metido en el repositorio.
- Gran parte de la funcionalidad completa, como editar relaciones, remite a la web.

#### 5. Loreweaver (stardustdreams)

**Puntos fuertes**
- Simple y transparente: todo vive en el frontmatter (`type: character`, `relations`, `type: foreshadow`, `resolved`). No hay base de datos propia y desactivar el plugin no pierde nada.
- Privacidad garantizada en el código: la IA solo habla con Ollama y el cliente **rechaza cualquier host que no sea localhost o 127.0.0.1**, aunque se edite la configuración a mano.
- La IA solo propone: las relaciones sugeridas se eligen con casillas antes de aplicarlas y nada se escribe sin confirmación.
- Grafo de relaciones propio en SVG, ligero y sin dependencias; plantillas de mundo (lugar, organización, término…).
- Código pequeño y fácil de auditar (unas 1.200 líneas).

**Puntos débiles**
- Muy inmaduro: versión 0.1.2, 5 commits hechos en un solo día y pendiente de aprobación en el directorio de plugins.
- **La interfaz está solo en japonés** (comandos, ajustes y avisos), aunque el README esté en inglés.
- El foreshadowing es manual: hay que marcar `resolved: true` a mano.
- La búsqueda de resolución por IA es ingenua: toma solo los **primeros 200 caracteres** de las **primeras 40 notas** de la bóveda, sin ningún criterio de relevancia, así que en una novela real casi nunca encontrará el pasaje bueno.
- Algún detalle descuidado; por ejemplo, `resolveDisplay` tiene un ternario que devuelve lo mismo en ambas ramas (`frontmatterIndex.ts:84`).
- Sin tests, sin lint ni CI y alcance funcional muy limitado.

---

#### Conclusión rápida

- **Para el proceso completo sin IA:** Inkswell, el más completo y pulido, sobre todo si ya usas Longform.
- **Para recibir feedback sobre tu prosa (con o sin IA) y controlar dónde va el texto:** Eventide Quill, con la mejor ingeniería y la mejor seguridad del grupo.
- **Para escribir en chino o necesitar maquetación y numeración de capítulos:** Novelists Assistant.
- **Para series largas y muy complejas, si aceptas un servicio en la nube de pago:** Penseed, con una idea única pero dependencia total de un servidor cerrado.
- **Loreweaver** es por ahora más una prueba de concepto que una herramienta lista para usar, sobre todo si no lees japonés.

Si quieres, ejecuto los tests de Inkswell y Eventide Quill para confirmar que pasan; para eso tendrías que permitir que instale sus dependencias y corra su código.

---

## 🧑 Usuario

Si te pidiera crear un plugin tomando las mejores ideas de estos 5 plugins para crear uno propio que me ayude en mi proceso creativo de escribir ficción, ¿cómo lo diseñarías? Te enumero mis feature claves y me dices cómo podrían complementarlo. Ahí voy. Primera feature. Tener un apartado de fichas de personaje. Ahí se hace la descripción física, psicológica de cada personaje. Se establecen relaciones entre ellos, ya sea usando tags u otro tipo de conectores. Plantillas de lugares, escenas claves, pueden ser edificios, habitaciones, donde ocurrirán gran parte de las tramas o escenas claves de la novela. Ahí se pueden describir la escena, es decir, objetos decoradores, el ambiente, la iluminación, todo lo que pueda ayudar a tener un contexto a la hora de insertar estas cosas, estos lugares en la historia. Plantillas de otros objetos claves, ya sean armas, animales, pertenencias de los personajes, es decir, cosas que sean de gran importancia en la historia o que tengan algún tipo de relevancia sentimental o material para los personajes o la historia. Además de esto, me gusta la idea de que cada personaje tenga una memoria que es independiente de la memoria del lector, del que lee. Esa separación está muy bien. Asimismo, hay que tener una plantilla de la trama o argumento para poder enriquecer la historia. Además de eso, me gusta la idea de que se establezca un grafo que relacione cada capítulo, de manera que si algo cambia en un capítulo, esto se pueda actualizar en los capítulos siguientes. Todo este contexto de conocimiento también servirá de contexto para una inteligencia artificial que ayudará en el proceso de creación de la historia. Además de un apartado de skills donde el escritor podrá establecer ciertos skills o ciertas reglas literarias de estilo que el modelo de lenguaje debe velar. Estos son mis requerimientos.

## 🤖 Asistente

#### Diseño propuesto: un plugin de escritura de ficción (nombre provisional: **Atlas**)

Tus requisitos tienen un eje común: **todo lo que el escritor sabe de su historia se guarda en un formato que tanto él como la IA pueden consultar**. Por eso el diseño parte de un único modelo de datos, y cada función (fichas, memoria, grafo de capítulos, IA) es una forma distinta de usarlo.

#### 1. Principios de diseño (tomados de los 5 plugins)

| Principio | De dónde viene | Por qué |
|---|---|---|
| **Markdown + frontmatter como única fuente de verdad** | Loreweaver, Inkswell | Puedes leer, editar y sincronizar tus datos sin el plugin; desactivarlo no pierde nada |
| **Local primero, la IA es opcional** | Inkswell, Eventide | Las fichas, el grafo y la memoria funcionan sin IA; la IA es un añadido |
| **La IA propone y tú apruebas, con diff** | Eventide, Loreweaver | Nunca escribe en tus notas sin confirmación |
| **Análisis incremental por capítulo** | Penseed | No vuelve a leer el libro entero en cada consulta: escala a novelas largas y abarata los tokens |
| **Proveedores intercambiables** | Eventide | Ollama o LM Studio en local, o la nube (Anthropic, OpenAI) si lo eliges |
| **Seguridad de datos** (copias, carpeta de conflictos) | Inkswell | Un plugin que toca tu manuscrito no puede perder texto |
| **Compatible con Longform** | Inkswell | Puedes migrar proyectos existentes sin trabajo extra |

#### 2. Estructura en la bóveda

```
Mi Novela/
├── Mi Novela.md            ← nota índice (orden de capítulos, metadatos)
├── Manuscrito/             ← capítulos/escenas (texto que lee el lector)
├── Personajes/
├── Lugares/
├── Objetos/
├── Trama/                  ← argumento, arcos, subtramas, foreshadowing
├── Estilo/                 ← tus "skills" literarias
└── _Memoria/               ← generado: una ficha de análisis por capítulo (editable)
```

#### 3. Tus funciones y cómo las complementaría

##### 3.1 Fichas de personaje

Una plantilla con secciones fijas: aspecto físico, psicología (deseo, miedo, herida, contradicción), voz (forma de hablar, muletillas, registro) y arco (estado inicial → estado final).

**Relaciones: mejor conexiones tipadas en el frontmatter que tags.** Un tag como `#familia` no dice *quién* es familia de *quién* ni en qué dirección. Una relación tipada sí:

```yaml
---
tipo: personaje
nombre: Elena Ruiz
alias: [la Doctora, Ele]
relaciones:
  - con: "[[Marcos]]"
    tipo: hermano
  - con: "[[Iván]]"
    tipo: rival
    desde: "[[Cap 07]]"
    nota: "Desde que él la delató"
---
```

**Lo que yo añadiría:**
- **Relaciones que cambian con el tiempo** (`desde` / `hasta`): Elena e Iván son amigos hasta el capítulo 7 y rivales después. El grafo de relaciones se puede ver "en el capítulo N".
- **Alias** para detectar automáticamente en qué escenas aparece cada personaje (idea de Inkswell).
- **Voz del personaje como skill** (ver 3.6): que la IA sepa que Marcos nunca dice palabrotas.
- **Grafo visual** de relaciones (Loreweaver), filtrable por tipo de relación y por capítulo.

##### 3.2 Lugares y escenarios clave

La plantilla seguiría lo que propones (objetos, decoración, ambiente, iluminación) y la organizaría **por sentidos**, que es justo lo que necesitas al insertar el lugar en una escena:

- **Vista** (iluminación por momento del día), **sonido**, **olor**, **tacto/temperatura**.
- **Disposición**: qué hay a la entrada, qué se ve desde la ventana, salidas.
- **Atmósfera emocional**: qué debe sentir el lector en este lugar.
- **Lugares anidados**: habitación ⊂ casa ⊂ barrio ⊂ ciudad (como el Codex de Inkswell). La IA hereda el contexto: si la habitación está en una casa en ruinas, lo sabe.

**Lo que yo añadiría: el estado del lugar a lo largo de la historia.** En el capítulo 12 la casa se incendia; a partir de ahí, cualquier escena allí debe reflejarlo.

##### 3.3 Objetos clave

Plantilla con: descripción, origen, **valor material vs. valor sentimental** (para quién y por qué) y función en la trama (¿es una pistola de Chéjov?).

**Lo que yo añadiría:**
- **Quién lo tiene en cada momento.** Es el error de continuidad más típico: la espada que estaba en manos de A aparece en manos de B sin explicación. Cada cambio de poseedor queda registrado en un capítulo.
- **Vínculo con el foreshadowing:** si el objeto se presenta en el capítulo 3 con peso narrativo, el plugin te avisa si nunca vuelve a usarse.

> **Idea unificadora:** personajes, lugares y objetos comparten lo mismo: **una ficha estática + una línea de tiempo de cambios de estado por capítulo**. Así una sola consulta, "¿cómo está el mundo en el capítulo 15?", responde todo a la vez: quién sabe qué, quién tiene qué, qué lugares siguen en pie, qué relaciones hay.

##### 3.4 Memoria del personaje separada de la del lector

Esta es la parte más potente. La unidad básica sería el **hecho**: una afirmación sobre la historia con su identificador.

```yaml
# _Memoria/Cap 05.md  (generado por la IA, revisado por ti)
hechos:
  - id: asesino-mayordomo
    texto: "El mayordomo mató a Lord Ashby"
    verdad: true
conocimiento:
  - hecho: asesino-mayordomo
    quien: lector
    estado: sospecha          # ignora | sospecha | cree-falso | sabe
  - hecho: asesino-mayordomo
    quien: "[[Elena]]"
    estado: sabe
```

Con esto puedes consultar **"¿qué sabe Elena en el capítulo 12?"** y **"¿qué sabe el lector en el capítulo 12?"**, y detectar:
- **Desvelar un giro antes de tiempo:** un personaje menciona algo que el lector aún no debería saber.
- **Ironía dramática** (el lector sabe más que el personaje), mostrada como algo intencional, no como un error.
- **Personaje omnisciente:** actúa según información que no tiene.
- **Falsas creencias:** Elena *cree* algo falso, y el estado `cree-falso` lo registra.

Esto toma la idea de Penseed, pero **local y en archivos tuyos**, no en un servidor de pago.

##### 3.5 Trama y grafo de capítulos con propagación de cambios

**Plantilla de trama:** premisa, tema, conflicto central, arcos por personaje, subtramas y un esqueleto de estructura elegible (tres actos, Save the Cat, viaje del héroe, como Inkswell). Cada escena admitiría campos de **objetivo / conflicto / resultado**, **POV** y **subtrama**.

**El grafo de capítulos** no sería solo "el 5 va antes que el 6", sino un **grafo de dependencias**:

```
Cap 03 ──introduce──▶ [hecho: la carta existe]
                              │
Cap 09 ──usa─────────────────┘   (Elena lee la carta)
Cap 14 ──usa─────────────────┘   (se menciona la carta)
```

**Flujo cuando editas un capítulo:**
1. El plugin detecta que el texto del capítulo 3 cambió.
2. Vuelve a analizarlo y compara los hechos de antes y de después: la carta ya no existe.
3. Sigue el grafo y marca como **desactualizados** solo los capítulos que dependían de ese hecho (el 9 y el 14), no los 40 siguientes.
4. Te muestra la lista con el motivo ("El cap. 9 usa 'la carta', que ya no se introduce"). Tú decides: reanalizar en orden, corregir a mano o pedir a la IA una propuesta de cambio con diff.

**Lo que yo añadiría:**
- **Foreshadowing como hecho especial** con estados *sembrado → reforzado → resuelto*, y un tablero de pistas sin resolver.
- **Registro de decisiones** (idea de Inkswell): "a partir de ahora, la posada se llama El Reyezuelo". Sigues escribiendo hacia delante y el plugin te deja la lista de capítulos anteriores que hay que corregir.
- **Cronología interna** (fechas, edades, duración de viajes), para detectar que alguien llega en dos días a un sitio que está a una semana.

##### 3.6 Skills / reglas de estilo

Cada skill sería una nota en `Estilo/` con estructura fija, y se usaría **en los dos sentidos**: como instrucción al **generar** y como criterio al **revisar**.

```yaml
---
tipo: skill
nombre: Sin adverbios en -mente en diálogos
alcance: global          # global | personaje | POV | capítulo | escena
aplica_a: []             # p. ej. ["[[Marcos]]"] para la voz de un personaje
severidad: aviso         # sugerencia | aviso | obligatoria
verificacion: patron     # patron (sin IA) | ia
patron: '\b\w+mente\b'   # solo si verificacion = patron
---
## Regla
Evitar adverbios en -mente en las acotaciones de diálogo.

## Ejemplo mal
—No —dijo tristemente.

## Ejemplo bien
—No. —Apartó la mirada.
```

**Lo que yo añadiría:**
- **Dos tipos de verificación**, como hace Eventide: reglas **deterministas** (expresiones regulares, conteos: gratis e instantáneas, se subrayan mientras escribes) y reglas **interpretativas** que evalúa la IA ("mostrar, no contar", "tono melancólico").
- **Alcance**: una regla puede aplicar a todo el libro, a un POV, a la voz de un personaje o a un capítulo concreto.
- **Ejemplos buenos y malos**: es lo que más mejora el cumplimiento de un modelo de lenguaje.
- **Hallazgos con referencia a línea** y botón de "ignorar aquí" para excepciones intencionadas.
- **Linter adaptado al español**: el de Eventide está pensado para inglés; aquí habría que reconstruir las reglas (leísmo, gerundios encadenados, "dijo" repetido, raya de diálogo bien puesta, etc.).

#### 4. La IA: cómo usa todo este conocimiento

La clave es **no mandarle el libro entero**, sino montarle el contexto justo para cada tarea:

```
Petición: "Ayúdame con la escena del capítulo 15 en la biblioteca"
        │
        ▼
 Constructor de contexto
  ├── Skills aplicables (globales + POV + personajes presentes)
  ├── Fichas de los personajes, lugar y objetos de la escena
  ├── Estado del mundo en el cap. 15 (relaciones, posesiones, lugares)
  ├── Conocimiento: qué sabe cada personaje presente / qué sabe el lector
  ├── Resúmenes de capítulos anteriores (desde _Memoria/, no el texto completo)
  ├── Trama: subtrama activa, beats pendientes, pistas sin resolver
  └── Texto actual de la escena
        │
        ▼
 Modelo (local o nube) → propuesta → diff → apruebas / rechazas
```

**Modos de la IA:**
- **Consultar**: "¿qué sabe Iván de la carta en este punto?", "¿dónde estaba la espada en el cap. 10?".
- **Revisar**: comprobar la escena contra las skills, la continuidad y el conocimiento ("Elena menciona el veneno pero aún no lo sabe").
- **Co-escribir**: proponer borradores, alternativas o continuaciones respetando voz y reglas, siempre como propuesta.
- **Extraer**: tras escribir un capítulo, proponer qué hechos, cambios de estado y apariciones registrar en `_Memoria/`. Tú validas.

**Salvaguardas:**
- La memoria la escribe la IA, pero **tú la revisas**: un hecho mal extraído contamina todo lo que viene después (el problema que reconoce Penseed).
- **Presupuesto de contexto y compactación** (Eventide), imprescindible con modelos locales pequeños.
- **Lista blanca de proveedores** (como el bloqueo a localhost de Loreweaver) para que el manuscrito no salga del equipo sin que lo decidas tú.

#### 5. Otras funciones que lo complementarían

- **Detección automática de menciones**: cada ficha lista las escenas donde aparece su personaje, lugar u objeto.
- **"Vista lateral" mientras escribes** (Inkswell): al pasar sobre un nombre, ves su ficha y su estado *en ese capítulo*.
- **Metas y estadísticas**: palabras por día, rachas, fecha límite.
- **Marcadores rápidos** al escribir (`[INVESTIGAR: …]`, `[TK]`) para no romper el ritmo.
- **Exportación** a DOCX, EPUB y PDF.
- **Copias de seguridad automáticas** antes de cualquier cambio que haga la IA.

#### 6. Hoja de ruta sugerida

| Fase | Contenido | Necesita IA |
|---|---|---|
| **1. Base** | Plantillas (personaje, lugar, objeto, trama, escena), índice de entidades, relaciones tipadas, grafo de relaciones, detección de menciones | No |
| **2. Tiempo** | Líneas de estado por capítulo, memoria personaje/lector registrada a mano, tablero de foreshadowing, consulta "estado en el cap. N" | No |
| **3. Estilo** | Skills, linter determinista en español | No |
| **4. IA** | Proveedores, constructor de contexto, revisión con skills, co-escritura con diff | Sí |
| **5. Propagación** | Extracción automática de hechos, grafo de dependencias, marcado de capítulos desactualizados y reanálisis en orden | Sí |

Empezar sin IA tiene una ventaja: las fases 1 a 3 ya son útiles por sí solas, y cuando llegue la IA tendrá datos bien estructurados con los que trabajar.

#### 7. Riesgos

- **Coste de mantenimiento para el escritor**: si registrar hechos y estados da mucho trabajo, no se hará. Por eso la IA debe proponerlos y tú solo validarlos, y todo debe ser opcional.
- **Errores de la IA al extraer**: un hecho mal registrado se propaga. Revisión humana obligatoria y posibilidad de corregir cualquier ficha de `_Memoria/` a mano.
- **Alcance**: Eventide e Inkswell muestran que es fácil acabar con 60.000 líneas y unos ajustes inmanejables. Conviene mantener el núcleo pequeño.

Si quieres, lo siguiente puede ser concretar el esquema completo del frontmatter de cada plantilla, o montar el esqueleto del plugin con la fase 1. También puedo pasar este diseño a un documento para que lo vayas editando.

---

## 🧑 Usuario

Ves el repositorio mio que asocie a este chat?

## 🤖 Asistente

No del todo: esta sesión no tiene ningún repositorio asociado (el directorio de trabajo no es un repo git). Pero en tu cuenta de GitHub encontré **`markospy/atlas-plugin`** (público, actualizado hace unos 30 minutos), que por el nombre parece ser el tuyo. Lo cloné en modo lectura y **está vacío**: todavía no tiene ningún commit ni archivo.

Intenté asociarlo a la sesión con permiso de escritura, pero el modo automático lo bloqueó. Sin ese permiso puedo leerlo, pero no subir cambios.

Si quieres que monte ahí el esqueleto del plugin (fase 1 del diseño), tienes dos opciones:
- **Permitir esta acción** cuando te la vuelva a pedir, o añadir una regla de permiso para `mcp__claude-code-remote__add_repo`.
- **Iniciar una sesión nueva** con `markospy/atlas-plugin` seleccionado como repositorio.

Confírmame si es ese repo y cuál de las dos opciones prefieres.

---

## 🧑 Usuario

Guarda el historial de este chat en ese repositorio

## 🤖 Asistente

Repositorio `markospy/atlas-plugin` asociado a la sesión; este historial se guardó en `docs/historial-chat.md`.
