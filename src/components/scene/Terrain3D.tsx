import React, { useMemo } from 'react';
import * as THREE from 'three';

interface Terrain3DProps {
  showTerrain?: boolean;
}

/**
 * Procedural Terrain Height function
 * Mountains/Ridge on West (x < -30)
 * River canyon and water basin running from North-West to South-East
 * Gentle rolling industrial and urban plain on East (x > 10)
 */
export function getTerrainElevation(x: number, z: number): number {
  // Mountain Ridge on the West
  let elev = 0;
  if (x < -20) {
    const ridgeFactor = Math.min(1, (-x - 20) / 40);
    elev += 14 * Math.pow(ridgeFactor, 1.4);
    // Subtle mountain bumps
    elev += Math.sin(x * 0.15) * Math.cos(z * 0.15) * 2.2;
  }

  // River gorge cutting through center
  // River follows curve: x ~ 10 + Math.sin(z * 0.05) * 8
  const riverCenter = 10 + Math.sin(z * 0.04) * 8;
  const distToRiver = Math.abs(x - riverCenter);

  if (distToRiver < 12 && z > -30) {
    const riverT = distToRiver / 12;
    // Carve river channel down to water level
    elev = Math.min(elev, (riverT * riverT) * 1.5 - 0.5);
  }

  // Reservoir basin behind dam (x < -35 && z < -25)
  if (x < -35 && z < -25) {
    elev = Math.max(elev, 8.5); // Elevated plateau for reservoir
  }

  // Rolling terrain variations
  elev += Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.6;

  return Math.max(-0.6, elev);
}

export const Terrain3D: React.FC<Terrain3DProps> = ({ showTerrain = true }) => {
  // Create sculpted terrain geometry
  const terrainGeometry = useMemo(() => {
    const width = 160;
    const height = 140;
    const segmentsX = 80;
    const segmentsZ = 70;

    const geom = new THREE.PlaneGeometry(width, height, segmentsX, segmentsZ);
    geom.rotateX(-Math.PI / 2);

    const posAttr = geom.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);

    // Color gradient based on elevation and terrain features
    const cRock = new THREE.Color('#334155'); // Rocky slate
    const cGrass = new THREE.Color('#1e293b'); // Dark forest soil / grass
    const cValley = new THREE.Color('#0f172a'); // Riverbed gravel
    const cHigh = new THREE.Color('#475569'); // High elevation granite

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const y = getTerrainElevation(x, z);
      posAttr.setY(i, y);

      // Vertex color computation
      const col = new THREE.Color();
      if (y > 7) {
        col.lerpColors(cRock, cHigh, (y - 7) / 7);
      } else if (y > 1.2) {
        col.lerpColors(cGrass, cRock, (y - 1.2) / 6);
      } else {
        col.lerpColors(cValley, cGrass, Math.max(0, y + 0.6) / 1.8);
      }

      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();
    return geom;
  }, []);

  // Water Reservoir and River Surface
  const riverGeometry = useMemo(() => {
    // Water plane at Y = 0.2
    const geom = new THREE.PlaneGeometry(160, 140);
    geom.rotateX(-Math.PI / 2);
    return geom;
  }, []);

  // Road network connecting substations and facilities
  const roads = useMemo(() => {
    // Road paths connecting key hubs
    const paths = [
      // Hydro to Main Substation
      [[-48, 8.8, -34], [-30, 4.8, -25], [-16, 3.4, -16]],
      // Main Substation to South Substation
      [[-16, 3.4, -16], [-17, 2.0, 5], [-18, 1.2, 26]],
      // South Substation to Hospital
      [[-18, 1.2, 26], [-26, 1.2, 32], [-34, 1.2, 38]],
      // South Substation to Water Treatment
      [[-18, 1.2, 26], [-6, 1.2, 25], [6, 1.2, 24]],
      // Main Substation to Downtown
      [[-16, 3.4, -16], [-10, 2.0, 0], [-6, 1.2, 10]],
      // Bridge over river to North Hills Substation
      [[-16, 3.4, -16], [5, 2.0, -14], [24, 2.0, -12]],
      // North Hills to Semiconductor Fab
      [[24, 2.0, -12], [32, 1.8, 0], [42, 1.5, 12]],
      // North Hills to Peaker Plant
      [[24, 2.0, -12], [36, 2.2, -28], [48, 2.5, -42]],
    ];

    return paths.map((pts) => {
      const vPts = pts.map((p) => new THREE.Vector3(p[0], p[1] + 0.08, p[2]));
      const curve = new THREE.CatmullRomCurve3(vPts);
      return new THREE.TubeGeometry(curve, 32, 0.7, 6, false);
    });
  }, []);

  // Clusters of pine and spruce trees
  const treeTransforms = useMemo(() => {
    const matrices: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();

    // Scatter trees along mountain ridge and green slopes
    const seeds = [
      [-45, -15], [-40, -10], [-35, -5], [-42, 5], [-38, 15],
      [-50, -20], [-46, -28], [-30, 10], [-25, 18], [-28, 30],
      [15, -35], [20, -25], [30, -32], [40, -10], [35, 5],
      [-2, 35], [2, 38], [12, 32], [28, 25], [35, 38],
    ];

    seeds.forEach(([sX, sZ]) => {
      // 3 trees per cluster
      for (let k = 0; k < 3; k++) {
        const x = sX + (Math.sin(k * 2.3) * 3);
        const z = sZ + (Math.cos(k * 3.1) * 3);
        const y = getTerrainElevation(x, z);
        if (y > 0.4) {
          dummy.position.set(x, y, z);
          dummy.scale.setScalar(0.7 + Math.random() * 0.5);
          dummy.rotation.y = Math.random() * Math.PI * 2;
          dummy.updateMatrix();
          matrices.push(dummy.matrix.clone());
        }
      }
    });

    return matrices;
  }, []);

  const treesMeshRef = useMemo(() => {
    // Tree geometry: trunk cylinder + 2 conical foliage tiers
    const foliage = new THREE.ConeGeometry(1.2, 3.2, 6);
    foliage.translate(0, 2.2, 0);
    return foliage;
  }, []);

  const treesInstancedRef = React.useRef<THREE.InstancedMesh>(null);

  React.useLayoutEffect(() => {
    if (treesInstancedRef.current && treeTransforms.length > 0) {
      treeTransforms.forEach((mat, i) => {
        treesInstancedRef.current!.setMatrixAt(i, mat);
      });
      treesInstancedRef.current.instanceMatrix.needsUpdate = true;
      treesInstancedRef.current.computeBoundingSphere();
    }
  }, [treeTransforms]);

  if (!showTerrain) return null;

  return (
    <group>
      {/* Textured Sculpted Terrain Mesh */}
      <mesh geometry={terrainGeometry} receiveShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.9}
          metalness={0.05}
          flatShading
        />
      </mesh>

      {/* Water Surface: Hydro Reservoir and River */}
      <mesh geometry={riverGeometry} position={[0, 0.1, 0]}>
        <meshStandardMaterial
          color="#0369a1"
          roughness={0.08}
          metalness={0.65}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* Road Network */}
      {roads.map((rGeom, idx) => (
        <mesh key={`road-${idx}`} geometry={rGeom}>
          <meshStandardMaterial color="#1e293b" roughness={0.9} />
        </mesh>
      ))}

      {/* Instanced Low-Poly Coniferous Trees */}
      {treeTransforms.length > 0 && (
        <instancedMesh
          ref={treesInstancedRef}
          args={[treesMeshRef, undefined, treeTransforms.length]}
          frustumCulled={false}
          castShadow
        >
          <meshStandardMaterial color="#064e3b" roughness={0.9} />
        </instancedMesh>
      )}

      {/* Subtle Coordinate Grid Guide on Base Perimeter */}
      <gridHelper args={[160, 32, '#1e293b', '#0f172a']} position={[0, -0.65, 0]} />
    </group>
  );
};
