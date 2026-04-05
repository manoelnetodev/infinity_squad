import Phaser from 'phaser';
import {
  CHARACTER_NAMES, MALE_CHARACTERS, FEMALE_CHARACTERS, avatarKeys, avatarPath,
  DESK_PATHS, DESK_KEYS,
  FURNITURE_PATHS, FURNITURE_KEYS,
  type CharacterName,
} from './assetKeys';
import { CELL_W, CELL_H, MARGIN, WALL_H } from './palette';
import { RoomBuilder } from './RoomBuilder';
import { AgentSprite } from './AgentSprite';
import type { SquadState, Agent, Boss, AgentStatus } from '@/types/state';

function assignCharacters(agents: Agent[]): Map<string, CharacterName> {
  const assignments = new Map<string, CharacterName>();
  let maleIndex = 0;
  let femaleIndex = 0;

  for (const agent of agents) {
    if (agent.gender === 'male') {
      assignments.set(agent.id, MALE_CHARACTERS[maleIndex % MALE_CHARACTERS.length]);
      maleIndex++;
    } else {
      assignments.set(agent.id, FEMALE_CHARACTERS[femaleIndex % FEMALE_CHARACTERS.length]);
      femaleIndex++;
    }
  }

  return assignments;
}

// Layout used for the empty room (desks without agents)
const EMPTY_DESKS = [
  { col: 1, row: 1 },
  { col: 2, row: 1 },
  { col: 3, row: 1 },
  { col: 1, row: 2 },
  { col: 2, row: 2 },
  { col: 3, row: 2 },
];

export class OfficeScene extends Phaser.Scene {
  private agentSprites: Map<string, AgentSprite> = new Map();
  private agentPositions: Map<string, { x: number; y: number }> = new Map();
  private roomBuilder!: RoomBuilder;
  private isDragging = false;
  private dragPrevX = 0;
  private dragPrevY = 0;
  private baseZoom = 1;
  private roomCenterX = 0;
  private roomCenterY = 0;
  private focusedAgentId: string | null = null;
  private userOverride = false;

  // Boss animation state
  private bossAvatar: Phaser.GameObjects.Image | null = null;
  private bossCharName: CharacterName = 'Male1';
  private bossHomeX = 0;
  private bossHomeY = 0;
  private prevStatuses: Map<string, AgentStatus> = new Map();
  private animating = false;
  private pendingState: SquadState | null = null;
  private characterMap: Map<string, CharacterName> = new Map();
  private currentSquadCode = '';
  private hasIntroPlayed = false;

  // Agent role descriptions in Portuguese
  private static readonly AGENT_ROLES: Record<string, string> = {
    'analyst': 'Pesquiso mercado e requisitos!',
    'tech-writer': 'Documento tudo com clareza!',
    'pm': 'Planejo o produto e priorizo!',
    'ux-designer': 'Desenho experiências incríveis!',
    'architect': 'Projeto a arquitetura do sistema!',
    'developer': 'Codifico com TDD e precisão!',
    'scrum-master': 'Organizo sprints e stories!',
    'qa-engineer': 'Testo e garanto a qualidade!',
    'solo-dev': 'Desenvolvo rápido de ponta a ponta!',
  };

  constructor() {
    super({ key: 'OfficeScene' });
  }

  preload(): void {
    for (const [key, path] of Object.entries(DESK_PATHS)) {
      this.load.image(key, path);
    }
    for (const name of CHARACTER_NAMES) {
      const keys = avatarKeys(name);
      this.load.image(keys.blink, avatarPath(name, 'blink'));
      this.load.image(keys.talk, avatarPath(name, 'talk'));
      this.load.image(keys.wave1, avatarPath(name, 'wave1'));
      this.load.image(keys.wave2, avatarPath(name, 'wave2'));
    }
    for (const [key, path] of Object.entries(FURNITURE_PATHS)) {
      this.load.image(key, path);
    }
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.error('Failed to load asset:', file.key, file.url);
    });
  }

  create(): void {
    this.textures.list && Object.values(this.textures.list).forEach((tex) => {
      if (tex.key !== '__DEFAULT' && tex.key !== '__MISSING') {
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    });

    this.roomBuilder = new RoomBuilder(this);

    this.events.on('stateUpdate', (state: SquadState | null) => {
      this.onStateUpdate(state);
    });

    // Zoom with mouse wheel
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: unknown[], _dx: number, dy: number) => {
      const cam = this.cameras.main;
      const zoomDelta = dy > 0 ? -0.15 : 0.15;
      const newZoom = Phaser.Math.Clamp(cam.zoom + zoomDelta, 0.3, 5);
      cam.setZoom(newZoom);
      this.userOverride = true;
    });

    // Pan with left-click drag
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.isDragging = true;
        this.dragPrevX = pointer.x;
        this.dragPrevY = pointer.y;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      const cam = this.cameras.main;
      const dx = (this.dragPrevX - pointer.x) / cam.zoom;
      const dy = (this.dragPrevY - pointer.y) / cam.zoom;
      cam.scrollX += dx;
      cam.scrollY += dy;
      this.dragPrevX = pointer.x;
      this.dragPrevY = pointer.y;
      this.userOverride = true;
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });

    // Double-click to reset
    let lastClickTime = 0;
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const now = Date.now();
      if (now - lastClickTime < 300 && pointer.leftButtonDown()) {
        this.userOverride = false;
        this.focusedAgentId = null;
        const cam = this.cameras.main;
        cam.pan(this.roomCenterX, this.roomCenterY, 400, 'Sine.easeInOut');
        cam.zoomTo(this.baseZoom, 400);
      }
      lastClickTime = now;
    });

    this.renderEmptyRoom();
  }

  private onStateUpdate(state: SquadState | null): void {
    if (!state) {
      this.focusedAgentId = null;
      this.prevStatuses.clear();
      this.renderEmptyRoom();
      return;
    }

    // If currently animating, queue this state for after
    if (this.animating) {
      this.pendingState = state;
      return;
    }

    // Detect transitions: who just became "working"? who just became "done"?
    let newWorkingAgent: Agent | null = null;
    let newDoneAgent: Agent | null = null;

    for (const agent of state.agents) {
      const prev = this.prevStatuses.get(agent.id);
      if (agent.status === 'working' && prev !== 'working') {
        newWorkingAgent = agent;
      }
      if ((agent.status === 'done' || agent.status === 'idle') && prev === 'working') {
        newDoneAgent = agent;
      }
    }

    this.currentSquadCode = state.squad;

    // Render the scene
    this.renderScene(state.agents, state.boss);

    // Save current statuses for next comparison
    for (const agent of state.agents) {
      this.prevStatuses.set(agent.id, agent.status);
    }

    // Play delegation animation if someone just started working
    if (newWorkingAgent && state.boss && this.bossAvatar) {
      const isIntro = state.step.label === 'intro';
      this.playDelegation(newWorkingAgent, isIntro);
      return;
    }

    // Play delivery animation if someone just finished
    if (newDoneAgent && state.boss && this.bossAvatar) {
      this.playDelivery(newDoneAgent);
      return;
    }

    // Auto-focus on working agent
    this.updateAutoFocus(state);
  }

  private updateAutoFocus(state: SquadState): void {
    const workingAgent = state.agents.find(a => a.status === 'working');
    if (workingAgent && !this.userOverride) {
      const pos = this.agentPositions.get(workingAgent.id);
      if (pos && this.focusedAgentId !== workingAgent.id) {
        this.focusedAgentId = workingAgent.id;
        const cam = this.cameras.main;
        const focusZoom = Math.max(this.baseZoom * 2.2, 1.8);
        cam.pan(pos.x, pos.y - 40, 800, 'Sine.easeInOut');
        cam.zoomTo(focusZoom, 800);
      }
    } else if (!workingAgent && this.focusedAgentId && !this.userOverride) {
      this.focusedAgentId = null;
      const cam = this.cameras.main;
      cam.pan(this.roomCenterX, this.roomCenterY, 800, 'Sine.easeInOut');
      cam.zoomTo(this.baseZoom, 800);
    }
  }

  // ─── Speech Bubble ───────────────────────────────────────────
  private showBubble(x: number, y: number, text: string, color: string, duration: number): void {
    const bubble = this.add.text(x, y, text, {
      fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#000000',
      align: 'center',
      backgroundColor: color,
      padding: { x: 10, y: 6 },
      resolution: 2,
    }).setOrigin(0.5, 1).setDepth(1000);

    const tail = this.add.graphics();
    tail.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
    tail.fillTriangle(x - 4, y, x + 4, y, x, y + 7);
    tail.setDepth(1000);

    bubble.setScale(0);
    tail.setAlpha(0);
    this.tweens.add({ targets: bubble, scale: 1, duration: 250, ease: 'Back.easeOut' });
    this.tweens.add({ targets: tail, alpha: 1, duration: 250, delay: 100 });

    this.time.delayedCall(duration, () => {
      this.tweens.add({
        targets: [bubble, tail],
        alpha: 0,
        duration: 300,
        onComplete: () => { bubble.destroy(); tail.destroy(); },
      });
    });
  }

  // ─── Boss delegates from his desk (no walking) ──────────────
  private playDelegation(agent: Agent, isIntro = false): void {
    const agentPos = this.agentPositions.get(agent.id);
    if (!agentPos) return;

    this.animating = true;
    const bossY = this.bossHomeY - 70;
    const agentY = agentPos.y - 70;

    // 1. Camera pans to boss
    const cam = this.cameras.main;
    if (!this.userOverride) {
      const focusZoom = Math.max(this.baseZoom * 2, 1.6);
      cam.pan(this.bossHomeX, this.bossHomeY - 40, 600, 'Sine.easeInOut');
      cam.zoomTo(focusZoom, 600);
    }

    // 2. Boss speaks from his desk
    this.time.delayedCall(800, () => {
      const bossMsg = isIntro
        ? `${agent.name}, se apresente!`
        : `${agent.name}, aqui está sua tarefa!`;
      this.showBubble(this.bossHomeX, bossY - 35, bossMsg, '#10b981', 2500);

      // 3. Camera pans to agent
      this.time.delayedCall(1500, () => {
        if (!this.userOverride) {
          cam.pan(agentPos.x, agentPos.y - 40, 600, 'Sine.easeInOut');
        }

        // 4. Agent responds
        this.time.delayedCall(800, () => {
          const agentMsg = isIntro
            ? (OfficeScene.AGENT_ROLES[agent.id] ?? 'Pronto para trabalhar!')
            : 'Ok, Boss!';
          this.showBubble(agentPos.x, agentY - 35, agentMsg, '#ffffff', 2000);

          // 5. Stay focused on the working agent
          this.time.delayedCall(2200, () => {
            this.animating = false;
            this.focusedAgentId = agent.id;

            if (this.pendingState) {
              const s = this.pendingState;
              this.pendingState = null;
              this.onStateUpdate(s);
            }
          });
        });
      });
    });
  }

  // ─── Agent reports done from their desk (no walking) ────────
  private playDelivery(agent: Agent): void {
    const agentPos = this.agentPositions.get(agent.id);
    if (!agentPos) return;

    this.animating = true;
    const agentY = agentPos.y - 70;
    const bossY = this.bossHomeY - 70;

    // 1. Camera pans to agent
    const cam = this.cameras.main;
    if (!this.userOverride) {
      const focusZoom = Math.max(this.baseZoom * 2, 1.6);
      cam.pan(agentPos.x, agentPos.y - 40, 600, 'Sine.easeInOut');
      cam.zoomTo(focusZoom, 600);
    }

    // 2. Agent announces completion
    this.time.delayedCall(800, () => {
      this.showBubble(agentPos.x, agentY - 35, 'Tarefa concluída!', '#70ff90', 2500);

      // 3. Camera pans to boss
      this.time.delayedCall(1500, () => {
        if (!this.userOverride) {
          cam.pan(this.bossHomeX, this.bossHomeY - 40, 600, 'Sine.easeInOut');
        }

        // 4. Boss thanks
        this.time.delayedCall(800, () => {
          this.showBubble(this.bossHomeX, bossY - 35, 'Muito obrigado!', '#10b981', 2000);

          // 5. After "Muito obrigado!" + 2s → reset agent to idle, zoom out
          this.time.delayedCall(2200, () => {
            // Reset agent status to idle via API
            fetch('/api/reset-agent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ squad: this.currentSquadCode, agentId: agent.id }),
            }).catch(() => {});

            if (!this.userOverride) {
              cam.pan(this.roomCenterX, this.roomCenterY, 1000, 'Sine.easeInOut');
              cam.zoomTo(this.baseZoom, 1000);
              this.focusedAgentId = null;
            }
            this.animating = false;

            if (this.pendingState) {
              const s = this.pendingState;
              this.pendingState = null;
              this.onStateUpdate(s);
            }
          });
        });
      });
    });
  }

  // ─── Empty Room ──────────────────────────────────────────────
  private renderEmptyRoom(): void {
    const desks = EMPTY_DESKS;
    let maxCol = 0, maxRow = 0;
    for (const d of desks) {
      maxCol = Math.max(maxCol, d.col);
      maxRow = Math.max(maxRow, d.row);
    }

    const cellW = CELL_W + 64;
    const cellH = CELL_H + 80;
    const roomW = Math.max(maxCol * cellW + MARGIN * 2, 580);
    const loungeSpace = CELL_H + 48;
    const roomH = maxRow * cellH + MARGIN * 2 + WALL_H + loungeSpace;

    this.clearScene();
    this.roomBuilder.build(roomW, roomH);

    for (let i = 0; i < desks.length; i++) {
      const d = desks[i];
      const x = (d.col - 1) * cellW + MARGIN + cellW / 2;
      const y = (d.row - 1) * cellH + MARGIN + WALL_H + cellH / 2;
      const variant = i % 2 === 0 ? 'black' : 'white';

      this.add.image(x, y, FURNITURE_KEYS.deskWood)
        .setOrigin(0.5, 0.5).setScale(1.3).setDepth(y + 1);

      const deskKey = variant === 'black' ? DESK_KEYS.blackCoding : DESK_KEYS.whiteCoding;
      this.add.image(x, y - 30, deskKey)
        .setOrigin(0.5, 0.5).setScale(1.3).setDepth(y + 2);

      this.add.image(x + 42, y + 8, 'furniture_coffee_mug')
        .setOrigin(0.5, 1).setScale(1.4).setDepth(y + 3);
    }

    const cam = this.cameras.main;
    const scaleX = cam.width / (roomW + 32);
    const scaleY = cam.height / (roomH + 32);
    const zoom = Math.min(scaleX, scaleY, 2);
    cam.setZoom(zoom);
    cam.centerOn(roomW / 2, roomH / 2);
    this.baseZoom = zoom;
  }

  // ─── Main Render ─────────────────────────────────────────────
  private renderScene(agents: Agent[], boss?: Boss): void {
    const allSameDesk = agents.length > 1 &&
      agents.every(a => a.desk.col === agents[0].desk.col && a.desk.row === agents[0].desk.row);
    if (allSameDesk) {
      const cols = Math.min(agents.length, 3);
      agents = agents.map((a, i) => ({
        ...a,
        desk: { col: (i % cols) + 1, row: Math.floor(i / cols) + 1 },
      }));
    }

    let maxCol = 0, maxRow = 0;
    for (const agent of agents) {
      maxCol = Math.max(maxCol, agent.desk.col);
      maxRow = Math.max(maxRow, agent.desk.row);
    }

    const cellW = CELL_W + 64;
    const cellH = CELL_H + 80;

    const roomW = Math.max(maxCol * cellW + MARGIN * 2, 580);
    const totalRows = boss ? maxRow + 1 : maxRow;
    const loungeSpace = CELL_H + 48;
    const roomH = totalRows * cellH + MARGIN * 2 + WALL_H + loungeSpace;

    this.clearScene();
    this.roomBuilder.build(roomW, roomH);

    this.characterMap = assignCharacters(agents);
    this.agentPositions.clear();

    const agentRowOffset = boss ? 1 : 0;

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const x = (agent.desk.col - 1) * cellW + MARGIN + cellW / 2;
      const y = (agent.desk.row - 1 + agentRowOffset) * cellH + MARGIN + WALL_H + cellH / 2;
      const characterName = this.characterMap.get(agent.id)!;
      const deskVariant = i % 2 === 0 ? 'black' : 'white';
      const agentSprite = new AgentSprite(this, x, y, characterName, deskVariant, agent);
      this.agentSprites.set(agent.id, agentSprite);
      this.agentPositions.set(agent.id, { x, y });
    }

    // Render boss at the top
    this.bossAvatar = null;
    if (boss) {
      const bossX = roomW / 2;
      const bossY = MARGIN + WALL_H + cellH / 2 - 10;
      this.bossHomeX = bossX;
      this.bossHomeY = bossY;

      const bossChar = boss.gender === 'female'
        ? FEMALE_CHARACTERS[0]
        : MALE_CHARACTERS[0];
      this.bossCharName = bossChar;

      // Boss avatar
      const bossAvatarKey = avatarKeys(bossChar).talk;
      this.bossAvatar = this.add.image(bossX, bossY - 70, bossAvatarKey)
        .setOrigin(0.5, 0.5)
        .setScale(0.9)
        .setDepth(bossY);

      // Boss animation
      const bossKeys = avatarKeys(bossChar);
      let bossFrame = 0;
      const bossRef = this.bossAvatar;
      this.time.addEvent({
        delay: 600,
        loop: true,
        callback: () => {
          if (!bossRef.active) return;
          bossFrame = (bossFrame + 1) % 2;
          bossRef.setTexture(bossFrame === 0 ? bossKeys.talk : bossKeys.blink);
          bossRef.setScale(0.9);
        },
      });

      // Boss desk
      this.add.image(bossX, bossY, FURNITURE_KEYS.deskWood)
        .setOrigin(0.5, 0.5).setScale(1.5).setDepth(bossY + 1);

      // Boss monitor
      this.add.image(bossX, bossY - 30, DESK_KEYS.blackCoding)
        .setOrigin(0.5, 0.5).setScale(1.5).setDepth(bossY + 2);

      // Boss coffee
      this.add.image(bossX + 50, bossY + 8, 'furniture_coffee_mug')
        .setOrigin(0.5, 1).setScale(1.5).setDepth(bossY + 3);

      // Boss name badge
      const labelY = bossY - 150;
      const nameText = this.add.text(bossX, labelY + 5, boss.name, {
        fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#10b981',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 4,
        resolution: 2,
      }).setOrigin(0.5, 0).setDepth(901);

      const titleText = this.add.text(bossX, labelY + 26, 'BOSS', {
        fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#10b981',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3,
        resolution: 2,
      }).setOrigin(0.5, 0).setDepth(901);

      const badgeW = Math.max(nameText.width, titleText.width) + 24;
      const badgeBg = this.add.graphics();
      badgeBg.fillStyle(0x061a12, 0.95);
      badgeBg.fillRoundedRect(bossX - badgeW / 2, labelY, badgeW, 46, 5);
      badgeBg.lineStyle(1.5, 0x10b981, 0.5);
      badgeBg.strokeRoundedRect(bossX - badgeW / 2, labelY, badgeW, 46, 4);
      badgeBg.setDepth(900);
    }

    // Camera
    const cam = this.cameras.main;
    const scaleX = cam.width / (roomW + 32);
    const scaleY = cam.height / (roomH + 32);
    const zoom = Math.min(scaleX, scaleY, 2);
    this.baseZoom = zoom;
    this.roomCenterX = roomW / 2;
    this.roomCenterY = roomH / 2;

    if (!this.focusedAgentId || this.userOverride) {
      cam.setZoom(zoom);
      cam.centerOn(roomW / 2, roomH / 2);
    }

  }

  private clearScene(): void {
    for (const sprite of this.agentSprites.values()) {
      sprite.destroy();
    }
    this.agentSprites.clear();
    this.bossAvatar = null;
    this.children.removeAll(true);
  }
}
