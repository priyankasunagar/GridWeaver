import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGridStore, gridStore } from '../../store/gridStore';
import { Terrain3D } from './Terrain3D';
import { LatticeTower3D } from './LatticeTower3D';
import { Substation3D } from './Substation3D';
import { HydroDam3D, PeakerPlant3D } from './HydroDam3D';
import {
  Hospital3D,
  WaterTreatment3D,
  EmergencyEOC3D,
  IndustrialFab3D,
  RiverPort3D,
  ResidentialTownship3D,
  DowntownDistrict3D,
} from './Facilities3D';
import { TransmissionLines3D } from './TransmissionLines3D';
import { StatusLabels3D } from './StatusLabels3D';

import { CameraControlsHUD, cameraActions } from './CameraControlsHUD';

// Camera position presets
const CAMERA_PRESETS = {
  overview: {
    position: new THREE.Vector3(0, 75, 95),
    target: new THREE.Vector3(0, 0, 5),
  },
  substation: {
    position: new THREE.Vector3(-16, 28, 20),
    target: new THREE.Vector3(-16, 4, -16),
  },
  hospital: {
    position: new THREE.Vector3(-34, 20, 68),
    target: new THREE.Vector3(-34, 2, 38),
  },
  hydro: {
    position: new THREE.Vector3(-52, 36, -5),
    target: new THREE.Vector3(-52, 9, -38),
  },
  topdown: {
    position: new THREE.Vector3(0, 140, 5),
    target: new THREE.Vector3(0, 0, 5),
  },
};

/**
 * Camera Controller supporting smooth lerping to presets AND genuine 3D manual navigation
 */
function CameraController() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const { viewSettings, selectedComponent, topology } = useGridStore();

  const desiredPos = useRef(CAMERA_PRESETS.overview.position.clone());
  const desiredTarget = useRef(CAMERA_PRESETS.overview.target.clone());
  const isTransitioning = useRef(false);

  const prevPresetRef = useRef(viewSettings.cameraPreset);
  const prevSelectedIdRef = useRef<string | null>(null);

  // Smooth preset/focus animation only when preset or selected ID actually changes
  useEffect(() => {
    const presetChanged = prevPresetRef.current !== viewSettings.cameraPreset;
    const selectedChanged = prevSelectedIdRef.current !== (selectedComponent ? selectedComponent.id : null);

    prevPresetRef.current = viewSettings.cameraPreset;
    prevSelectedIdRef.current = selectedComponent ? selectedComponent.id : null;

    if (selectedChanged && selectedComponent && selectedComponent.type === 'node') {
      const node = topology.nodes.find((n) => n.id === selectedComponent.id);
      if (node) {
        desiredTarget.current.set(node.position[0], node.position[1], node.position[2]);
        desiredPos.current.set(node.position[0], node.position[1] + 25, node.position[2] + 32);
        isTransitioning.current = true;
        return;
      }
    }

    if (selectedChanged && selectedComponent && selectedComponent.type === 'tower') {
      const tower = topology.towers.find((t) => t.id === selectedComponent.id);
      if (tower) {
        desiredTarget.current.set(tower.position[0], tower.position[1] + 6, tower.position[2]);
        desiredPos.current.set(tower.position[0] + 18, tower.position[1] + 20, tower.position[2] + 25);
        isTransitioning.current = true;
        return;
      }
    }

    if (presetChanged) {
      const preset = CAMERA_PRESETS[viewSettings.cameraPreset] || CAMERA_PRESETS.overview;
      desiredPos.current.copy(preset.position);
      desiredTarget.current.copy(preset.target);
      isTransitioning.current = true;
    }
  }, [viewSettings.cameraPreset, selectedComponent, topology]);

  // Hook programmatic HUD buttons (pan left/right, rotate, zoom, reset)
  useEffect(() => {
    const unsubscribe = cameraActions.subscribe((action) => {
      if (!controlsRef.current) return;
      isTransitioning.current = false; // User button overrides lerp

      const ctrl = controlsRef.current;
      const cam = camera;
      const target = ctrl.target as THREE.Vector3;

      // Compute camera local orthogonal axes
      const forward = new THREE.Vector3().subVectors(target, cam.position).normalize();
      const right = new THREE.Vector3().crossVectors(forward, cam.up).normalize();
      const up = new THREE.Vector3().crossVectors(right, forward).normalize();

      switch (action) {
        case 'pan_left': {
          const shift = right.clone().multiplyScalar(-10);
          cam.position.add(shift);
          target.add(shift);
          ctrl.update();
          break;
        }
        case 'pan_right': {
          const shift = right.clone().multiplyScalar(10);
          cam.position.add(shift);
          target.add(shift);
          ctrl.update();
          break;
        }
        case 'pan_up': {
          const shift = up.clone().multiplyScalar(8);
          cam.position.add(shift);
          target.add(shift);
          ctrl.update();
          break;
        }
        case 'pan_down': {
          const shift = up.clone().multiplyScalar(-8);
          cam.position.add(shift);
          target.add(shift);
          ctrl.update();
          break;
        }
        case 'rotate_left': {
          // Rotate camera around target on Y axis
          const offset = new THREE.Vector3().subVectors(cam.position, target);
          offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.25);
          cam.position.copy(target).add(offset);
          cam.lookAt(target);
          ctrl.update();
          break;
        }
        case 'rotate_right': {
          const offset = new THREE.Vector3().subVectors(cam.position, target);
          offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.25);
          cam.position.copy(target).add(offset);
          cam.lookAt(target);
          ctrl.update();
          break;
        }
        case 'zoom_in': {
          const dist = cam.position.distanceTo(target);
          if (dist > 16) {
            cam.position.addScaledVector(forward, dist * 0.22);
            ctrl.update();
          }
          break;
        }
        case 'zoom_out': {
          const dist = cam.position.distanceTo(target);
          if (dist < 200) {
            cam.position.addScaledVector(forward, -dist * 0.25);
            ctrl.update();
          }
          break;
        }
        case 'reset': {
          desiredPos.current.copy(CAMERA_PRESETS.overview.position);
          desiredTarget.current.copy(CAMERA_PRESETS.overview.target);
          isTransitioning.current = true;
          break;
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [camera]);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    if (isTransitioning.current) {
      const t = Math.min(1, delta * 4.0);
      camera.position.lerp(desiredPos.current, t);
      controlsRef.current.target.lerp(desiredTarget.current, t);
      controlsRef.current.update();

      if (
        camera.position.distanceTo(desiredPos.current) < 0.15 &&
        controlsRef.current.target.distanceTo(desiredTarget.current) < 0.15
      ) {
        isTransitioning.current = false;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      screenSpacePanning={true} // Genuine screen-space left/right/up/down panning
      enablePan={true}
      panSpeed={1.2}
      enableRotate={true}
      rotateSpeed={0.8}
      enableZoom={true}
      zoomSpeed={1.0}
      maxPolarAngle={Math.PI / 2 - 0.05} // Prevent camera clipping underground
      minDistance={14}
      maxDistance={220}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
      onStart={() => {
        isTransitioning.current = false;
      }}
    />
  );
}

export const PowerGridScene: React.FC = () => {
  const state = useGridStore();
  const { topology, selectedComponent, viewSettings } = state;

  return (
    <div 
      className="relative w-full h-full bg-[#090d16] select-none touch-none overflow-hidden"
      onContextMenu={(e) => e.preventDefault()} // Allow right-click dragging without browser context menu
    >
      {/* On-Screen Camera Navigation Controls HUD */}
      <CameraControlsHUD />

      <Canvas
        shadows={!viewSettings.performanceMode}
        camera={{ position: [0, 75, 95], fov: 45, near: 1, far: 500 }}
        gl={{
          antialias: !viewSettings.performanceMode,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        onPointerMissed={() => {
          gridStore.selectComponent(null);
        }}
      >
        {/* Atmospheric Sky Fog */}
        <fog attach="fog" args={['#090d16', 80, 240]} />

        {/* Ambient & Studio Directional Key/Fill Lighting Rig */}
        <ambientLight intensity={0.55} color="#cbd5e1" />
        <hemisphereLight
          args={['#38bdf8', '#0f172a', 0.65]}
          position={[0, 60, 0]}
        />
        <directionalLight
          position={[-60, 90, -40]}
          intensity={1.8}
          color="#fffbeb"
          castShadow={!viewSettings.performanceMode}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={10}
          shadow-camera-far={260}
          shadow-camera-left={-90}
          shadow-camera-right={90}
          shadow-camera-top={90}
          shadow-camera-bottom={-90}
          shadow-bias={-0.0004}
        />
        {/* Cool Rim/Backlight */}
        <directionalLight
          position={[50, 40, 80]}
          intensity={0.4}
          color="#0ea5e9"
        />

        {/* Camera with smooth lerping OrbitControls */}
        <CameraController />

        {/* 3D Engineered Landscape Terrain & River */}
        <Terrain3D showTerrain={viewSettings.showTerrain} />

        {/* Transmission Towers */}
        {viewSettings.showTowers &&
          topology.towers.map((tower) => (
            <LatticeTower3D
              key={tower.id}
              tower={tower}
              isSelected={selectedComponent?.type === 'tower' && selectedComponent.id === tower.id}
              onSelect={() => gridStore.selectComponent('tower', tower.id)}
            />
          ))}

        {/* Overhead Conductor Cables & Flow Particles */}
        {viewSettings.showConductors && (
          <TransmissionLines3D
            edges={topology.edges}
            nodes={topology.nodes}
            towers={topology.towers}
            selectedEdgeId={selectedComponent?.type === 'edge' ? selectedComponent.id : null}
            onSelectEdge={(edgeId) => gridStore.selectComponent('edge', edgeId)}
            showParticles={viewSettings.showParticles}
          />
        )}

        {/* Generation & Substation Facilities */}
        {topology.nodes.map((node) => {
          const isSelected = selectedComponent?.type === 'node' && selectedComponent.id === node.id;
          const onSelect = () => gridStore.selectComponent('node', node.id);

          switch (node.type) {
            case 'generation':
              if (node.id === 'gen-hydro') {
                return (
                  <HydroDam3D
                    key={node.id}
                    node={node}
                    isSelected={isSelected}
                    onSelect={onSelect}
                  />
                );
              }
              return (
                <PeakerPlant3D
                  key={node.id}
                  node={node}
                  isSelected={isSelected}
                  onSelect={onSelect}
                />
              );

            case 'substation_main':
              return (
                <Substation3D
                  key={node.id}
                  node={node}
                  isSelected={isSelected}
                  onSelect={onSelect}
                  isMainSubstation={true}
                />
              );

            case 'substation_distribution':
              return (
                <Substation3D
                  key={node.id}
                  node={node}
                  isSelected={isSelected}
                  onSelect={onSelect}
                  isMainSubstation={false}
                />
              );

            case 'hospital':
              return (
                <Hospital3D
                  key={node.id}
                  node={node}
                  isSelected={isSelected}
                  onSelect={onSelect}
                />
              );

            case 'water_treatment':
              return (
                <WaterTreatment3D
                  key={node.id}
                  node={node}
                  isSelected={isSelected}
                  onSelect={onSelect}
                />
              );

            case 'emergency_eoc':
              return (
                <EmergencyEOC3D
                  key={node.id}
                  node={node}
                  isSelected={isSelected}
                  onSelect={onSelect}
                />
              );

            case 'industrial':
              if (node.id === 'fac-port') {
                return (
                  <RiverPort3D
                    key={node.id}
                    node={node}
                    isSelected={isSelected}
                    onSelect={onSelect}
                  />
                );
              }
              return (
                <IndustrialFab3D
                  key={node.id}
                  node={node}
                  isSelected={isSelected}
                  onSelect={onSelect}
                />
              );

            case 'residential_north':
              return (
                <ResidentialTownship3D
                  key={node.id}
                  node={node}
                  isSelected={isSelected}
                  onSelect={onSelect}
                />
              );

            case 'commercial_downtown':
              return (
                <DowntownDistrict3D
                  key={node.id}
                  node={node}
                  isSelected={isSelected}
                  onSelect={onSelect}
                />
              );

            default:
              return null;
          }
        })}

        {/* 3D Facility & Status HTML Billboards */}
        <StatusLabels3D
          nodes={topology.nodes}
          towers={topology.towers}
          selectedComponentId={selectedComponent?.id || null}
          onSelectNode={(id) => gridStore.selectComponent('node', id)}
          onSelectTower={(id) => gridStore.selectComponent('tower', id)}
          showLabels={viewSettings.showLabels}
        />
      </Canvas>
    </div>
  );
};
