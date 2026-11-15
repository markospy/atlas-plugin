# QA #23 · v3 · head `c8e3384`

| AC | Resultado | Prueba |
|---|---|---|
| AC1 Escenas pueden declarar marca temporal | ✅ | `tests/chronology.test.mjs:20` · `:100` · `:152` (sin mayúsculas) · `tests/chronology-qa.test.mjs:6` |
| AC2 Lugares/rutas declaran duración mínima | ✅ | `tests/chronology.test.mjs:40` · `:118` · `:124` · `:168` (comentarios YAML) · `tests/chronology-qa.test.mjs:18` |
| AC3 El chequeo lista pares imposibles | ✅ | `tests/chronology.test.mjs:49` · `:134` · `:152` · aviso `:176` · `tests/chronology-qa.test.mjs:26` · `:49` |
| AC4 Test con viaje demasiado corto | ✅ | `tests/chronology.test.mjs:49` · límite exacto `:63` |

- `npm test`: 145/145 (`npm-test.log`); `npm run build` limpio (`build.log`)
- Arreglos de la ronda 2 comprobados: R8 `:152`, R9 `:168`, R4 `chronologyNotice` `:176`, R10 `linkTarget` de `src/graph.ts:27` reusado, R11 `isManuscript` en `src/markers.ts` `:186`
- Test nuevo de QA `tests/chronology-qa.test.mjs:49`: ruta `[[Lugares/puerto]] # en barco` casa en sentido inverso con `[[Puerto]]` → `[[FARO]]`. Visto en rojo con dos mutantes (quitar el sentido inverso; comparar con mayúsculas) y en verde al restaurar
- `staging` (`d7fb4d8`) ya está en la rama: sin conflictos
- Sin UI nueva salvo un `Notice`: sin capturas; el comando no se probó dentro de Obsidian (sin harness)

## Huecos de test (no escritos)
Reproducidos con una sonda local, sin commit:
- Medio: `dia: 3 # tarde` deja la escena fuera sin aviso (el comentario sí se quita en `viajes`, no en `dia`)
- Bajo: `[[Lugares/Faro.md]]` queda `Faro.md` y no casa con `Faro`
- Bajo: `viajes: ` con espacio final y `viajes: [{a: Faro, dias: 2}]` (flujo) dan `[]`
- Bajo: `dias: -2` se acepta como ruta y nunca avisa
- Fuera de alcance: el título pide edades; ningún AC (R12)
