# QA v1 · #55 · PR #59 @ 7fc073f

Resultado: ❌ falla (1 hueco High).

| AC | Resultado | Prueba |
|---|---|---|
| AC1 🙋 + `done` verificado que rebota a Ready entra en `cards` | ❌ parcial | pasa solo si el head del PR no cambió desde el `done` (`tests/wave-plan.test.mjs:39`). Falla en el caso real del segundo atasco de #6 (`tests/wave-plan.test.mjs:75`, rojo) |
| AC2 🙋 sin `done` sigue con `humanGated: true` | ✅ | `tests/wave-plan.test.mjs:45` |
| AC3 un test cubre los dos casos | ✅ | `tests/wave-plan.test.mjs:39`, `:45` |

## Hueco (High)

Historia real de #6:
- a. El dueño comentó `done` sobre la petición pinneada a `4a33a73` (2026-11-14 04:53).
- b. Rebote a Ready por rebase con head `4a33a73`: el fix lo cubre (el head no cambió).
- c. El builder hizo rebase (`6295a17`), QA pasó (`4e98053`), el Reviewer rebotó a Ready por R5 (22:54).
- d. `super-board-approval.py --deps` ve `headChanged`: `needsYouDone=false`, `approvalRefresh=true`.
- e. `approved()` en `super-board-wave-plan.sh:151` exige `needsYouDone`: la tarjeta queda fuera de `cards`. El orquestador la despejó a mano (22:59).

Arreglado se ve así: una tarjeta en Ready cuyo último 🙋 ya tuvo un `done` verificado para una petición anterior entra en `cards` aunque el head haya cambiado. El merge gate vuelve a pedir aprobación para el head nuevo.

Cuidado: `approvalRefresh` sale `true` con solo cambiar el head, haya `done` o no (`super-board-approval.py:206`). No basta con usarlo: un 🙋 sin ningún `done` debe seguir fuera (AC2). Ajusta el fixture del test nuevo al campo que añadas.

## Comandos
- `node --test tests/wave-plan.test.mjs` → 4/5 (log: `wave-plan.log`)
- `npm test` → 125/126 (log: `npm-test.log`)
