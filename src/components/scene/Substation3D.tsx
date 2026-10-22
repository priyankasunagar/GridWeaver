import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GridNode } from '../../models/grid';

interface Substation3DProps {
  node: GridNode;
  isSelected: boolean;
  onSelect: () => void;
  isMainSubstation?: boolean;
}

export const Substation3D: React.FC<Substation3DProps> = ({
  node,
  isSelected,
  onSelect,
  isMainSubstation = false,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const isFaulted = node.status === 'faulted';
  const isEnergized = node.isEnergized ?? true;

  // Status-dependent equipment colors
  const statusGlowColor = isFaulted ? '#ef4444' : isEnergized ? '#06b6d4' : '#64748b';

  return (
    <group
      ref={groupRef}
      position={node.position}
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
      {/* Gravel Substation Yard Surface */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[isMainSubstation ? 18 : 12, 0.1, isMainSubstation ? 14 : 10]} />
        <meshStandardMaterial color="#334155" roughness={0.95} />
      </mesh>

      {/* Concrete Transformer Foundations */}
      {[-3, 3].map((xOffset) => (
        <mesh key={xOffset} position={[xOffset, 0.2, -1]}>
          <boxGeometry args={[3.2, 0.3, 3.8]} />
          <meshStandardMaterial color="#475569" roughness={0.9} />
        </mesh>
      ))}

      {/* 2x Main Power Autotransformer Units */}
      {[-3, 3].map((xOffset, idx) => (
        <group key={`trans-${idx}`} position={[xOffset, 0.35, -1]}>
          {/* Main Transformer Oil Tank */}
          <mesh position={[0, 1.2, 0]} castShadow>
            <boxGeometry args={[2.2, 2.0, 2.6]} />
            <meshStandardMaterial
              color={isFaulted ? '#7f1d1d' : '#475569'}
              metalness={0.6}
              roughness={0.4}
            />
          </mesh>

          {/* Cooling Radiator Fin Banks (Left and Right) */}
          {[-1.3, 1.3].map((rX) => (
            <group key={`rad-${rX}`} position={[rX, 1.2, 0]}>
              <boxGeometry args={[0.3, 1.6, 2.4]} />
              <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
              {/* Radiator fan hoods */}
              {[-0.6, 0.6].map((fZ) => (
                <mesh key={fZ} position={[rX > 0 ? 0.2 : -0.2, 0, fZ]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.35, 0.35, 0.15, 12]} />
                  <meshStandardMaterial color="#1e293b" />
                </mesh>
              ))}
            </group>
          ))}

          {/* Conservator Oil Tank (Cylindrical header on top) */}
          <mesh position={[0, 2.4, 0.4]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.35, 0.35, 1.8, 16]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} />
          </mesh>

          {/* High Voltage Bushings (3-Phase Porcelain Stacks with corona rings) */}
          {[-0.6, 0, 0.6].map((bX, bIdx) => (
            <group key={`bushing-${bIdx}`} position={[bX, 2.2, -0.6]}>
              {/* Porcelain ribbed cylinder */}
              <mesh position={[0, 0.7, 0]}>
                <cylinderGeometry args={[0.08, 0.14, 1.4, 8]} />
                <meshStandardMaterial color="#78716c" roughness={0.4} />
              </mesh>
              {/* Corona Shielding Ring */}
              <mesh position={[0, 1.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.18, 0.03, 8, 16]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
              </mesh>
              {/* Bushing Terminal Lug */}
              <mesh position={[0, 1.45, 0]}>
                <sphereGeometry args={[0.06, 8, 8]} />
                <meshStandardMaterial
                  color={isFaulted ? '#ef4444' : isEnergized ? '#38bdf8' : '#94a3b8'}
                  emissive={isFaulted ? '#ef4444' : isEnergized ? '#0284c7' : '#000000'}
                  emissiveIntensity={isEnergized ? 1.5 : 0}
                />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* High-Voltage Steel Gantry Take-Off Structures (Lattice Portal Frames) */}
      <group position={[0, 0, 3]}>
        {/* Vertical lattice gantry posts */}
        {[-6, 6].map((pX) => (
          <group key={`post-${pX}`} position={[pX, 0, 0]}>
            <mesh position={[0, 3, 0]}>
              <boxGeometry args={[0.4, 6, 0.4]} />
              <meshStandardMaterial color="#64748b" metalness={0.7} />
            </mesh>
          </group>
        ))}
        {/* Horizontal Gantry Cross-Beam */}
        <mesh position={[0, 6, 0]}>
          <boxGeometry args={[12.4, 0.5, 0.5]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} />
        </mesh>
        {/* Hanging Station Insulators & Busbar connections */}
        {[-4, -1.5, 1.5, 4].map((busX, bIdx) => (
          <group key={`bus-${bIdx}`} position={[busX, 5.2, 0]}>
            <mesh>
              <cylinderGeometry args={[0.08, 0.08, 1.2, 8]} />
              <meshStandardMaterial color="#57534e" />
            </mesh>
            {/* Busbar conductor tube */}
            <mesh position={[0, -0.6, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.04, 0.04, 2.5, 6]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} />
            </mesh>
          </group>
        ))}
      </group>

      {/* SF6 Gas Circuit Breakers & Disconnect Switches */}
      {[-4.5, 0, 4.5].map((cbX, cbIdx) => (
        <group key={`cb-${cbIdx}`} position={[cbX, 0.1, 1.2]}>
          {/* Circuit breaker base */}
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[1.0, 0.8, 0.9]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          {/* 3 Interrupter columns */}
          {[-0.3, 0, 0.3].map((colX, cIdx) => (
            <mesh key={`col-${cIdx}`} position={[colX, 1.2, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.8, 8]} />
              <meshStandardMaterial color="#78716c" />
            </mesh>
          ))}
        </group>
      ))}

      {/* Substation Control & Relay House */}
      <group position={[isMainSubstation ? -6.5 : -4.5, 0.1, -4.5]}>
        {/* Building structure */}
        <mesh position={[0, 1.3, 0]} castShadow>
          <boxGeometry args={[3.2, 2.5, 3.5]} />
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </mesh>
        {/* Roof overhang */}
        <mesh position={[0, 2.6, 0]}>
          <boxGeometry args={[3.6, 0.2, 3.9]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Control room door & window */}
        <mesh position={[1.62, 1.0, 0]}>
          <boxGeometry args={[0.05, 1.8, 0.9]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        {/* Emergency Battery / Generator exhaust stack */}
        <mesh position={[-1.2, 2.8, -1.2]}>
          <cylinderGeometry args={[0.08, 0.08, 1.2, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} />
        </mesh>
      </group>

      {/* Perimeter Security Fence Posts & Mesh Outline */}
      <group position={[0, 0, 0]}>
        {/* Corner fence posts */}
        {[
          [-(isMainSubstation ? 9 : 6), -(isMainSubstation ? 7 : 5)],
          [(isMainSubstation ? 9 : 6), -(isMainSubstation ? 7 : 5)],
          [(isMainSubstation ? 9 : 6), (isMainSubstation ? 7 : 5)],
          [-(isMainSubstation ? 9 : 6), (isMainSubstation ? 7 : 5)],
        ].map(([fX, fZ], fIdx) => (
          <mesh key={`fpost-${fIdx}`} position={[fX, 1.1, fZ]}>
            <cylinderGeometry args={[0.06, 0.06, 2.2, 6]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
        ))}
        {/* Fencing top rail wire */}
        <mesh position={[0, 2.2, (isMainSubstation ? 7 : 5)]}>
          <boxGeometry args={[isMainSubstation ? 18 : 12, 0.05, 0.05]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} />
        </mesh>
        <mesh position={[0, 2.2, -(isMainSubstation ? 7 : 5)]}>
          <boxGeometry args={[isMainSubstation ? 18 : 12, 0.05, 0.05]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} />
        </mesh>
      </group>

      {/* Substation Status Beacon Light */}
      <mesh position={[0, 6.4, 3]}>
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshStandardMaterial
          color={statusGlowColor}
          emissive={statusGlowColor}
          emissiveIntensity={isEnergized ? 2.5 : 0.5}
        />
      </mesh>
      <pointLight position={[0, 6.8, 3]} color={statusGlowColor} distance={12} intensity={1.5} />

      {/* Selection Ring */}
      {isSelected && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[isMainSubstation ? 10.5 : 7.5, isMainSubstation ? 11.2 : 8.2, 40]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Fault Sparks / Red Warning Aura */}
      {isFaulted && (
        <mesh position={[0, 2.5, 0]}>
          <boxGeometry args={[isMainSubstation ? 18.5 : 12.5, 5, isMainSubstation ? 14.5 : 10.5]} />
          <meshBasicMaterial color="#ef4444" wireframe transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
};
