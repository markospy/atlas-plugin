# QA #28 · v1 · respaldos antes de cambios de IA

Head probado: `0410c64` (+ tests de QA en este commit). Resultado: ✅ pasa.

Comandos: `npm test` 255/255 (`npm-test.log`) · `npm run build` limpio (`build.log`).

## AC → tests

| AC | Unit | Componente | Runtime (plugin real con adapter en memoria) |
|---|---|---|---|
| 1 · backup antes del cambio IA | `tests/backup.test.mjs:39` | `tests/cowrite-modal.test.mjs:142`, `:157` (falla el respaldo → no escribe) | `tests/backup-runtime.test.mjs:148` |
| 2 · comando restaura la versión elegida | `tests/backup.test.mjs:70`, `:81` | n/a: `RestoreModal` solo lista | `tests/backup-runtime.test.mjs:163`, `:184` |
| 3 · retención documentada y aplicada | `tests/backup.test.mjs:87`, `:99`, `:112`, `:122`, `:131` | — | README § "Respaldos antes de cambios de IA" |
| 4 · test de backup + restore | `tests/backup.test.mjs:70` | — | `tests/backup-runtime.test.mjs:163` |

## Huecos que escribió QA

- Alta: el cableado en `src/main.ts` (closure de respaldo en **Co-escribir**, `restoreBackup`) no tenía test. Nuevo `tests/backup-runtime.test.mjs`. Visto en rojo con 3 mutantes (sin respaldo al aprobar · restaurar sin respaldar el texto actual · restaurar sin escribir la nota) y vuelto a verde.
- Media: límites exactos de retención. Nuevo test `tests/backup.test.mjs:131`. Visto en rojo con `<` → `<=` y con off-by-one en `maxVersiones`.

## Huecos no escritos

- Media: la guarda `index > 0` de `prune` no se puede alcanzar desde `backup()` (la versión más nueva siempre es la de ahora). Ese mutante sobrevive; es código defensivo.
- Baja: al renombrar o mover una nota, sus respaldos quedan en la carpeta de la ruta vieja.
- Baja: doble clic en **Aprobar** mientras se guarda el respaldo crea un respaldo extra y avisa "La nota cambió"; no escribe dos veces.
- Baja: los checks manuales de `tests/obsidian.md` § #28 en Obsidian real no se corrieron aquí (no hay app de Obsidian en este entorno).

Sin capturas: el cambio es de comandos de Obsidian, sin página web que abrir con Playwright.
