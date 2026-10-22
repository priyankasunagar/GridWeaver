import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GridNode } from '../../models/grid';

interface FacilityProps {
  node: GridNode;
  isSelected: boolean;
  onSelect: () => void;
}

export const Hospital3D: React.FC<FacilityProps> = ({ node, isSelected, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const isEnergized = node.isEnergized ?? true;
  const isIslandedBackup = node.status === 'islanded_backup';
  const isFaulted = node.status === 'faulted' || !isEnergized;

  const statusColor = isFaulted ? '#ef4444' : isIslandedBackup ? '#f59e0b' : '#10b981';

  return (
    <group
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
      {/* Ground Foundation Pad */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[14, 0.1, 14]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* Main Hospital Multi-Story Tower */}
      <mesh position={[0, 3.2, 0]} castShadow>
        <boxGeometry args={[8, 6.2, 7]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Hospital Cross-Wing */}
      <mesh position={[0, 2.4, 0]} castShadow>
        <boxGeometry args={[12, 4.6, 5]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
      </mesh>

      {/* Emergency ER Trauma Entrance Canopy */}
      <mesh position={[-4, 1.2, 4.2]}>
        <boxGeometry args={[4, 0.2, 3]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      {/* Canopy support columns */}
      <mesh position={[-5.8, 0.6, 5.5]}>
        <cylinderGeometry args={[0.08, 0.08, 1.2, 6]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
      <mesh position={[-2.2, 0.6, 5.5]}>
        <cylinderGeometry args={[0.08, 0.08, 1.2, 6]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>

      {/* Red Cross Insignia on Facade */}
      <group position={[0, 4.8, 3.55]}>
        <mesh>
          <boxGeometry args={[1.6, 0.5, 0.05]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <mesh>
          <boxGeometry args={[0.5, 1.6, 0.05]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </group>

      {/* Rooftop Helipad Deck */}
      <group position={[0, 6.35, 0]}>
        {/* Octagonal landing pad */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.8, 8]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Helipad 'H' Marking */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.4, 1.4]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Perimeter Safety Beacon Lights */}
        {[-2.4, 2.4].map((hX) =>
          [-2.4, 2.4].map((hZ) => (
            <mesh key={`${hX}-${hZ}`} position={[hX, 0.1, hZ]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
          ))
        )}
      </group>

      {/* Dedicated Standby Diesel Generator Compound */}
      <group position={[4.5, 0.1, -4.5]}>
        {/* Pad */}
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[3.2, 0.2, 2.5]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        {/* Weatherproof Generator Container */}
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[2.6, 1.2, 1.8]} />
          <meshStandardMaterial
            color={isIslandedBackup ? '#f59e0b' : '#334155'}
            metalness={0.6}
          />
        </mesh>
        {/* Exhaust Muffler */}
        <mesh position={[0.8, 1.6, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} />
        </mesh>
        {/* Fuel Day Tank */}
        <mesh position={[-1.0, 0.6, 1.1]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.3, 0.3, 0.9, 12]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
      </group>

      {/* Window Rows (Emissive illumination if energized) */}
      {[-2, 0, 2].map((xW) =>
        [2, 3.5].map((yW) => (
          <mesh key={`${xW}-${yW}`} position={[xW, yW, 3.52]}>
            <boxGeometry args={[1.2, 0.8, 0.05]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#0284c7"
              emissiveIntensity={isEnergized ? 1.0 : 0.05}
            />
          </mesh>
        ))
      )}

      {/* Top Status Beacon */}
      <mesh position={[0, 7.2, 0]}>
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={2.5} />
      </mesh>
      <pointLight position={[0, 7.8, 0]} color={statusColor} distance={12} intensity={1.8} />

      {isSelected && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[8.5, 9.2, 36]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

export const WaterTreatment3D: React.FC<FacilityProps> = ({ node, isSelected, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const isEnergized = node.isEnergized ?? true;
  const isIslandedBackup = node.status === 'islanded_backup';
  const isFaulted = node.status === 'faulted' || !isEnergized;
  const statusColor = isFaulted ? '#ef4444' : isIslandedBackup ? '#f59e0b' : '#06b6d4';

  return (
    <group
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
      {/* Foundation */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[14, 0.1, 12]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* 2x Circular Clarifier Settling Basins */}
      {[-3.5, 3.5].map((cX, idx) => (
        <group key={`clarifier-${idx}`} position={[cX, 0.6, -1]}>
          {/* Outer Basin Concrete Wall */}
          <mesh rotation={[0, 0, 0]}>
            <cylinderGeometry args={[2.8, 2.8, 1.0, 24]} />
            <meshStandardMaterial color="#475569" roughness={0.8} />
          </mesh>
          {/* Water Surface inside basin */}
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[2.6, 2.6, 0.2, 24]} />
            <meshStandardMaterial
              color="#0284c7"
              roughness={0.1}
              metalness={0.2}
              transparent
              opacity={0.85}
            />
          </mesh>
          {/* Rotating Clarifier Bridge */}
          <mesh position={[0, 0.7, 0]} rotation={[0, idx * 0.8, 0]}>
            <boxGeometry args={[5.2, 0.15, 0.3]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Filtration Pump House & Chemical Building */}
      <mesh position={[0, 1.8, 3.2]} castShadow>
        <boxGeometry args={[7, 3.2, 3.5]} />
        <meshStandardMaterial color="#64748b" roughness={0.6} />
      </mesh>

      {/* Elevated Pressurized Contact Water Tower */}
      <group position={[4.8, 0, 3.5]}>
        {/* Legs */}
        {[-0.6, 0.6].map((lX) =>
          [-0.6, 0.6].map((lZ) => (
            <mesh key={`${lX}-${lZ}`} position={[lX, 2.2, lZ]}>
              <cylinderGeometry args={[0.06, 0.06, 4.4, 6]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} />
            </mesh>
          ))
        )}
        {/* Spherical Tank */}
        <mesh position={[0, 4.8, 0]} castShadow>
          <sphereGeometry args={[1.4, 16, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* Top Status Beacon */}
      <mesh position={[0, 3.6, 3.2]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={2.5} />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[8.5, 9.2, 36]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

export const EmergencyEOC3D: React.FC<FacilityProps> = ({ node, isSelected, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const isEnergized = node.isEnergized ?? true;
  const isFaulted = node.status === 'faulted' || !isEnergized;
  const statusColor = isFaulted ? '#ef4444' : '#10b981';

  return (
    <group
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
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[10, 0.1, 10]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* Reinforced Bunker Command Building */}
      <mesh position={[-1, 1.4, 0]} castShadow>
        <boxGeometry args={[6, 2.6, 6]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>

      {/* High-Gain Communications Mast */}
      <group position={[3.2, 0, 2]}>
        <mesh position={[0, 4.5, 0]}>
          <cylinderGeometry args={[0.1, 0.25, 9, 8]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
        {/* Microwave Parabolic Dish */}
        <mesh position={[0, 7.5, 0.4]} rotation={[0.2, 0, 0]}>
          <sphereGeometry args={[0.6, 12, 12, 0, Math.PI]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.8} />
        </mesh>
        {/* Red Warning Beacon */}
        <mesh position={[0, 9.2, 0]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3} />
        </mesh>
      </group>

      {/* Satellite Dish Ground Terminal */}
      <group position={[-1, 2.9, 1.5]}>
        <mesh rotation={[0.4, 0.6, 0]}>
          <cylinderGeometry args={[0.7, 0.2, 0.2, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.7} />
        </mesh>
      </group>

      {isSelected && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[6.5, 7.2, 32]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

export const IndustrialFab3D: React.FC<FacilityProps> = ({ node, isSelected, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const isEnergized = node.isEnergized ?? true;
  const isFaulted = node.status === 'faulted' || !isEnergized;
  const statusColor = isFaulted ? '#ef4444' : '#38bdf8';

  return (
    <group
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
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[16, 0.1, 14]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Semiconductor Cleanroom Fab High-Bay */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[12, 4.8, 9]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Rooftop Industrial Air Handlers & Scrubbers */}
      {[-3, 0, 3].map((rX) => (
        <mesh key={rX} position={[rX, 5.3, 0]}>
          <boxGeometry args={[1.8, 0.8, 3.5]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
      ))}

      {/* Cryogenic Liquid Nitrogen/Argon Storage Tanks */}
      {[-4.5, -4.5].map((tX, idx) => (
        <mesh key={idx} position={[tX, 2.2, -4.8 + idx * 2.2]}>
          <cylinderGeometry args={[0.8, 0.8, 3.8, 16]} />
          <meshStandardMaterial color="#f1f5f9" metalness={0.7} />
        </mesh>
      ))}

      {isSelected && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[9.5, 10.2, 36]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

export const RiverPort3D: React.FC<FacilityProps> = ({ node, isSelected, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const isEnergized = node.isEnergized ?? true;
  const isFaulted = node.status === 'faulted' || !isEnergized;

  return (
    <group
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
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[16, 0.1, 12]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* Container Crane Gantry Frame */}
      <group position={[4, 0, 0]}>
        {/* Vertical A-frame legs */}
        <mesh position={[0, 3.5, -2]}>
          <boxGeometry args={[0.3, 7, 0.3]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
        <mesh position={[0, 3.5, 2]}>
          <boxGeometry args={[0.3, 7, 0.3]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
        {/* Horizontal Crane Boom */}
        <mesh position={[0, 7, 0]}>
          <boxGeometry args={[0.5, 0.5, 8]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
      </group>

      {/* Stacks of Multi-Colored Intermodal Shipping Containers */}
      {[
        { pos: [-4, 0.6, -2], color: '#dc2626' },
        { pos: [-4, 0.6, 0], color: '#2563eb' },
        { pos: [-4, 0.6, 2], color: '#16a34a' },
        { pos: [-4, 1.8, -1], color: '#eab308' },
        { pos: [-1, 0.6, -1], color: '#0284c7' },
        { pos: [-1, 0.6, 1.5], color: '#ea580c' },
      ].map((c, i) => (
        <mesh key={i} position={c.pos as [number, number, number]}>
          <boxGeometry args={[4, 1.1, 1.6]} />
          <meshStandardMaterial color={c.color} metalness={0.4} roughness={0.6} />
        </mesh>
      ))}

      {isSelected && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[9.5, 10.2, 36]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

export const ResidentialTownship3D: React.FC<FacilityProps> = ({ node, isSelected, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const isEnergized = node.isEnergized ?? true;
  const isFaulted = node.status === 'faulted' || !isEnergized;

  return (
    <group
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
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[14, 0.1, 14]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Cluster of 6 Suburban Residential Houses */}
      {[
        [-3.5, -3.5], [0, -3.5], [3.5, -3.5],
        [-3.5, 3.5], [0, 3.5], [3.5, 3.5],
      ].map(([hX, hZ], idx) => (
        <group key={idx} position={[hX, 0, hZ]}>
          {/* Main house box */}
          <mesh position={[0, 0.8, 0]} castShadow>
            <boxGeometry args={[2.2, 1.5, 2.2]} />
            <meshStandardMaterial color={idx % 2 === 0 ? '#cbd5e1' : '#f8fafc'} />
          </mesh>
          {/* Pitched Roof */}
          <mesh position={[0, 1.85, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[1.8, 0.9, 4]} />
            <meshStandardMaterial color="#7f1d1d" />
          </mesh>
          {/* Window light */}
          <mesh position={[0, 0.8, 1.12]}>
            <planeGeometry args={[0.6, 0.5]} />
            <meshBasicMaterial
              color={isEnergized ? '#fef08a' : '#334155'}
            />
          </mesh>
        </group>
      ))}

      {isSelected && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[8.5, 9.2, 36]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

export const DowntownDistrict3D: React.FC<FacilityProps> = ({ node, isSelected, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const isEnergized = node.isEnergized ?? true;
  const isFaulted = node.status === 'faulted' || !isEnergized;

  return (
    <group
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
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[16, 0.1, 16]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* Cluster of Commercial High-Rise Buildings */}
      {[
        { pos: [-3.5, 4.0, -3.5], size: [3.8, 7.8, 3.8] },
        { pos: [3.5, 5.0, -3.0], size: [4.2, 9.8, 4.2] },
        { pos: [-3.0, 3.2, 3.5], size: [4.0, 6.2, 4.0] },
        { pos: [3.5, 2.5, 3.5], size: [3.5, 4.8, 3.5] },
        { pos: [0, 6.5, 0], size: [4.5, 12.8, 4.5] }, // Central Metro Tower
      ].map((b, i) => (
        <group key={i} position={b.pos as [number, number, number]}>
          <mesh castShadow>
            <boxGeometry args={b.size as [number, number, number]} />
            <meshStandardMaterial
              color="#334155"
              metalness={0.7}
              roughness={0.2}
            />
          </mesh>
          {/* Lit window matrix bands */}
          {[-1.5, 0, 1.5].map((wY) => (
            <mesh key={wY} position={[0, wY, (b.size[2] / 2) + 0.02]}>
              <planeGeometry args={[b.size[0] * 0.8, 0.6]} />
              <meshBasicMaterial
                color={isEnergized ? '#38bdf8' : '#1e293b'}
                transparent
                opacity={isEnergized ? 0.8 : 0.2}
              />
            </mesh>
          ))}
        </group>
      ))}

      {isSelected && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[10.5, 11.2, 36]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};
