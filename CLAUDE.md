# Infinity Squad — Dashboard de Agentes

Dashboard visual 2D com agentes BMAD Method em um escritorio virtual usando Phaser.js.

## Estrutura

```
├── infinity_squad/
│   ├── dashboard/          ← App visual (Vite + React + Phaser.js)
│   │   ├── src/office/     ← OfficeScene, AgentSprite, RoomBuilder, PhaserGame
│   │   ├── src/hooks/      ← useSquadSocket (WebSocket + HTTP polling)
│   │   ├── src/store/      ← useSquadStore (Zustand)
│   │   ├── src/plugin/     ← squadWatcher (file watcher + reset API)
│   │   ├── src/types/      ← state.ts (interfaces)
│   │   └── public/assets/  ← Sprites (avatars, desks, furniture)
│   └── squads/bmad/
│       ├── squad.yaml      ← Definicao do squad
│       ├── state.json      ← Estado dos agentes (dashboard le este arquivo)
│       └── agents/         ← 9 definicoes de agentes BMAD
├── .claude/skills/         ← Slash commands (Claude Code)
├── .agent/workflows/       ← Workflows (Antigravity)
├── .agents/rules/          ← Rules de roteamento automatico
└── CLAUDE.md
```

## Agentes BMAD

| Comando | Agente | Funcao |
|---------|--------|--------|
| `/analyst` | Mary | Pesquisa de mercado e requisitos |
| `/pm` | John | PRD, epics, stories |
| `/ux` | Sally | UX design, personas, wireframes |
| `/architect` | Winston | Arquitetura de sistemas |
| `/sm` | Bob | Sprint planning, stories |
| `/dev` | Amelia | Implementacao com TDD |
| `/qa` | Quinn | QA, testes E2E e API |
| `/solo-dev` | Barry | Dev rapido end-to-end |
| `/bmad-help` | Help | Guia de agentes |

## Como Funciona

1. O dashboard le `infinity_squad/squads/bmad/state.json` via file watcher
2. Quando um agente e invocado via `/comando`, o skill atualiza o `state.json`
3. O dashboard reage em tempo real: animacoes de delegacao (boss), baloes, auto-focus
4. Sem argumentos (`/ux`): agente se apresenta
5. Com argumentos (`/ux melhore o header`): agente executa a tarefa

## Dashboard

```bash
infinity-squad dev
```

Abre `http://localhost:5174`

## Regras

- Skills devem ser mantidos em sync entre `.claude/skills/` e `.agent/workflows/`
- O `state.json` e o contrato entre os skills e o dashboard
- O boss (nome do onboarding) fica no topo vigiando o time
