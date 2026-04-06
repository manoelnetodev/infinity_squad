import Phaser from 'phaser';
import { avatarKeys, DESK_KEYS, FURNITURE_KEYS, type CharacterName } from './assetKeys';
import { COLORS } from './palette';
import type { Agent, AgentStatus } from '@/types/state';

// Avatar display scale — characters should be prominent at desk
const AVATAR_SCALE = 0.8;

// Status → badge color mapping
const STATUS_COLORS: Record<AgentStatus, number> = {
  idle: COLORS.statusIdle,
  working: COLORS.statusWorking,
  done: COLORS.statusDone,
  checkpoint: COLORS.statusCheckpoint,
  delivering: COLORS.statusWorking,
};

// Agent ID → slash command mapping
const SLASH_COMMANDS: Record<string, string> = {
  'analyst': '/analyst',
  'tech-writer': '/tech-writer',
  'pm': '/pm',
  'ux-designer': '/ux',
  'architect': '/architect',
  'developer': '/dev',
  'scrum-master': '/sm',
  'qa-engineer': '/qa',
  'solo-dev': '/solo-dev',
};

// Agent ID → profile info (title, capabilities)
const AGENT_PROFILES: Record<string, { title: string; style: string; capabilities: string[] }> = {
  'analyst': {
    title: 'Business Analyst',
    style: 'Fala como uma caçadora de tesouros — empolgada com cada pista!',
    capabilities: [
      'BP — Brainstorming facilitado',
      'MR — Pesquisa de mercado e competidores',
      'DR — Pesquisa de domínio e indústria',
      'TR — Pesquisa técnica e viabilidade',
      'CB — Criar/atualizar product brief',
      'DP — Documentar projeto existente',
    ],
  },
  'tech-writer': {
    title: 'Technical Writer',
    style: 'Educadora paciente que explica como uma amiga.',
    capabilities: [
      'DP — Documentação completa de projeto',
      'WD — Escrever documento técnico',
      'MG — Gerar diagrama Mermaid',
      'VD — Validar documentação',
      'EC — Explicar conceitos técnicos',
    ],
  },
  'pm': {
    title: 'Product Manager',
    style: 'Pergunta "POR QUÊ?" como um detetive. Direto e afiado.',
    capabilities: [
      'CP — Criar PRD do zero',
      'VP — Validar PRD existente',
      'EP — Editar PRD existente',
      'CE — Criar épicos e stories',
      'IR — Verificar prontidão para implementação',
      'CC — Corrigir curso do sprint',
    ],
  },
  'ux-designer': {
    title: 'UX Designer',
    style: 'Pinta com palavras, conta histórias que fazem sentir o problema.',
    capabilities: [
      'CU — Criar design UX completo',
    ],
  },
  'architect': {
    title: 'System Architect',
    style: 'Tom calmo e pragmático, equilibra o possível com o ideal.',
    capabilities: [
      'CA — Criar arquitetura e decisões técnicas',
      'IR — Verificar prontidão para implementação',
    ],
  },
  'developer': {
    title: 'Senior Software Engineer',
    style: 'Ultra-sucinta. Fala em paths e IDs — zero enrolação.',
    capabilities: [
      'DS — Implementar story com TDD',
      'CR — Code review adversarial',
    ],
  },
  'qa-engineer': {
    title: 'QA Engineer',
    style: 'Prática e direta. Foco em cobertura primeiro.',
    capabilities: [
      'QA — Gerar testes E2E e API',
    ],
  },
  'solo-dev': {
    title: 'Quick Flow Solo Dev',
    style: 'Direto, confiante. Sem firula, só resultado.',
    capabilities: [
      'QD — Quick flow: clarificar, planejar, implementar, revisar',
      'CR — Code review adversarial',
    ],
  },
  'scrum-master': {
    title: 'Scrum Master',
    style: 'Checklist-driven. Cada palavra tem propósito.',
    capabilities: [
      'SP — Gerar/atualizar sprint plan',
      'CS — Preparar story para implementação',
      'ER — Retrospectiva do épico',
      'CC — Corrigir curso do sprint',
    ],
  },
};

// Status → display label
const STATUS_LABELS: Record<AgentStatus, string> = {
  idle: 'Parado',
  working: 'Trabalhando',
  done: 'Concluído',
  checkpoint: 'Aprovação',
  delivering: 'Entregando',
};

export class AgentSprite {
  private static openDialog: AgentSprite | null = null;

  static closeOpenDialog(): void {
    if (AgentSprite.openDialog) {
      AgentSprite.openDialog.hideDialog();
    }
  }

  private scene: Phaser.Scene;
  private deskTable: Phaser.GameObjects.Image;
  private deskShadow: Phaser.GameObjects.Graphics;
  private desk: Phaser.GameObjects.Image;
  private coffeeMug: Phaser.GameObjects.Image;
  private avatar: Phaser.GameObjects.Image;
  private nameText: Phaser.GameObjects.Text;
  private badgeBg: Phaser.GameObjects.Graphics;
  private statusDot: Phaser.GameObjects.Graphics;
  private statusText: Phaser.GameObjects.Text;
  private animTimer?: Phaser.Time.TimerEvent;
  private agent: Agent;
  private characterName: CharacterName;
  private deskVariant: 'black' | 'white';
  private avatarDisplayH: number = 0;
  private dialogGroup: Phaser.GameObjects.Group | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    characterName: CharacterName,
    deskVariant: 'black' | 'white',
    agent: Agent,
  ) {
    this.scene = scene;
    this.agent = agent;
    this.characterName = characterName;
    this.deskVariant = deskVariant;

    // === VERTICAL LAYOUT (sprites, top to bottom on screen) ===
    // desk_wood: 96x64 @ 1.3x = 125x83px  → y-42 to y+42
    // desktop_set: ~48x40 @ 1.3x = 62x52px → y-56 to y-4  (center at y-30)
    // avatar: 48x51 @ 0.8x = 38x41px        → y-91 to y-50 (center at y-70)
    //
    // Depth order (low = behind, high = front):
    //   avatar     → y        (seated character, lowest — desk will cover lower body)
    //   desk_wood  → y+1      (desk surface IN FRONT of avatar → covers avatar's lower half)
    //   monitor    → y+2      (on desk surface, screen faces viewer)
    //   coffee mug → y+3      (foreground item on front desk edge)
    //   label      → 900/901  (always on top)
    //
    // Result: avatar fully visible above monitor, lower body hidden by desk → seated look
    // =========================================

    // Avatar — positioned further behind the desk so head/torso is clearly visible
    const avatarKey = this.getAvatarKey(agent.status);
    this.avatar = scene.add.image(x, y - 70, avatarKey)
      .setOrigin(0.5, 0.5)
      .setScale(AVATAR_SCALE)
      .setDepth(y);  // LOWEST depth — desk and monitor render in front
    // Lock display height so texture swaps between frames of different pixel dimensions
    // don't cause a visible scale jump (e.g. Male1 blink=56px tall vs talk=51px tall).
    // Width is NOT locked — each frame scales proportionally from this height reference.
    this.avatarDisplayH = this.avatar.displayHeight;

    // Desk table surface — renders IN FRONT of avatar (covers lower body)
    this.deskTable = scene.add.image(x, y, FURNITURE_KEYS.deskWood)
      .setOrigin(0.5, 0.5)
      .setScale(1.3)
      .setDepth(y + 1);

    // Monitor — screen-facing (_down orientation), sits on desk surface
    const deskKey = this.getDeskKey(agent.status);
    this.desk = scene.add.image(x, y - 30, deskKey)
      .setOrigin(0.5, 0.5)
      .setScale(1.3)
      .setDepth(y + 2);  // On top of desk surface, screen visible to viewer

    // Coffee mug — right side of desk, away from monitor
    this.coffeeMug = scene.add.image(x + 42, y + 8, 'furniture_coffee_mug')
      .setOrigin(0.5, 1).setScale(1.4).setDepth(y + 3);

    // Shadow (unused graphics object kept for destroy() compatibility)
    this.deskShadow = scene.add.graphics();
    this.deskShadow.setDepth(y - 1);

    // Name badge — above avatar head (avatar center y-70, head top ≈ y-91, badge at y-140)
    // badge height = 44px → badge bottom at y-96, leaving 5px gap above avatar top
    const labelY = y - 140;

    // Background pill behind name + status
    this.badgeBg = scene.add.graphics();

    // Name text — bold, clean, high contrast
    const slash = SLASH_COMMANDS[agent.id] || '';
    const displayName = slash ? `${agent.name}  ${slash}` : agent.name;
    this.nameText = scene.add.text(x, labelY + 5, displayName, {
      fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4,
      resolution: 2,
    }).setOrigin(0.5, 0);
    this.nameText.setDepth(901);

    // Click to copy slash command
    if (slash) {
      this.nameText.setInteractive({ useHandCursor: true });
      this.nameText.on('pointerdown', () => {
        navigator.clipboard.writeText(slash).then(() => {
          const original = this.nameText.text;
          this.nameText.setText('Copiado!');
          scene.time.delayedCall(1000, () => this.nameText.setText(original));
        });
      });
    }

    // Status dot
    this.statusDot = scene.add.graphics();

    // Status text — colored with outline
    const statusColor = this.getStatusHexColor(agent.status);
    this.statusText = scene.add.text(x, labelY + 24, STATUS_LABELS[agent.status], {
      fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: statusColor,
      align: 'center',
      stroke: '#000000',
      strokeThickness: 3,
      resolution: 2,
    }).setOrigin(0.5, 0);
    this.statusText.setDepth(901);

    // Draw background and status dot
    this.drawLabelBackground(x, labelY);
    this.drawStatusDot(x, labelY + 22, agent.status);

    this.startAnimation(agent.status);

    // Click avatar to show agent profile dialog
    this.avatar.setInteractive({ useHandCursor: true });
    this.avatar.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.toggleDialog();
    });
  }

  private getStatusHexColor(status: AgentStatus): string {
    const num = STATUS_COLORS[status] ?? COLORS.statusIdle;
    return '#' + num.toString(16).padStart(6, '0');
  }

  private getDeskKey(_status: AgentStatus): string {
    // Always show coding desk — all agents are always working
    return this.deskVariant === 'black' ? DESK_KEYS.blackCoding : DESK_KEYS.whiteCoding;
  }

  private getAvatarKey(_status: AgentStatus): string {
    // Always start in talk frame — animation will cycle from there
    return avatarKeys(this.characterName).talk;
  }

  private drawLabelBackground(x: number, labelY: number): void {
    const nameW = Math.max(this.nameText.width, this.statusText.width + 18);
    const bgW = nameW + 20;
    const bgH = 44;
    // Solid dark background with rounded corners
    this.badgeBg.fillStyle(0x0f1629, 0.95);
    this.badgeBg.fillRoundedRect(x - bgW / 2, labelY, bgW, bgH, 5);
    // Subtle border
    this.badgeBg.lineStyle(1, 0x1a2540, 0.6);
    this.badgeBg.strokeRoundedRect(x - bgW / 2, labelY, bgW, bgH, 4);
    this.badgeBg.setDepth(900);
  }

  private drawStatusDot(x: number, _statusY: number, status: AgentStatus): void {
    const dotColor = STATUS_COLORS[status] ?? COLORS.statusIdle;
    const textW = Math.max(this.statusText.width, 24);
    this.statusDot.fillStyle(dotColor, 1);
    this.statusDot.fillCircle(x - textW / 2 - 5, this.statusText.y + this.statusText.height / 2, 3);
    this.statusDot.setDepth(901);
  }

  private setAvatarFrame(key: string): void {
    this.avatar.setTexture(key);
    // Scale uniformly so height matches the reference (talk frame) — preserves aspect ratio
    this.avatar.setScale(this.avatarDisplayH / this.avatar.height);
  }

  private startAnimation(_status: AgentStatus): void {
    // Always run the working animation regardless of status
    const keys = avatarKeys(this.characterName);
    let frame = 0;
    this.animTimer = this.scene.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        frame = (frame + 1) % 2;
        this.setAvatarFrame(frame === 0 ? keys.talk : keys.blink);
      },
    });
  }

  // Optional callback to close external dialogs (e.g. boss dialog)
  static onDialogOpen: (() => void) | null = null;

  private toggleDialog(): void {
    if (this.dialogGroup) {
      this.hideDialog();
      return;
    }
    // Close any other open dialog first
    if (AgentSprite.openDialog && AgentSprite.openDialog !== this) {
      AgentSprite.openDialog.hideDialog();
    }
    // Close boss dialog if open
    AgentSprite.onDialogOpen?.();
    this.showDialog();
  }

  private showDialog(): void {
    const profile = AGENT_PROFILES[this.agent.id];
    if (!profile) return;

    this.dialogGroup = this.scene.add.group();
    const cx = this.avatar.x;
    const cy = this.avatar.y - 180;

    const lines = [
      `${this.agent.name} — ${profile.title}`,
      '',
      `"${profile.style}"`,
      '',
      '── Capacidades ──',
      ...profile.capabilities,
    ];
    const content = lines.join('\n');

    // Measure text to size the panel
    const textObj = this.scene.add.text(cx, cy, content, {
      fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
      fontSize: '11px',
      color: '#e2e8f0',
      align: 'left',
      lineSpacing: 4,
      wordWrap: { width: 240 },
      resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(1002);

    const padX = 16;
    const padY = 14;
    const panelW = textObj.width + padX * 2;
    const panelH = textObj.height + padY * 2;

    // Panel background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0f1629, 0.96);
    bg.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 8);
    bg.lineStyle(1.5, 0x3b82f6, 0.7);
    bg.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 8);
    bg.setDepth(1001);

    // Title underline accent
    const accentY = cy - panelH / 2 + padY + 16;
    bg.lineStyle(1, 0x3b82f6, 0.4);
    bg.lineBetween(cx - panelW / 2 + padX, accentY, cx + panelW / 2 - padX, accentY);

    // Tail triangle pointing down to avatar
    const tailX = cx;
    const tailY = cy + panelH / 2;
    bg.fillStyle(0x0f1629, 0.96);
    bg.fillTriangle(tailX - 6, tailY, tailX + 6, tailY, tailX, tailY + 10);

    // Close button (X)
    const closeBtn = this.scene.add.text(cx + panelW / 2 - 10, cy - panelH / 2 + 4, '✕', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#64748b',
      resolution: 2,
    }).setOrigin(0.5, 0).setDepth(1003).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#f87171'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#64748b'));
    closeBtn.on('pointerdown', (p: Phaser.Input.Pointer) => {
      p.event.stopPropagation();
      this.hideDialog();
    });

    this.dialogGroup.addMultiple([bg, textObj, closeBtn]);

    // Animate in
    const targets = [bg, textObj, closeBtn];
    for (const t of targets) {
      (t as Phaser.GameObjects.Components.AlphaSingle).alpha = 0;
    }
    this.scene.tweens.add({ targets, alpha: 1, duration: 200, ease: 'Sine.easeOut' });
    AgentSprite.openDialog = this;
  }

  private hideDialog(): void {
    if (!this.dialogGroup) return;
    const children = this.dialogGroup.getChildren().slice();
    this.scene.tweens.add({
      targets: children,
      alpha: 0,
      duration: 150,
      ease: 'Sine.easeIn',
      onComplete: () => {
        for (const c of children) c.destroy();
        this.dialogGroup?.destroy(true);
        this.dialogGroup = null;
        if (AgentSprite.openDialog === this) AgentSprite.openDialog = null;
      },
    });
  }

  updateStatus(agent: Agent): void {
    if (this.agent.status === agent.status) return;
    this.agent = agent;

    this.desk.setTexture(this.getDeskKey(agent.status));
    this.setAvatarFrame(this.getAvatarKey(agent.status));

    this.animTimer?.destroy();
    this.startAnimation(agent.status);

    // Update status text and dot
    this.statusText.setText(STATUS_LABELS[agent.status]);
    this.statusText.setColor(this.getStatusHexColor(agent.status));

    this.statusDot.clear();
    const dotColor = STATUS_COLORS[agent.status] ?? COLORS.statusIdle;
    this.statusDot.fillStyle(dotColor, 1);
    const textW = Math.max(this.statusText.width, 24);
    this.statusDot.fillCircle(
      this.statusText.x - textW / 2 - 5,
      this.statusText.y + this.statusText.height / 2,
      3,
    );
  }

  hideAvatar(): void {
    this.avatar.setVisible(false);
  }

  showAvatar(): void {
    this.avatar.setVisible(true);
  }

  destroy(): void {
    this.animTimer?.destroy();
    this.dialogGroup?.destroy(true);
    this.dialogGroup = null;
    this.deskTable.destroy();
    this.deskShadow.destroy();
    this.desk.destroy();
    this.coffeeMug.destroy();
    this.avatar.destroy();
    this.nameText.destroy();
    this.badgeBg.destroy();
    this.statusDot.destroy();
    this.statusText.destroy();
  }
}
