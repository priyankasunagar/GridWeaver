import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TransmissionTower } from '../../models/grid';
import { gridStore } from '../../store/gridStore';

interface LatticeTower3DProps {
  tower: TransmissionTower;
  isSelected: boolean;
  onSelect: () => void;
}

export const LatticeTower3D: React.FC<LatticeTower3DProps> = ({
  tower,
  isSelected,
  onSelect,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = React.useState(false);

  // Structural lattice geometry generation
  const { legLines, braceLines, crossarmLines } = useMemo(() => {
    const H = tower.height;
    const baseW = 2.4;
    const topW = 0.9;
    const waistY = H * 0.7;

    // 4 Corner Legs
    // Base footprint: 4 corners
    const b1 = new THREE.Vector3(-baseW / 2, 0, -baseW / 2);
    const b2 = new THREE.Vector3(baseW / 2, 0, -baseW / 2);
    const b3 = new THREE.Vector3(baseW / 2, 0, baseW / 2);
    const b4 = new THREE.Vector3(-baseW / 2, 0, baseW / 2);

    // Waist points
    const w1 = new THREE.Vector3(-topW / 2, waistY, -topW / 2);
    const w2 = new THREE.Vector3(topW / 2, waistY, -topW / 2);
    const w3 = new THREE.Vector3(topW / 2, waistY, topW / 2);
    const w4 = new THREE.Vector3(-topW / 2, waistY, topW / 2);

    // Peak points
    const p1 = new THREE.Vector3(-topW / 2, H, -topW / 2);
    const p2 = new THREE.Vector3(topW / 2, H, -topW / 2);
    const p3 = new THREE.Vector3(topW / 2, H, topW / 2);
    const p4 = new THREE.Vector3(-topW / 2, H, topW / 2);

    const legPoints: THREE.Vector3[] = [
      b1, w1, w1, p1,
      b2, w2, w2, p2,
      b3, w3, w3, p3,
      b4, w4, w4, p4,
    ];

    // Diagonal Cross-Bracing levels
    const bracePoints: THREE.Vector3[] = [];
    const levels = 6;
    for (let i = 0; i < levels; i++) {
      const t1 = i / levels;
      const t2 = (i + 1) / levels;
      const y1 = t1 * waistY;
      const y2 = t2 * waistY;
      const w1_curr = baseW + (topW - baseW) * t1;
      const w2_curr = baseW + (topW - baseW) * t2;

      // Front Face X-brace
      bracePoints.push(
        new THREE.Vector3(-w1_curr / 2, y1, w1_curr / 2),
        new THREE.Vector3(w2_curr / 2, y2, w2_curr / 2),
        new THREE.Vector3(w1_curr / 2, y1, w1_curr / 2),
        new THREE.Vector3(-w2_curr / 2, y2, w2_curr / 2)
      );

      // Back Face X-brace
      bracePoints.push(
        new THREE.Vector3(-w1_curr / 2, y1, -w1_curr / 2),
        new THREE.Vector3(w2_curr / 2, y2, -w2_curr / 2),
        new THREE.Vector3(w1_curr / 2, y1, -w1_curr / 2),
        new THREE.Vector3(-w2_curr / 2, y2, -w2_curr / 2)
      );

      // Side Faces
      bracePoints.push(
        new THREE.Vector3(w1_curr / 2, y1, -w1_curr / 2),
        new THREE.Vector3(w2_curr / 2, y2, w2_curr / 2),
        new THREE.Vector3(w1_curr / 2, y1, w1_curr / 2),
        new THREE.Vector3(w2_curr / 2, y2, -w2_curr / 2)
      );
      bracePoints.push(
        new THREE.Vector3(-w1_curr / 2, y1, -w1_curr / 2),
        new THREE.Vector3(-w2_curr / 2, y2, w2_curr / 2),
        new THREE.Vector3(-w1_curr / 2, y1, w1_curr / 2),
        new THREE.Vector3(-w2_curr / 2, y2, -w2_curr / 2)
      );
    }

    // Horizontal crossarms at waist and top
    const armPoints: THREE.Vector3[] = [];
    const armSpan1 = baseW * 3.2; // Main transmission crossarm
    const armSpan2 = baseW * 2.2; // Secondary upper crossarm

    // Lower crossarm
    armPoints.push(
      new THREE.Vector3(-armSpan1 / 2, waistY, 0),
      new THREE.Vector3(armSpan1 / 2, waistY, 0)
    );
    // Upper crossarm
    armPoints.push(
      new THREE.Vector3(-armSpan2 / 2, waistY + (H - waistY) * 0.6, 0),
      new THREE.Vector3(armSpan2 / 2, waistY + (H - waistY) * 0.6, 0)
    );
    // Bridge trusses
    armPoints.push(
      new THREE.Vector3(-armSpan1 / 2, waistY, 0),
      new THREE.Vector3(0, waistY + 1.2, 0),
      new THREE.Vector3(armSpan1 / 2, waistY, 0),
      new THREE.Vector3(0, waistY + 1.2, 0)
    );

    return {
      legLines: new THREE.BufferGeometry().setFromPoints(legPoints),
      braceLines: new THREE.BufferGeometry().setFromPoints(bracePoints),
      crossarmLines: new THREE.BufferGeometry().setFromPoints(armPoints),
    };
  }, [tower.height]);

  const isFaulted = tower.status === 'faulted' || tower.status === 'damaged';

  // Tower structural color
  const steelColor = isFaulted
    ? '#ef4444' // Red if faulted
    : isSelected
    ? '#38bdf8' // Cyan if selected
    : hovered
    ? '#93c5fd'
    : tower.hasAviationMarkings
    ? '#f87171' // Aviation red
    : '#94a3b8'; // Galvanized steel

  // Pulse animation if faulted or selected
  const beaconRef = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (beaconRef.current) {
      if (isFaulted) {
        beaconRef.current.intensity = Math.sin(clock.getElapsedTime() * 8) > 0 ? 3.0 : 0.2;
      } else if (tower.hasAviationMarkings) {
        beaconRef.current.intensity = Math.sin(clock.getElapsedTime() * 3) > 0.5 ? 2.0 : 0.1;
      }
    }
  });

  return (
    <group
      ref={groupRef}
      position={tower.position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Concrete footings */}
      {[-1.2, 1.2].map((x) =>
        [-1.2, 1.2].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.25, z]}>
            <cylinderGeometry args={[0.3, 0.45, 0.5, 8]} />
            <meshStandardMaterial color="#64748b" roughness={0.9} />
          </mesh>
        ))
      )}

      {/* Main Structural Lattice Legs */}
      <lineSegments geometry={legLines}>
        <lineBasicMaterial color={steelColor} linewidth={2} />
      </lineSegments>

      {/* Diagonal Web Bracing */}
      <lineSegments geometry={braceLines}>
        <lineBasicMaterial color={isFaulted ? '#f87171' : '#64748b'} opacity={0.85} transparent />
      </lineSegments>

      {/* Crossarms */}
      <lineSegments geometry={crossarmLines}>
        <lineBasicMaterial color={steelColor} linewidth={2} />
      </lineSegments>

      {/* Insulator strings hanging from crossarm ends (Ceramic bells) */}
      {[-3.8, 3.8, -2.6, 2.6].map((xOffset, idx) => {
        const yPos = idx < 2 ? tower.height * 0.7 - 0.7 : tower.height * 0.7 + (tower.height * 0.3 * 0.6) - 0.7;
        return (
          <group key={`insulator-${idx}`} position={[xOffset, yPos, 0]}>
            {/* Hanging rod */}
            <mesh position={[0, 0.3, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.6, 6]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
            </mesh>
            {/* Ceramic disc stack */}
            {[0, -0.18, -0.36].map((yD, discIdx) => (
              <mesh key={discIdx} position={[0, yD, 0]}>
                <cylinderGeometry args={[0.22, 0.22, 0.08, 10]} />
                <meshStandardMaterial color="#78716c" roughness={0.4} />
              </mesh>
            ))}
            {/* Conductor clamp attachment */}
            <mesh position={[0, -0.5, 0]}>
              <boxGeometry args={[0.15, 0.12, 0.25]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} />
            </mesh>
          </group>
        );
      })}

      {/* Aviation Obstruction Light / Fault Beacon at Tower Apex */}
      <mesh position={[0, tower.height + 0.3, 0]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial
          color={isFaulted ? '#ef4444' : tower.hasAviationMarkings ? '#ef4444' : '#38bdf8'}
          emissive={isFaulted ? '#ef4444' : tower.hasAviationMarkings ? '#dc2626' : '#0284c7'}
          emissiveIntensity={isFaulted ? 3 : 1}
        />
      </mesh>

      <pointLight
        ref={beaconRef}
        position={[0, tower.height + 0.5, 0]}
        color={isFaulted ? '#ef4444' : '#f87171'}
        distance={15}
        intensity={tower.hasAviationMarkings || isFaulted ? 1.5 : 0}
      />

      {/* Selected Indicator Ring on Ground */}
      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.2, 3.6, 32]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Fault Indicator Aura */}
      {isFaulted && (
        <mesh position={[0, tower.height / 2, 0]}>
          <cylinderGeometry args={[2.5, 3.5, tower.height, 16]} />
          <meshBasicMaterial color="#ef4444" wireframe transparent opacity={0.25} />
        </mesh>
      )}
    </group>
  );
};
