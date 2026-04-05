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
import type { SquadState, Agent } from '@/types/state';

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
  private userOverride = false;  // true when user manually pans/zooms

  constructor() {
    super({ key: 'OfficeScene' });
  }

  preload(): void {
    // Load desk sprites
    for (const [key, path] of Object.entries(DESK_PATHS)) {
      this.load.image(key, path);
    }

    // Load avatar sprites
    for (const name of CHARACTER_NAMES) {
      const keys = avatarKeys(name);
      this.load.image(keys.blink, avatarPath(name, 'blink'));
      this.load.image(keys.talk, avatarPath(name, 'talk'));
      this.load.image(keys.wave1, avatarPath(name, 'wave1'));
      this.load.image(keys.wave2, avatarPath(name, 'wave2'));
    }

    // Load furniture sprites
    for (const [key, path] of Object.entries(FURNITURE_PATHS)) {
      this.load.image(key, path);
    }

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.error('Failed to load asset:', file.key, file.url);
    });
  }

  create(): void {
    // Set all loaded textures to NEAREST filter for crisp pixel art
    this.textures.list && Object.values(this.textures.list).forEach((tex) => {
      if (tex.key !== '__DEFAULT' && tex.key !== '__MISSING') {
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    });

    this.roomBuilder = new RoomBuilder(this);

    this.events.on('stateUpdate', (state: SquadState | null) => {
      this.onStateUpdate(state);
    });

    // Zoom with mouse wheel — marks user override
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: unknown[], _dx: number, dy: number) => {
      const cam = this.cameras.main;
      const zoomDelta = dy > 0 ? -0.15 : 0.15;
      const newZoom = Phaser.Math.Clamp(cam.zoom + zoomDelta, 0.3, 5);
      cam.setZoom(newZoom);
      this.userOverride = true;
    });

    // Pan with left-click drag — marks user override
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

    // Double-click to reset zoom and re-enable auto-focus
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

    // Start with empty desks (no agents)
    this.renderEmptyRoom();
  }

  private onStateUpdate(state: SquadState | null): void {
    if (!state) {
      this.focusedAgentId = null;
      this.renderEmptyRoom();
      return;
    }
    this.renderScene(state.agents);

    // Auto-focus on the working agent
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
      // No one working anymore — zoom back out
      this.focusedAgentId = null;
      const cam = this.cameras.main;
      cam.pan(this.roomCenterX, this.roomCenterY, 800, 'Sine.easeInOut');
      cam.zoomTo(this.baseZoom, 800);
    }
  }

  /** Renders the room with desks, monitors and mugs — but no agents sitting at them. */
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

    // Place empty desks (table + monitor + mug, no avatar or label)
    for (let i = 0; i < desks.length; i++) {
      const d = desks[i];
      const x = (d.col - 1) * cellW + MARGIN + cellW / 2;
      const y = (d.row - 1) * cellH + MARGIN + WALL_H + cellH / 2;
      const variant = i % 2 === 0 ? 'black' : 'white';

      // Desk table surface
      this.add.image(x, y, FURNITURE_KEYS.deskWood)
        .setOrigin(0.5, 0.5).setScale(1.3).setDepth(y + 1);

      // Monitor on desk
      const deskKey = variant === 'black' ? DESK_KEYS.blackCoding : DESK_KEYS.whiteCoding;
      this.add.image(x, y - 30, deskKey)
        .setOrigin(0.5, 0.5).setScale(1.3).setDepth(y + 2);

      // Coffee mug
      this.add.image(x + 42, y + 8, 'furniture_coffee_mug')
        .setOrigin(0.5, 1).setScale(1.4).setDepth(y + 3);
    }

    // Fit room in viewport
    const cam = this.cameras.main;
    const scaleX = cam.width / (roomW + 32);
    const scaleY = cam.height / (roomH + 32);
    const zoom = Math.min(scaleX, scaleY, 2);
    cam.setZoom(zoom);
    cam.centerOn(roomW / 2, roomH / 2);
    this.baseZoom = zoom;
  }

  private renderScene(agents: Agent[]): void {
    // Auto-assign desk positions if all agents are at the same spot (default 1,1)
    const allSameDesk = agents.length > 1 &&
      agents.every(a => a.desk.col === agents[0].desk.col && a.desk.row === agents[0].desk.row);
    if (allSameDesk) {
      const cols = Math.min(agents.length, 3); // max 3 columns
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

    // Wider cells for comfortable spacing between agents + labels
    const cellW = CELL_W + 64;   // 160px per cell (wider for desk tables + decorations)
    const cellH = CELL_H + 80;   // 176px per cell (label + monitor + desk + avatar)

    const roomW = Math.max(maxCol * cellW + MARGIN * 2, 580);
    // Extra space below desk grid for lounge area
    const loungeSpace = CELL_H + 48;
    const roomH = maxRow * cellH + MARGIN * 2 + WALL_H + loungeSpace;

    this.clearScene();
    this.roomBuilder.build(roomW, roomH);

    const characterMap = assignCharacters(agents);
    this.agentPositions.clear();

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const x = (agent.desk.col - 1) * cellW + MARGIN + cellW / 2;
      const y = (agent.desk.row - 1) * cellH + MARGIN + WALL_H + cellH / 2;
      const characterName = characterMap.get(agent.id)!;
      const deskVariant = i % 2 === 0 ? 'black' : 'white';
      const agentSprite = new AgentSprite(this, x, y, characterName, deskVariant, agent);
      this.agentSprites.set(agent.id, agentSprite);
      this.agentPositions.set(agent.id, { x, y });
    }

    // Fit room in viewport with slight padding
    const cam = this.cameras.main;
    const scaleX = cam.width / (roomW + 32);
    const scaleY = cam.height / (roomH + 32);
    const zoom = Math.min(scaleX, scaleY, 2);
    this.baseZoom = zoom;
    this.roomCenterX = roomW / 2;
    this.roomCenterY = roomH / 2;

    // Only reset camera if no auto-focus is active
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
    this.children.removeAll(true);
  }
}

