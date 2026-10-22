import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GridNode } from '../../models/grid';

interface HydroDam3DProps {
  node: GridNode;
  isSelected: boolean;
  onSelect: () => void;
}

export const HydroDam3D: React.FC<HydroDam3DProps> = ({
  node,
  isSelected,
  onSelect,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const isEnergized = node.isEnergized ?? true;
  const isFaulted = node.status === 'faulted';

  // Status color
  const statusColor = isFaulted ? '#ef4444' : isEnergized ? '#06b6d4' : '#64748b';

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
      {/* Concrete Gravity Dam Wall */}
      {/* Curved / angled monolithic dam structure holding reservoir */}
      <mesh position={[0, -2, -6]} castShadow receiveShadow>
        <boxGeometry args={[26, 14, 5]} />
        <meshStandardMaterial color="#475569" roughness={0.8} />
      </mesh>

      {/* Sloped Downstream Face of Dam */}
      <mesh position={[0, -3.5, -2.5]} rotation={[Math.PI / 4, 0, 0]}>
        <boxGeometry args={[26, 12, 1.5]} />
        <meshStandardMaterial color="#334155" roughness={0.85} />
      </mesh>

      {/* Dam Crest Roadway on Top */}
      <mesh position={[0, 5.2, -6]}>
        <boxGeometry args={[27, 0.4, 4.5]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Crest Roadway Safety Railings */}
      {[-2, 2].map((zR, rIdx) => (
        <mesh key={`rail-${rIdx}`} position={[0, 5.8, -6 + zR]}>
          <boxGeometry args={[26.8, 0.4, 0.08]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} />
        </mesh>
      ))}

      {/* 3x Steel Penstock Conduit Tubes (Channelling high-head water into turbines) */}
      {[-5, 0, 5].map((penX, pIdx) => (
        <group key={`penstock-${pIdx}`} position={[penX, -1, -2]} rotation={[Math.PI / 4, 0, 0]}>
          <cylinderGeometry args={[0.9, 0.9, 10, 16]} />
          <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.3} />
          {/* Penstock reinforcing expansion ring bands */}
          {[-3, -1, 1, 3].map((rY) => (
            <mesh key={rY} position={[0, rY, 0]}>
              <cylinderGeometry args={[1.02, 1.02, 0.25, 16]} />
              <meshStandardMaterial color="#0f172a" metalness={0.9} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Powerhouse Turbine Hall Building (At base of dam) */}
      <group position={[0, -6, 4]}>
        {/* Main Machine Hall */}
        <mesh position={[0, 3, 0]} castShadow receiveShadow>
          <boxGeometry args={[18, 6, 7]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>

        {/* Industrial Gable Roof with Ventilation Monitors */}
        <mesh position={[0, 6.4, 0]}>
          <boxGeometry args={[18.6, 0.8, 7.5]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0, 7.1, 0]}>
          <boxGeometry args={[12, 0.6, 2.5]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>

        {/* High Powerhouse Hall Windows */}
        {[-6, -2, 2, 6].map((wX) => (
          <mesh key={wX} position={[wX, 3.5, 3.52]}>
            <boxGeometry args={[2.2, 3.0, 0.05]} />
            <meshStandardMaterial
              color="#0ea5e9"
              emissive="#0284c7"
              emissiveIntensity={isEnergized ? 0.8 : 0.1}
              transparent
              opacity={0.8}
            />
          </mesh>
        ))}

        {/* Generator Step-Up (GSU) 500kV Outdoor Transformer Deck */}
        <group position={[0, 0, 5.5]}>
          {/* Concrete transformer pad */}
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[16, 0.4, 3.5]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          {/* 3x Heavy 500kV GSU Transformers */}
          {[-5, 0, 5].map((gsuX) => (
            <group key={gsuX} position={[gsuX, 1.2, 0]}>
              <mesh>
                <boxGeometry args={[2.2, 1.8, 2.2]} />
                <meshStandardMaterial color="#1e293b" metalness={0.6} />
              </mesh>
              {/* 500kV Bushings */}
              <mesh position={[0, 1.4, 0]}>
                <cylinderGeometry args={[0.08, 0.15, 1.4, 8]} />
                <meshStandardMaterial color="#78716c" />
              </mesh>
              <mesh position={[0, 2.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.2, 0.04, 8, 16]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
              </mesh>
            </group>
          ))}
        </group>

        {/* Tailrace Water Discharge Chute (Where water exits turbines into river) */}
        <mesh position={[0, -0.4, 9]}>
          <boxGeometry args={[16, 0.6, 5]} />
          <meshStandardMaterial color="#0284c7" roughness={0.1} transparent opacity={0.7} />
        </mesh>
      </group>

      {/* Spillway Flood Gates with Radial Taintor Gates */}
      <group position={[10, 0, -5]}>
        {[-1.5, 1.5].map((spillX) => (
          <mesh key={spillX} position={[spillX, 2, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.6, 0.6, 2.5, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* Facility Beacon Light */}
      <mesh position={[0, 6.5, -6]}>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={isEnergized ? 2.5 : 0.5}
        />
      </mesh>
      <pointLight position={[0, 7.5, -6]} color={statusColor} distance={16} intensity={2} />

      {/* Selection Ring */}
      {isSelected && (
        <mesh position={[0, 5.3, -6]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[14, 15, 36]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

export const PeakerPlant3D: React.FC<HydroDam3DProps> = ({
  node,
  isSelected,
  onSelect,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const isEnergized = node.isEnergized ?? true;
  const isFaulted = node.status === 'faulted';
  const statusColor = isFaulted ? '#ef4444' : isEnergized ? '#06b6d4' : '#64748b';

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
      {/* Industrial Foundation Pad */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[14, 0.2, 10]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>

      {/* Gas Turbine Acoustic Enclosure Building */}
      <mesh position={[-3, 1.8, 0]} castShadow>
        <boxGeometry args={[5, 3.4, 4.5]} />
        <meshStandardMaterial color="#475569" roughness={0.6} />
      </mesh>

      {/* Tall Turbine Exhaust Stack */}
      <group position={[-4, 3.5, 0]}>
        <mesh position={[0, 2.5, 0]} castShadow>
          <cylinderGeometry args={[0.6, 0.75, 5, 16]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} />
        </mesh>
        {/* Exhaust silencer cowl */}
        <mesh position={[0, 5.2, 0]}>
          <cylinderGeometry args={[0.85, 0.6, 0.5, 16]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      </group>

      {/* Battery Energy Storage System (BESS) White Modular Enclosures */}
      {[0, 2.2, 4.4].map((bX, idx) => (
        <group key={`bess-${idx}`} position={[2.5, 1.2, -2.5 + bX]}>
          {/* 40ft Container Battery Enclosure */}
          <mesh castShadow>
            <boxGeometry args={[3.8, 2.2, 1.6]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>
          {/* HVAC chiller unit on container end */}
          <mesh position={[2.0, 0.2, 0]}>
            <boxGeometry args={[0.4, 1.4, 1.2]} />
            <meshStandardMaterial color="#64748b" />
          </mesh>
          {/* BESS Status LED Strip */}
          <mesh position={[0, 0.8, 0.82]}>
            <boxGeometry args={[3.2, 0.1, 0.05]} />
            <meshStandardMaterial
              color="#10b981"
              emissive="#10b981"
              emissiveIntensity={isEnergized ? 2 : 0}
            />
          </mesh>
        </group>
      ))}

      {/* Generator Step-Up Transformer (230 kV) */}
      <group position={[-2, 1.0, 3]}>
        <mesh>
          <boxGeometry args={[2, 1.6, 1.8]} />
          <meshStandardMaterial color="#1e293b" metalness={0.7} />
        </mesh>
        <mesh position={[0, 1.4, 0]}>
          <cylinderGeometry args={[0.08, 0.12, 1.2, 8]} />
          <meshStandardMaterial color="#78716c" />
        </mesh>
      </group>

      {/* Status beacon */}
      <mesh position={[-4, 8.8, 0]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={2} />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[8.5, 9.2, 36]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};
