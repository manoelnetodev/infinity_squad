---
description: BMAD Scrum Master — Bob. Sprint planning, story creation, evaluation, retrospectives, and course correction.
---

## Dashboard Update (MANDATORY — do this FIRST)

1. Read `squads/bmad/state.json`
2. Set `"status": "running"` on the squad
3. Find the agent with `"id": "scrum-master"` and set its `"status"` to `"working"`
4. **If invoked WITHOUT arguments**: also set `"step"` to `{ "current": 0, "total": 12, "label": "intro" }`
5. Set `"updatedAt"` to current ISO timestamp
6. Write the updated `state.json` back

Then read `.claude/skills/bmad-agent-sm/SKILL.md` and follow ALL instructions (skip the Dashboard Update section there since you already did it above).

When your work is complete:
1. Read `squads/bmad/state.json`
2. Find the agent with `"id": "scrum-master"` and set its `"status"` to `"done"`
3. Set `"updatedAt"` to current ISO timestamp
4. Write the updated `state.json` back
