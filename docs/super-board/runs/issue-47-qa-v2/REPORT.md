# QA #47 · v2 · contra d81803f

Comando: `npm test` (57/57 pasan). Log: `npm-test.log`. Cambio no visual: sin capturas.

| AC | Test | Resultado |
|---|---|---|
| AC1 una PR no trivial pasa por un truth-check de agentes independientes del Reviewer | "el truth-check lo hacen dos agentes…", "qa: una tarjeta que pasa QA → Review…", "qa v2: los agentes de truth-check son independientes" | ✅ Code-grounder + Historian corren antes de `review:`; su prompt prohíbe escrituras |
| AC2 ningún Reviewer informa de "truth-check inline" | "el Reviewer nunca hace el truth-check inline" | ✅ a nivel de prompt; sin wave real |
| AC3 truth-check que no puede ejecutarse acaba en 🛡 Blocked, nunca mergeada | "truth-check que no puede ejecutarse…", "qa: resultado done sin headSha…" (fallo de v1, ahora verde), "resultado done con headSha vacío…", "qa v2: INCONCLUSIVE + Reviewer que bloquea…", "qa v2: SKIPPED pide al Reviewer bloquear…" | ✅ INCONCLUSIVE → el Reviewer recibe MUST NOT merge; si avanza, la wave lo marca `failed` |

Casos límite añadidos en v2: tarjeta que falla QA no lanza truth-check; mínimo de confianzas; independencia del prompt.

## Test gaps (not written)
- Medium: tras un halt de otra tarjeta, una tarjeta que pasa QA → Review en la misma wave lanza igual los dos agentes de truth-check (`runTruth` no mira `halted`, `super-board-wave.js:209`). El Reviewer no corre (`runLane` sí lo mira). Repro en scratch: historial `qa:advanced → truth:scored → review:halted`.
- Medium: AC3 "nunca mergeada" se apoya en el prompt del Reviewer y en marcar `failed` después; `super-board-merge-gate.sh` no comprueba el truth-check.
- Low: el backend Codex sigue haciendo el truth-check inline (`super-board-codex-lane.sh:105`, `run-workflow.md:33`); fuera del alcance de la wave de Claude.
- Low: `agent()` que lanza una excepción rechaza toda la wave (igual que las otras lanes).
