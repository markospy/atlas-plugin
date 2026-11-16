# Run 2026-11-14 · atlas-plugin

| Card | Lanes | Estado | Columna | Detalle |
|---|---|---|---|---|
| #5 | build:blocked | blocked | Blocked | worktree imposible: `.claude/worktrees` y `.claude/super-board/cache` son de root |
| #6 | build:failed | failed | Ready | worktree imposible (carpetas de root); sin código, rama local borrada |
| #8 | build:failed | failed | Ready | worktree imposible (carpetas de root); sin código, rama local borrada |
| #10 | build:failed | failed | Ready | worktree imposible (carpetas de root); sin código, rama local borrada |
| #13 | build:failed | failed | Ready | worktree imposible (carpetas de root); sin código, rama local borrada |
| #6 | build → qa → review:bounced | bounced | Ready | review limpio; conflicto con staging (README.md, src/main.ts) → loop:rebase · PR #38 |
| #8 | build → qa → review:bounced | bounced | Ready | loop:rebuild-1: wikilink con ruta duplica nodo; lee Personajes/ de todo el vault · PR #36 |
| #10 | build → qa → review:human-gate | human-gate | Blocked | 420 líneas > 400 → merge humano · PR #35 |
| #13 | build → qa → review | advanced | Done | mergeado 0a355b5 en staging · PR #37 |
| #5 | build → qa → review | advanced | Done | mergeado 68de578 en staging · PR #41 |
| #6 | build → qa → review:human-gate | human-gate | Blocked | 443 líneas > 400 → merge humano · PR #38 |
| #8 | build → qa → review:bounced | bounced | Ready | loop:rebuild-2: R3 chapterNumber; conflicto tests/obsidian.md · PR #36 |
| #14 | build → qa → review:bounced | bounced | Ready | loop:rebuild-1: `---` marcado como raya; gerundios cortos · PR #42 |
| #39 | preflight:blocked | blocked | Blocked | en secuencia tras #10, #6 |
| #40 | preflight:blocked | blocked | Blocked | en secuencia tras #10, #39 |
| #7 | build → qa → review:bounced | bounced | Ready | loop:rebuild-1: alias en YAML de bloque no detectados; alias con coma · PR #44 |
| #8 | build → qa → review:human-gate | human-gate | Blocked | 779 líneas > 400 → merge humano; conflicto con staging · PR #36 |
| #9 | build → qa → review | advanced | Done | mergeado d9b7521 en staging · PR #43 |
| #14 | build → qa → review:human-gate | human-gate | Blocked | 614 líneas > 400 → merge humano · PR #42 |

🛑 run parada tras la wave 4 — block-rate 6/17 (35 %) > 30 %
| #7 | build → qa → review:blocked | blocked | Blocked | 🛡 truth-check sin sub-agentes en el lane (752 líneas) · PR #44 |
| #7 | merge humano | advanced | Done | PR #44 mergeada por el dueño · aa65deb en staging |
| #6 | review:bounced | bounced | Ready | aprobada; conflicto con staging (README.md, src/main.ts) → loop:rebase · PR #38 |
| #8 | review:bounced | bounced | Ready | aprobada; conflicto (src/main.ts, tests/obsidian.md) → loop:rebase · PR #36 |
| #10 | review:bounced | bounced | Ready | R2 sin arreglar (chapterNumber) + conflicto → loop:rebase, rebuild-1 · PR #35 |
| #14 | review:bounced | bounced | Ready | limpia; conflicto (README.md, tests/obsidian.md) → loop:rebase · PR #42 |
| #46 | build → qa → review | advanced | Done | mergeado 04953a6 · PR #49 |
| #47 | build → qa:bounced | bounced | Ready | QA AC3: truth-check sin headSha se puntúa → rebuild-1 · PR #50 |
| #48 | build → qa → review | advanced | Done | mergeado 458f950 · PR #51 |
| #6 | build:halted | halted | Ready | rebase local 6295a17 sin push; halt GitHub (consulta mal formada en #35) |
| #8 | build:halted | halted | Building | rebase e6790b5 subido; handoff a medias por el halt |
| #10 | build:halted | halted | Ready | provocó el halt: `--slurp` con `--jq` |
| #14 | build:halted | halted | Ready | no empezó |
| #47 | build:halted | halted | Ready | no empezó |

↻ halt reanudado con la lectura corregida; motivo archivado
| #6 | build:halted | halted | QA | rebase 6295a17 subido; en QA |
| #8 | build → qa:halted | halted | QA | rebase listo; QA no empezó |
| #10 | build:halted | halted | Ready | rebase + R2 (84baa58) subidos por el orquestador para preservarlos |
| #14 | build:halted | halted | Ready | rebase + R5 (e7d2abf) subidos; handoff pendiente |
| #47 | build:halted | halted | Ready | provocó el halt: `--slurp` con `--jq` (2.ª vez) |

↻ halt reanudado otra vez; reclamos liberados antes de reanudar (desvío del protocolo, sin efecto)
| #52 | preflight:blocked | blocked | Blocked | en secuencia tras #47 (mismo super-board-wave.js) |
| #6 | qa → review:bounced | bounced | Ready | R5: parseScene con CRLF; usar src/frontmatter.ts → rebuild-1 · PR #38 |
| #8 | qa → review:human-gate | human-gate | Blocked | 1009 líneas > 1000 → merge humano · PR #36 |
| #10 | build → qa → review:bounced | bounced | Ready | R3: el cuerpo de la PR describe otra cosa → rebuild-2 · PR #35 |
| #14 | build → qa → review | advanced | Done | mergeado 9b3b5d6 · PR #42 |
| #47 | build → qa → review:blocked | blocked | Blocked | 🛡 truth-check no ejecutable sin sub-agentes · PR #50 |
| #47 | merge humano | advanced | Done | PR #50 mergeada por el dueño · 8563d94 en staging |
| #8 | truth → review:bounced | bounced | Ready | R7: `hasta` inclusivo en graph.ts vs exclusivo en world.ts → rebuild-3 · PR #36 |
| #6 | build → qa → truth → review | advanced | Done | mergeado 738f486 · PR #38 |
| #10 | build → qa → truth → review:bounced | bounced | Ready | limpia; conflicto de imports en src/main.ts → loop:rebase · PR #35 |
| #52 | build → qa → truth → review | advanced | Done | mergeado 9edee7c · PR #53 |
| #8 | build → qa → truth → review | advanced | Done | mergeado 80d781c · PR #36 |
| #10 | build → qa → truth → review | advanced | Done | mergeado be48778 · PR #35 |
| #23 | build → qa → truth → review:bounced | bounced | Ready | R1: wikilinks con ruta dejan pasar viajes imposibles; R2: rutas por nombre → rebuild-1 · PR #54 |
| #11 | build → qa → truth → review | advanced | Done | mergeado d7fb4d8 · PR #56 |
| #12 | build → qa → truth → review:bounced | bounced | Ready | R1: creencia falsa marcada como error omnisciente; R2: modo inválido sin aviso → rebuild-1 · PR #58 |
| #16 | build → qa → truth → review:bounced | bounced | Ready | R1: `---` inicial tomado como frontmatter → rebuild-1 · PR #57 |
| #23 | build → qa → truth → review:bounced | bounced | Ready | R8: enlaces en minúsculas no se detectan → rebuild-2 · PR #54 |
| #39 | preflight:blocked | blocked | Blocked | en secuencia tras #23 (src/places.ts) |
| #55 | build → qa:bounced | bounced | Ready | QA AC1: aprobación sobre head viejo sigue frenando → rebuild-1 · PR #59 |
| #12 | build → qa → truth → review:bounced | bounced | Ready | R6: hecho sin declarar da spoiler falso → rebuild-2 · PR #58 |
| #16 | build → qa → truth → review | advanced | Done | mergeado 887dcb7 · PR #57 |
| #23 | build → qa → truth → review:bounced | bounced | QA | hilo [qa] R4 sin resolver → vuelve a QA · PR #54 |
| #55 | build → qa → truth → review | advanced | Done | mergeado 11d6bf3 · PR #59 |
| #23 | qa → truth → review:blocked | blocked | Blocked | 🛡 tope de rebuilds (2) con R13 abierto: personaje compartido entre libros · PR #54 |
| #12 | build → qa → truth → review:human-gate | human-gate | Blocked | 1101 líneas > 1000 → merge humano · PR #58 |
| #18 | build → qa → truth → review:bounced | bounced | Ready | R1: escena recortada no llega al prompt → rebuild-1 · PR #61 |
| #19 | build → qa:bounced | bounced | Ready | QA AC2: `---` de cierre pegado al hecho sin frontmatter → rebuild-1 · PR #60 |
| #18 | build → qa → truth → review:human-gate | human-gate | Blocked | 1178 líneas > 1000 → merge humano · PR #61 |
| #19 | build → qa:bounced | bounced | Ready | QA AC2: aprobar borra comentarios y campos de otras entradas → rebuild-2 · PR #60 |

🛑 run parada tras la wave 16 — block-rate 5/14 (36 %) > 30 %; 3 esperan al dueño (#12, #18, #23)
| #23 | merge manual | merged | Done | el dueño fusionó PR #54 (809edd4); R13 → ticket #62 en Backlog |
| #18 | rebase | conflicto | Ready | PR #61 choca en `src/main.ts` tras #54 → builder hace rebase; la aprobación se pide de nuevo |

▶️ run reanudada (wave 17)
| #12 | merge manual | merged | Done | el dueño fusionó PR #58 (fe91686) |
| #39 | sweep | swept | Ready | liberada por #23 |
| #18 | build → qa → truth → review:human-gate | human-gate | Blocked | rebase hecho; 1231 líneas > 1000 → merge humano · PR #61 @ fba43c1 |
| #19 | build → qa:bounced | blocked | Blocked | QA v3 AC2 (frontmatter duplicado) → loop:rebuild-3 > cap 2 → 🛡 · PR #60 |
| #17 | build → qa → truth → review:bounced | bounced | Ready | R1 jsonArray con corchetes en prosa; R2 lee notas de todo el vault → rebuild-1 · PR #64 |
| #39 | build → qa → truth → review | merged | Done | squash fc9bdac en staging · PR #63 |
| #40 | sweep | swept | Ready | liberada por #10 y #39 |
| #17 | build → qa → truth → review:bounced | bounced | Ready | R7: firstArray parsea cada [ ] → congela 1–3,8 s con [[enlaces]] → rebuild-2 · PR #64 |
| #40 | preflight:blocked | blocked | Blocked | 👯 ya hecho por PR #63 (src/frontmatter.ts) |
| #18 | resume | approved | Review | `done` del dueño verificado sobre fba43c1 |
| #18 | truth → review | merged | Done | merge gate tras `done` del dueño · f15e433 · PR #61 |
| #17 | build → qa → truth → review:bounced | bounced | Ready | conflicto con staging tras #18 (`model` duplicado, tsc rojo) → loop:rebase + rebuild-3 · PR #64 |
| #17 | build → qa → truth → review:blocked | blocked | Blocked | 🛡 tope superado con R5 abierto (trama/resúmenes vacíos); 12/13 arreglados · 2107 líneas · PR #64 |

⏹ run parada tras la wave 21 — nada libre; Ready #20–#22 esperan a #19; Blocked #17, #19, #40 esperan al dueño

▶️ run reanudada (wave 22)
| #17 | merge manual | merged | Done | el dueño fusionó PR #64 (5af71dd) |
| #19 | build → qa:bounced | blocked | Blocked | QA v4 AC2 (cierre `--- ` con espacios, lista en línea borrada) → rebuild-4 > cap → 🛡 · PR #60 |

⏹ run parada tras la wave 22 — nada libre; #20–#22 esperan a #19 (🛡)
▶️ sigue: el dueño pasó #24, #25, #27, #28 y #62 a Ready (wave 23)
| #24 | build → qa → truth → review:bounced | bounced | Ready | R1 caché se vacía al autoguardar; R2 ficha sin nombre; R4 sin test · PR #65 |
| #25 | build → qa → truth → review:bounced | bounced | Ready | R1 un solo writingTimer para todos los proyectos · PR #68 |
| #27 | build → qa → truth → review:bounced | bounced | Ready | R1 sceneFolder "/" rompe rutas; R2 caracteres de control rompen el DOCX · PR #67 |
| #28 | build → qa → truth → review:human-gate | human-gate | Blocked | 1043 líneas > 1000 → merge humano · PR #66 |
| #62 | build → qa → truth → review | merged | Done | 4d31d31 · PR #69 |
| #19 | merge manual | merged | Done | el dueño fusionó PR #60 (8c58ab1); casos YAML → #70 |
| #70 | nuevo | filed | Ready | staging en rojo: tests/extract-qa.test.mjs:128 y :138 |
| #20 | build → qa → truth → review:bounced | bounced | Ready | R1 `conocimiento` no crea aristas · PR #71 |
| #24 | build → qa → truth → review:bounced | bounced | Ready | R3 sin arreglar; R6 ficha nombre≠archivo pierde relaciones; truth 68 < 70 → rebuild-2 · PR #65 |
| #25 | build → qa → truth → review:bounced | bounced | Ready | R3 Meta diaria, R4 borrar/mover no recuenta → rebuild-2 · PR #68 |
| #27 | build → qa:blocked | blocked | Blocked | 🔑 sin pandoc para probar AC2 (EPUB/PDF) · PR #67 |
| #70 | preflight:blocked | blocked | Blocked | secuencia tras PR #67 (src/frontmatter.ts) · blocked-by: 27 |
| #20 | build → qa → truth → review:bounced | bounced | Ready | R5 desde Personajes/ lee 0 memorias; R6 sin aviso → rebuild-2 · PR #71 |
| #24 | build → qa → truth → review | merged | Done | f8ab808 · PR #65 |
| #25 | build → qa → truth → review:blocked | blocked | Blocked | 🧑 falta check manual en Obsidian (R5), cap alcanzado · PR #68 |
| #20 | build → qa → truth → review:human-gate | human-gate | Blocked | 1708 líneas > 1000 (casi todo logs de QA) → merge humano · PR #71 |

⏹ run parada tras la wave 26 — nada libre; 🙋 #20 #28 · 🧑 #25 · 🔑 #27 esperan al dueño; #70 tras #27; #21–#22 tras #20

▶️ run reanudada (wave 27)
| #72 | nuevo | filed | Backlog | checks manuales de Obsidian, al final (decisión del dueño) |
| #25 | decisión | resumed | Review | R5 aplazado a #72 |
| #27 | decisión | resumed | QA | pandoc instalado por el dueño |
| #20 | resume | approved | Review | `done` del dueño verificado |
| #20 | truth → review | merged | Done | 096ce9b · PR #71 |
| #25 | truth → review:human-gate | human-gate | Blocked | 1894 líneas > 1000 → merge humano · PR #68 |
| #27 | qa → truth → review:human-gate | human-gate | Blocked | 1426 líneas > 1000 → merge humano · PR #67 |
| #21 | build → qa → truth → review:human-gate | human-gate | Blocked | 1005 líneas > 1000 → merge humano · PR #73 |

⏹ run parada tras la wave 28 — nada libre; 🙋 #21 #25 #27 #28 esperan `done`; #70 tras #27; #22 tras #21
| #25 | rebase | conflicto | Ready | PR #68 choca en src/main.ts → rebase; aprobación nueva |
| #27 | rebase | conflicto | Ready | PR #67 choca en src/main.ts y README.md → rebase; aprobación nueva |
| #28 | rebase | conflicto | Ready | PR #66 choca en src/main.ts y tests/obsidian.md → rebase; aprobación nueva |
| #21 | decisión | resumed | Review | auto_max_lines 1000 → 2000 (dueño); PR #73 sin gate humano |

▶️ run reanudada (wave 29) · auto_max_lines 2000
| #21 | review | merged | Done | el dueño fusionó PR #73 (92b00bc) |
| #25 | build → qa → truth → review:human-gate | human-gate | Blocked | 2461 líneas > 2000 → merge humano · PR #68 |
| #27 | build → qa → truth → review:bounced | bounced | Ready | R6 noteBody no quita frontmatter con claves con espacios → rebuild-2 · PR #67 |
| #28 | preflight | merged | Done | PR #66 ya fusionada (35242d7); mi rebase fue un error del orquestador |
| #22 | build → qa → truth → review:bounced | bounced | QA | R1 sin test del guardado/modal → QA · PR #74 |
| #27 | build → qa → truth → review:bounced | bounced | Ready | R9 conflicto staging, R10 PATH pandoc macOS, R12 <raro> se pierde → rebuild-3 · PR #67 |
| #25 | merge manual | merged | Done | el dueño fusionó PR #68 (1784feb) |
| #22 | qa → truth → review | merged | Done | cbcb859 · PR #74 |
| #27 | build → qa → truth → review:halted | halted | Review | merge gate exit 79: `gh pr diff 67` "diff hunk length disagrees" ×3 |

⏸ run en pausa por halt de lectura GitHub tras la wave 31 — causa: el validador de diff usa `splitlines()`, que corta en `\x0b` (2 en el diff de #67, tests de caracteres de control); claim de #27 conservado
▶️ halt resuelto: fix eb3f56a en staging, `--resume` OK (wave 32)
| #27 | truth → review:human-gate | human-gate | Blocked | 2910 líneas > 2000 → merge humano · PR #67 |

⏹ run parada tras la wave 32 — nada libre; 🙋 #27 espera `done`; #70 tras #27; #72 en Backlog para el final

▶️ run reanudada (wave 33)
| #27 | resume | approved | Review | `done` del dueño verificado sobre cf5d917 |
| #27 | truth → review | merged | Done | 4692062 · PR #67 |
| #70 | sweep | swept | Ready | liberada por #27 |
| #70 | build → qa:bounced | bounced | Ready | lista `hechos:` en flujo multilínea → segundo frontmatter (extract-qa.test.mjs:179) → rebuild-1 · PR #75 |
| #70 | build → qa → truth → review:bounced | bounced | Ready | ya usa librería YAML; R1 YAML inválido mete frontmatter en el export; R2 reescribe campos no tocados → rebuild-2 · PR #75 |
| #70 | build → qa:bounced | blocked | Blocked | QA v3 AC4: YAML inválido borra prosa en export → rebuild-3 > cap → 🛡 · PR #75 |

⏹ run parada tras la wave 36 — nada libre; 🛡 #70 espera al dueño; #72 en Backlog

▶️ run reanudada (wave 37) · #70 con alcance recortado a `_Memoria/`
| #70 | build → qa → truth → review:blocked | blocked | Blocked | AC1–AC6 verdes, 383/383; R6–R8 should fix; cap → 🛡 · PR #75 |

⏹ run parada tras la wave 37 — nada libre; 🛡 #70 espera al dueño; #72 en Backlog
| #70 | merge manual | merged | Done | el dueño fusionó PR #75 (465c5a3); R6–R8 → #76 |
| #76 | nuevo | filed | Backlog | R6–R8 de la PR #75 (fichas de lugar) |

▶️ run reanudada (wave 38) · el dueño aprueba #76 a Ready
| #76 | build → qa:bounced | bounced | Ready | AC1: `estados` en flujo multilínea → frontmatterEnd lo rechaza y antepone otro frontmatter (places-approval.test.mjs:84) → rebuild-1 · PR #77 |
| #76 | build → qa → truth → review:bounced | bounced | Ready | R1 `|-` multilínea leído literal → duplica estado; R2 flujo pierde elementos no-mapa → rebuild-2 · PR #77 |
| #76 | build → qa → truth → review:bounced | blocked | Blocked | R4 `estados: # comentario`, R5 `|-` → rebuild-3 > cap → 🛡 · PR #77 |

⏹ run parada tras la wave 40 — nada libre; 🛡 #76 espera al dueño; #72 en Backlog

| #76 | build → qa → truth → review:advanced | advanced | Done | rediseño con `yaml`: R4–R6 arreglados · 401/401 · truth 80 · PR #77 squash 163d7c9 · nits R7–R9, seguimiento R10–R12 |

✅ board vaciado tras la wave 41 — solo queda #72 en Backlog (checks manuales de Obsidian, al final)
