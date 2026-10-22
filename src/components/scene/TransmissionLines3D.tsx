import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GridEdge, GridNode, TransmissionTower } from '../../models/grid';

interface TransmissionLines3DProps {
  edges: GridEdge[];
  nodes: GridNode[];
  towers: TransmissionTower[];
  selectedEdgeId: string | null;
  onSelectEdge: (edgeId: string) => void;
  showParticles?: boolean;
}

/**
 * Generates a smooth natural catenary sagging curve between two 3D points.
 * Simulates gravitational weight of aluminum-conductor steel-reinforced (ACSR) cables.
 */
function createCatenaryCurve(
  start: THREE.Vector3,
  end: THREE.Vector3,
  sagAmount: number = 1.6,
  segments: number = 24
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const dist = start.distanceTo(end);
  const actualSag = Math.min(sagAmount * (dist / 20), 4.5);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Linear interpolation
    const x = THREE.MathUtils.lerp(start.x, end.x, t);
    const z = THREE.MathUtils.lerp(start.z, end.z, t);
    const baseY = THREE.MathUtils.lerp(start.y, end.y, t);

    // Parabolic catenary sag: max dip at t=0.5
    const sagDip = 4 * actualSag * t * (1 - t);
    const y = baseY - sagDip;

    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

export const TransmissionLines3D: React.FC<TransmissionLines3DProps> = ({
  edges,
  nodes,
  towers,
  selectedEdgeId,
  onSelectEdge,
  showParticles = true,
}) => {
  const nodesMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const towersMap = useMemo(() => new Map(towers.map((t) => [t.id, t])), [towers]);

  // Compute 3D multi-span conductor paths for each edge
  const edgeLineData = useMemo(() => {
    return edges.map((edge) => {
      const srcNode = nodesMap.get(edge.sourceNodeId);
      const tgtNode = nodesMap.get(edge.targetNodeId);

      if (!srcNode || !tgtNode) return null;

      // Build sequence of waypoints: source node -> intermediate towers -> target node
      const waypoints: THREE.Vector3[] = [];

      // Source connection point (elevation adjusted for gantry/bushings)
      waypoints.push(
        new THREE.Vector3(
          srcNode.position[0],
          srcNode.position[1] + (srcNode.type.includes('substation') ? 5.5 : srcNode.type === 'generation' ? 6.5 : 3.0),
          srcNode.position[2]
        )
      );

      // Intermediate towers supporting this span
      edge.towerIds.forEach((tId) => {
        const tw = towersMap.get(tId);
        if (tw) {
          waypoints.push(
            new THREE.Vector3(
              tw.position[0],
              tw.position[1] + tw.height * 0.7, // Crossarm height
              tw.position[2]
            )
          );
        }
      });

      // Target connection point
      waypoints.push(
        new THREE.Vector3(
          tgtNode.position[0],
          tgtNode.position[1] + (tgtNode.type.includes('substation') ? 5.5 : tgtNode.type === 'generation' ? 6.5 : 3.0),
          tgtNode.position[2]
        )
      );

      // Generate catenary sagging spans between consecutive waypoints
      // Create 3-phase bundled conductors (offset slightly along perpendicular)
      const spans: Array<{
        curvePoints: THREE.Vector3[];
        leftPoints: THREE.Vector3[];
        rightPoints: THREE.Vector3[];
      }> = [];

      for (let i = 0; i < waypoints.length - 1; i++) {
        const pA = waypoints[i];
        const pB = waypoints[i + 1];
        const centerPoints = createCatenaryCurve(pA, pB, edge.voltageKv >= 230 ? 2.2 : 1.2);

        // Vector perpendicular in XZ plane for 3-phase spacing
        const dir = new THREE.Vector3().subVectors(pB, pA).normalize();
        const normal = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
        const phaseSpacing = edge.voltageKv >= 230 ? 0.7 : 0.4;

        const leftPoints = centerPoints.map((p) =>
          p.clone().addScaledVector(normal, phaseSpacing)
        );
        const rightPoints = centerPoints.map((p) =>
          p.clone().addScaledVector(normal, -phaseSpacing)
        );

        spans.push({ curvePoints: centerPoints, leftPoints, rightPoints });
      }

      return {
        edge,
        spans,
      };
    }).filter(Boolean);
  }, [edges, nodesMap, towersMap]);

  // Animated energy flow particle system
  const particlesRef = useRef<THREE.InstancedMesh>(null);
  const particleCount = 180;

  // Flatten sample points along all active lines
  const activeFlowCurves = useMemo(() => {
    const curves: THREE.CatmullRomCurve3[] = [];
    edgeLineData.forEach((item) => {
      if (item && (item.edge.status === 'operational' || item.edge.status === 'restored') && item.edge.currentFlowMw > 0) {
        item.spans.forEach((span) => {
          if (span.curvePoints.length >= 2) {
            curves.push(new THREE.CatmullRomCurve3(span.curvePoints));
          }
        });
      }
    });
    return curves;
  }, [edgeLineData]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!particlesRef.current || activeFlowCurves.length === 0 || !showParticles) return;

    const t = clock.getElapsedTime();
    const instCount = Math.min(particleCount, activeFlowCurves.length * 8);

    for (let i = 0; i < particleCount; i++) {
      if (i < instCount) {
        const curveIdx = i % activeFlowCurves.length;
        const curve = activeFlowCurves[curveIdx];
        // Speed proportional to flow
        const progress = ((t * 0.35 + i / instCount) % 1.0);
        const pt = curve.getPointAt(progress);

        dummy.position.copy(pt);
        dummy.scale.setScalar(0.22);
        dummy.updateMatrix();
        particlesRef.current.setMatrixAt(i, dummy.matrix);
      } else {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        particlesRef.current.setMatrixAt(i, dummy.matrix);
      }
    }
    particlesRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* Conductor Cable Spans */}
      {edgeLineData.map((item) => {
        if (!item) return null;
        const { edge, spans } = item;
        const isSelected = selectedEdgeId === edge.id;
        const isFaulted = edge.status === 'faulted';
        const isRestored = edge.status === 'restored';
        const isOperational = edge.status === 'operational';
        const isEnergized = (isOperational || isRestored) && edge.currentFlowMw > 0;

        // Visual cable colors
        let conductorColor = '#475569'; // default dark aluminum steel
        if (isFaulted) conductorColor = '#ef4444';
        else if (isSelected) conductorColor = '#38bdf8';
        else if (isRestored) conductorColor = '#10b981';
        else if (isEnergized) conductorColor = '#38bdf8';

        return (
          <group
            key={edge.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectEdge(edge.id);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'auto';
            }}
          >
            {spans.map((span, sIdx) => {
              const geomCenter = new THREE.BufferGeometry().setFromPoints(span.curvePoints);
              const geomLeft = new THREE.BufferGeometry().setFromPoints(span.leftPoints);
              const geomRight = new THREE.BufferGeometry().setFromPoints(span.rightPoints);

              return (
                <group key={`span-${sIdx}`}>
                  {/* Phase B (Center) */}
                  <lineSegments geometry={geomCenter}>
                    <lineBasicMaterial
                      color={conductorColor}
                      linewidth={isSelected ? 3 : 2}
                      transparent
                      opacity={isEnergized ? 1.0 : 0.6}
                    />
                  </lineSegments>

                  {/* Phase A (Left) */}
                  <lineSegments geometry={geomLeft}>
                    <lineBasicMaterial
                      color={conductorColor}
                      linewidth={1}
                      transparent
                      opacity={isEnergized ? 0.9 : 0.45}
                    />
                  </lineSegments>

                  {/* Phase C (Right) */}
                  <lineSegments geometry={geomRight}>
                    <lineBasicMaterial
                      color={conductorColor}
                      linewidth={1}
                      transparent
                      opacity={isEnergized ? 0.9 : 0.45}
                    />
                  </lineSegments>

                  {/* Fault Flare Marker */}
                  {isFaulted && sIdx === 0 && (
                    <mesh position={span.curvePoints[Math.floor(span.curvePoints.length / 2)]}>
                      <sphereGeometry args={[0.6, 12, 12]} />
                      <meshBasicMaterial color="#ef4444" wireframe />
                    </mesh>
                  )}
                </group>
              );
            })}
          </group>
        );
      })}

      {/* Moving Energy Flow Particles */}
      {showParticles && activeFlowCurves.length > 0 && (
        <instancedMesh
          ref={particlesRef}
          args={[undefined, undefined, particleCount]}
          frustumCulled={false}
        >
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshBasicMaterial color="#7dd3fc" />
        </instancedMesh>
      )}
    </group>
  );
};
