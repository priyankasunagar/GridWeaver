import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { GridNode, TransmissionTower } from '../../models/grid';

interface StatusLabels3DProps {
  nodes: GridNode[];
  towers: TransmissionTower[];
  selectedComponentId: string | null;
  onSelectNode: (id: string) => void;
  onSelectTower: (id: string) => void;
  showLabels?: boolean;
}

/**
 * Creates high-resolution 2D canvas texture for 3D billboard labels.
 * 100% native Three.js Sprite, zero nested React roots, zero DOM unmounting race conditions.
 */
function createLabelTexture(
  title: string,
  kv: number,
  detail: string,
  status: 'normal' | 'fault' | 'islanded' | 'selected'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  const x = 12, y = 12, w = 488, h = 136, r = 24;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();

  let bgColor = 'rgba(15, 23, 42, 0.92)';
  let borderColor = '#334155';
  let dotColor = '#10b981';

  if (status === 'fault') {
    bgColor = 'rgba(69, 10, 10, 0.95)';
    borderColor = '#ef4444';
    dotColor = '#ef4444';
  } else if (status === 'islanded') {
    bgColor = 'rgba(69, 26, 3, 0.95)';
    borderColor = '#f59e0b';
    dotColor = '#f59e0b';
  } else if (status === 'selected') {
    bgColor = 'rgba(8, 47, 73, 0.95)';
    borderColor = '#38bdf8';
    dotColor = '#38bdf8';
  }

  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = borderColor;
  ctx.stroke();

  // Status Indicator Dot
  ctx.beginPath();
  ctx.arc(52, 78, 14, 0, Math.PI * 2);
  ctx.fillStyle = dotColor;
  ctx.fill();

  // Title text
  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, 82, 66);

  // kV tag box
  ctx.font = 'bold 24px monospace';
  const tagText = `${kv}kV`;
  const tagWidth = ctx.measureText(tagText).width + 16;
  ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
  ctx.fillRect(470 - tagWidth, 38, tagWidth, 36);
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(tagText, 478 - tagWidth, 64);

  // Subtitle / detail text
  ctx.font = '500 28px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(detail, 82, 114);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

const NodeSpriteLabel: React.FC<{
  node: GridNode;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ node, isSelected, onSelect }) => {
  const isFaulted = node.status === 'faulted';
  const isIslanded = node.status === 'islanded_backup';
  const isEnergized = node.isEnergized ?? true;

  const statusType = isFaulted || !isEnergized
    ? 'fault'
    : isSelected
    ? 'selected'
    : isIslanded
    ? 'islanded'
    : 'normal';

  const title = node.name.split(' ')[0];
  const detail = node.demandMw > 0 
    ? `${node.powerServedMw ?? node.demandMw}/${node.demandMw} MW ${isIslanded ? '(Backup)' : ''}`
    : `${node.generationCapacityMw} MW Gen`;

  const texture = useMemo(() => {
    return createLabelTexture(title, node.voltageKv, detail, statusType);
  }, [title, node.voltageKv, detail, statusType]);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  const yOffset = node.type.includes('substation') ? 8.2 : node.type === 'generation' ? 10.5 : 8.5;

  return (
    <sprite
      position={[node.position[0], node.position[1] + yOffset, node.position[2]]}
      scale={[9.6, 3.0, 1]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <spriteMaterial map={texture} depthTest={false} transparent />
    </sprite>
  );
};

const TowerSpriteLabel: React.FC<{
  tower: TransmissionTower;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ tower, isSelected, onSelect }) => {
  const isFaulted = tower.status === 'faulted' || tower.status === 'damaged';

  const texture = useMemo(() => {
    return createLabelTexture(
      tower.name.split(' ')[0],
      tower.voltageKv,
      isFaulted ? 'STRUCTURAL FAULT' : 'TOWER NORMAL',
      isFaulted ? 'fault' : 'selected'
    );
  }, [tower.name, tower.voltageKv, isFaulted]);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  return (
    <sprite
      position={[tower.position[0], tower.position[1] + tower.height + 3, tower.position[2]]}
      scale={[8.8, 2.75, 1]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <spriteMaterial map={texture} depthTest={false} transparent />
    </sprite>
  );
};

export const StatusLabels3D: React.FC<StatusLabels3DProps> = ({
  nodes,
  towers,
  selectedComponentId,
  onSelectNode,
  onSelectTower,
  showLabels = true,
}) => {
  if (!showLabels) return null;

  return (
    <group>
      {nodes.map((node) => (
        <NodeSpriteLabel
          key={node.id}
          node={node}
          isSelected={selectedComponentId === node.id}
          onSelect={() => onSelectNode(node.id)}
        />
      ))}

      {towers
        .filter((t) => t.id === selectedComponentId || t.status === 'faulted')
        .map((tower) => (
          <TowerSpriteLabel
            key={tower.id}
            tower={tower}
            isSelected={selectedComponentId === tower.id}
            onSelect={() => onSelectTower(tower.id)}
          />
        ))}
    </group>
  );
};
