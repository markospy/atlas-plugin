# QA v2 · #55 · PR #59 @ 87bd7ac

Resultado: ✅ pasa (sin huecos High).

| AC | Resultado | Prueba |
|---|---|---|
| AC1 🙋 + `done` verificado que rebota a Ready entra en `cards` | ✅ | head igual: `tests/wave-plan.test.mjs:39`. Head movido tras el `done` (segundo atasco de #6): `tests/wave-plan.test.mjs:75`. Ruta real `approval.py --deps`: `tests/approval.test.mjs` "--deps: done sobre el head viejo…" |
| AC2 🙋 sin `done` sigue con `humanGated: true` | ✅ | `tests/wave-plan.test.mjs:45`, `:80`; `tests/approval.test.mjs` "--deps: head nuevo sin done…" |
| AC3 un test cubre los dos casos | ✅ | los de arriba |

## Test-gap check
- High, escrito: la ruta `main --deps` que rellena `needsYouAnswered` no tenía test. Añadidos 4 tests en `tests/approval.test.mjs` (done + head nuevo, sin done, 🙋 nuevo que anula el done viejo, done anterior al 🙋). Los 4 fallan contra `staging` y pasan en la rama.
- Seguridad: `needsYouAnswered` nunca pone `needsYouDone`; `resume` en Blocked sigue usando solo `needsYouDone`; el merge gate vuelve a pedir aprobación para el head nuevo.

## Test gaps (not written)
- Low: PR cerrado y reabierto como otro PR (`pr()` lanza "PR is not open"; la tarjeta queda fuera, conservador).

## Comandos
- `node --test tests/wave-plan.test.mjs tests/approval.test.mjs` → 16/16 (`targeted.log`)
- `npm test` → 133/133 (`npm-test.log`)
