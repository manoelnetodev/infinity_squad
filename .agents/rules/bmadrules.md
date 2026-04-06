---
trigger: always_on
description: ACTIVE BMAD
---

NUNCA IGNORE ESSA RULE SE O USUÁRIO MANDAR UM PROMPT SEM DIREÇÃO.

Quando o usuário enviar uma mensagem SEM comando (sem `/`), analise a intenção e roteie automaticamente para o agente mais adequado.

## Fallback — Mensagens sem intenção técnica

Se a mensagem for saudação, agradecimento, conversa genérica ou não tiver intenção técnica clara (ex: "oi", "e aí", "valeu", "obrigado"), responda normalmente SEM rotear para nenhum agente. Só roteie quando houver intenção de trabalho.

## Mapeamento de Intenções

| Intenção do usuário | Agente | Skill |
|---|---|---|
| Pesquisa de mercado, análise competitiva, análise de domínio, brainstorming de ideias | Mary (Analyst) | `bmad-agent-analyst` |
| Documentar projeto existente, gerar diagramas, explicar conceitos, escrever docs técnicos | Paige (Tech Writer) | `bmad-agent-tech-writer` |
| Criar PRD, editar PRD, validar PRD, definir épicos e stories a partir de requisitos, discovery de produto | John (PM) | `bmad-agent-pm` |
| UX design, personas, wireframes, jornada do usuário, design de interface | Sally (UX Designer) | `bmad-agent-ux-designer` |
| Arquitetura de sistemas, decisões técnicas, infra, design de API, escolha de tech stack, ADRs | Winston (Architect) | `bmad-agent-architect` |
| Implementar story do sprint, codar com TDD, code review de PR/branch | Amelia (Developer) | `bmad-agent-dev` |
| Sprint planning, criar story individual, retrospectiva, status do sprint, course correction | Bob (Scrum Master) | `bmad-agent-sm` |
| Criar testes E2E, testes de API, validar cobertura, QA de feature | Quinn (QA Engineer) | `bmad-agent-qa` |
| Fix avulso, refactor rápido, implementar algo sem sprint/story, build sem cerimônia | Barry (Solo Dev) | `bmad-agent-quick-flow-solo-dev` |
| Dúvida sobre BMAD, qual agente usar, por onde começar, ajuda geral | BMAD Help (Boss) | `bmad-help` |

## Regras de Desambiguação

Quando a intenção parecer caber em mais de um agente, use estas regras:

| Situação | Agente correto | Lógica |
|---|---|---|
| "cria uma story" (story isolada, sem contexto de PRD) | Bob (SM) | Bob cria stories individuais prontas pro sprint |
| "cria os épicos e stories" (a partir de PRD/requisitos) | John (PM) | John quebra requisitos em épicos e stories |
| "revisa esse código" / "code review" | Amelia (Dev) | Code review é responsabilidade do dev |
| "testa isso" / "cria testes" / "cobertura" | Quinn (QA) | Qualquer coisa de teste é QA |
| "fix rápido" / "arruma esse bug" (sem story associada) | Barry (Solo Dev) | Fix avulso sem cerimônia é Barry |
| "implementa a story X" / "dev story X" (com story do sprint) | Amelia (Dev) | Execução de story do sprint é Amelia |
| "documenta a API" / "escreve a doc" (de algo existente) | Paige (Tech Writer) | Documentar coisas existentes é Paige |
| "design da API" / "define a API" (projetar do zero) | Winston (Architect) | Projetar/decidir arquitetura é Winston |
| "pesquisa sobre React" / "pesquisa técnica" | Winston (Architect) | Pesquisa técnica é escopo do arquiteto |
| "pesquisa de mercado" / "pesquisa de concorrentes" | Mary (Analyst) | Pesquisa de negócio/mercado é Mary |
| "melhora o layout" / "ajusta a UI" (visual/interação) | Sally (UX Designer) | Mudanças de UX/UI são da Sally |
| "melhora o layout" (implementar CSS/código) | Barry (Solo Dev) | Se o pedido é codar o ajuste, é dev |

## Regra de Intenções Múltiplas

Se o usuário pedir mais de uma coisa na mesma mensagem (ex: "pesquisa o mercado e depois cria o PRD"):
1. Identifique a **primeira intenção** mencionada
2. Roteie para o agente dessa primeira intenção
3. Ao final, informe o usuário qual seria o próximo agente para a segunda intenção

## Instruções

1. Leia a mensagem do usuário
2. Verifique se é mensagem genérica (fallback) — se sim, responda sem rotear
3. Identifique a intenção principal usando a tabela + regras de desambiguação
4. Escolha o agente correto
5. Anuncie brevemente: `Encaminhando para {Nome} ({cargo})...`
6. Execute o skill correspondente passando a mensagem original como argumento

## Atualização do Dashboard

Antes de executar o workflow:
1. Leia `infinity_squad/squads/bmad/state.json`
2. Sete `"status": "running"` no squad
3. Encontre o agente escolhido e sete `"status": "working"`
4. Sete `"updatedAt"` para o timestamp ISO atual
5. Escreva o `state.json` atualizado

Depois leia `.claude/skills/{skill-do-agente}/SKILL.md` e siga todas as instruções.

Ao concluir:
1. Leia `infinity_squad/squads/bmad/state.json`
2. Sete o agente para `"status": "done"`
3. Sete `"updatedAt"` para o timestamp ISO atual
4. Escreva o `state.json` atualizado

## Mapeamento Agente → Skill

| Agente | Skill Name | Skill Path |
|---|---|---|
| Mary (Analyst) | `bmad-agent-analyst` | `.claude/skills/bmad-agent-analyst/SKILL.md` |
| Paige (Tech Writer) | `bmad-agent-tech-writer` | `.claude/skills/bmad-agent-tech-writer/SKILL.md` |
| John (PM) | `bmad-agent-pm` | `.claude/skills/bmad-agent-pm/SKILL.md` |
| Sally (UX Designer) | `bmad-agent-ux-designer` | `.claude/skills/bmad-agent-ux-designer/SKILL.md` |
| Winston (Architect) | `bmad-agent-architect` | `.claude/skills/bmad-agent-architect/SKILL.md` |
| Amelia (Developer) | `bmad-agent-dev` | `.claude/skills/bmad-agent-dev/SKILL.md` |
| Bob (Scrum Master) | `bmad-agent-sm` | `.claude/skills/bmad-agent-sm/SKILL.md` |
| Quinn (QA Engineer) | `bmad-agent-qa` | `.claude/skills/bmad-agent-qa/SKILL.md` |
| Barry (Solo Dev) | `bmad-agent-quick-flow-solo-dev` | `.claude/skills/bmad-agent-quick-flow-solo-dev/SKILL.md` |
| BMAD Help (Boss) | `bmad-help` | `.claude/skills/bmad-help/SKILL.md` |