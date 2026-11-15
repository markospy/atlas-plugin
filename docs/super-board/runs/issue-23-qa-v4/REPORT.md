# QA #23 · v4 · head `91e19aa`

Pasada de QA tras el gate 1 del revisor: cerrar el hilo `[qa]` R4 (`src/main.ts:308`).

| AC | Resultado | Prueba |
|---|---|---|
| AC1 Escenas pueden declarar marca temporal | ✅ | `tests/chronology.test.mjs:21` · `:101` · `:152` · `tests/chronology-qa.test.mjs:6` |
| AC2 Lugares/rutas declaran duración mínima | ✅ | `tests/chronology.test.mjs:41` · `:119` · `:125` · `:168` · `tests/chronology-qa.test.mjs:18` |
| AC3 El chequeo lista pares imposibles | ✅ | `tests/chronology.test.mjs:50` · `:135` · `:152` · aviso `:176` · `tests/chronology-qa.test.mjs:26` · `:49` |
| AC4 Test con viaje demasiado corto | ✅ | `tests/chronology.test.mjs:50` · límite exacto `:64` |

- `npm test`: 145/145 (`npm-test.log`); `npm run build` limpio (`build.log`)
- R4: el texto del aviso vive en `chronologyNotice` (`src/chronology.ts:149`) y `tests/chronology.test.mjs:176` lo prueba con 0, 1 y 2 hallazgos. Visto en rojo con dos mutantes (unir con espacio en vez de `\n`; texto vacío sin hallazgos) y en verde al restaurar
- Queda sin test: la lectura de la bóveda y el `timeout 0` del `Notice` en `src/main.ts:308`–`316` (sin harness de Obsidian). Son tres líneas de cableado; la lógica que probaba R4 ya es función pura
- Sin UI nueva salvo un `Notice`: sin capturas

## Huecos de test (no escritos)
Sin cambios desde v3:
- Medio: `dia: 3 # tarde` deja la escena fuera sin aviso
- Bajo: `[[Lugares/Faro.md]]` queda `Faro.md` y no casa con `Faro`
- Bajo: `viajes: ` con espacio final y `viajes: [{a: Faro, dias: 2}]` (flujo) dan `[]`
- Bajo: `dias: -2` se acepta como ruta y nunca avisa
- Fuera de alcance: el título pide edades; ningún AC (R12)
