# BMAD Visual

Dashboard visual 2D com agentes [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) em um escritorio virtual usando Phaser.js. Cada agente da IA tem sua mesa, animacoes e baloes de fala — tudo atualizado em tempo real enquanto voce trabalha no seu projeto.

![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![License MIT](https://img.shields.io/badge/license-MIT-blue)

---

## Requisitos

- **Node.js** >= 18
- **Claude Code** ou **Antigravity** (para invocar os agentes)

---

## Instalacao

### Projeto novo (do zero)

```bash
npx bmad-visual init meu-projeto
cd meu-projeto
bmad-visual dev
```

Isso cria a pasta `meu-projeto/` com toda a estrutura pronta.

### Projeto existente (ja em andamento)

Entre na raiz do seu projeto e rode:

```bash
npx bmad-visual init
```

O comando vai adicionar ao seu projeto:

| Pasta/Arquivo | O que faz |
|---|---|
| `dashboard/` | App visual (Vite + React + Phaser.js) |
| `squads/bmad/` | Definicao do squad + agentes |
| `.claude/skills/` | Slash commands para Claude Code |
| `.agent/workflows/` | Workflows para Antigravity |
| `.agents/rules/` | Rules de roteamento automatico (Antigravity) |
| `CLAUDE.md` | Contexto do projeto para a IA |

> Se a pasta `dashboard/` ja existir, ela sera sobrescrita. As outras pastas sao adicionadas sem afetar o resto do seu projeto.

---

## Uso

### Iniciar o dashboard

```bash
bmad-visual dev
```

Abre em `http://localhost:5174`. O dashboard mostra o escritorio virtual com os agentes nas suas mesas.

### Invocar agentes

No terminal do Claude Code ou Antigravity, use os slash commands:

| Comando | Agente | Funcao |
|---|---|---|
| `/analyst` | Mary | Pesquisa de mercado e requisitos |
| `/pm` | John | PRD, epics e stories |
| `/ux` | Sally | UX design, personas, wireframes |
| `/architect` | Winston | Arquitetura de sistemas |
| `/sm` | Bob | Sprint planning e stories |
| `/dev` | Amelia | Implementacao com TDD |
| `/qa` | Quinn | QA, testes E2E e API |
| `/solo-dev` | Barry | Dev rapido end-to-end |
| `/bmad-help` | — | Guia de agentes |

Para abrir o terminal do Claude Code ou Antigravity direto no projeto:

```bash
bmad-visual open
```

O comando detecta automaticamente qual CLI esta instalado e abre na pasta atual.

**Sem argumentos** — o agente se apresenta:
```
/ux
```

**Com argumentos** — o agente executa a tarefa:
```
/ux melhore o header do site
```

**Sem slash command** — o Antigravity roteia automaticamente para o agente certo (via `bmadrules.md`):
```
cria os testes E2E do login
```

### Roteamento automatico (Antigravity)

O arquivo `.agents/rules/bmadrules.md` analisa a intencao da mensagem e encaminha para o agente adequado, sem precisar de `/comando`. Ele tambem atualiza o `state.json` para que o dashboard reflita quem esta trabalhando.

---

## Como funciona

```
Voce digita        O skill atualiza       O dashboard reage
/ux ────────>  squads/bmad/state.json ────────> animacao em tempo real
```

1. Voce invoca um agente via `/comando` ou texto livre
2. O skill/workflow seta o agente como `"working"` no `state.json`
3. O dashboard detecta a mudanca via file watcher
4. O agente aparece animado na tela (balao de fala, destaque, auto-focus)
5. Ao concluir, o status volta para `"done"`

---

## Estrutura do projeto

```
├── dashboard/              App visual (Vite + React + Phaser.js)
│   ├── src/office/         OfficeScene, AgentSprite, RoomBuilder
│   ├── src/hooks/          useSquadSocket (WebSocket + HTTP polling)
│   ├── src/store/          useSquadStore (Zustand)
│   └── public/assets/      Sprites (avatars, mesas, moveis)
├── squads/bmad/
│   ├── squad.yaml          Definicao do squad
│   ├── state.json          Estado dos agentes (contrato com o dashboard)
│   └── agents/             Definicoes dos 9 agentes BMAD
├── .claude/skills/         Slash commands (Claude Code)
├── .agent/workflows/       Workflows (Antigravity)
├── .agents/rules/          Rules de roteamento automatico
└── CLAUDE.md               Contexto do projeto para a IA
```

---

## CLI

```
bmad-visual init            Scaffold na pasta atual
bmad-visual init <nome>     Cria nova pasta com o projeto
bmad-visual dev             Inicia o dashboard dev server
bmad-visual open            Abre o projeto no Claude Code ou Antigravity
bmad-visual --help          Mostra ajuda
bmad-visual --version       Mostra versao
```

---

## Compatibilidade

| IDE / CLI | Skills | Workflows | Rules |
|---|---|---|---|
| **Claude Code** | `.claude/skills/` | — | — |
| **Antigravity** | — | `.agent/workflows/` | `.agents/rules/` |

Ambos atualizam o mesmo `state.json`, entao o dashboard funciona independente de qual ferramenta voce usa.

---

## License

MIT
