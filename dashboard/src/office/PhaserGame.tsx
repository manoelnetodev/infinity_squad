import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { OfficeScene } from './OfficeScene';
import { useSquadStore } from '@/store/useSquadStore';

function getSquadState() {
  const state = useSquadStore.getState();
  const selectedSquad = state.selectedSquad;
  return selectedSquad
    ? state.activeStates.get(selectedSquad) ?? null
    : null;
}

export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  // Create Phaser game on mount
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const container = containerRef.current;
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: container,
      width: w,
      height: h,
      pixelArt: false,
      antialias: false,
      roundPixels: true,
      backgroundColor: '#1a1420',
      scene: [OfficeScene],
      scale: {
        mode: Phaser.Scale.NONE,
      },
    });

    gameRef.current = game;

    // When the scene finishes creating, push the current store state to it
    game.events.on('ready', () => {
      const scene = game.scene.getScene('OfficeScene') as OfficeScene | null;
      if (!scene) return;

      // Wait for scene to be fully created
      scene.events.on('create', () => {
        const squadState = getSquadState();
        scene.events.emit('stateUpdate', squadState);
      });
    });

    // Resize canvas when container resizes
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          game.scale.resize(width, height);
        }
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  // Bridge React state → Phaser scene (for ongoing updates)
  useEffect(() => {
    return useSquadStore.subscribe((state) => {
      const game = gameRef.current;
      if (!game) return;
      const scene = game.scene.getScene('OfficeScene') as OfficeScene | null;
      if (!scene || !scene.scene.isActive()) return;

      const selectedSquad = state.selectedSquad;
      const squadState = selectedSquad
        ? state.activeStates.get(selectedSquad) ?? null
        : null;

      scene.events.emit('stateUpdate', squadState);
    });
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: 'hidden',
        imageRendering: 'auto',
      }}
    />
  );
}
