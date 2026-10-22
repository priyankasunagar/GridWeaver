import { GridTopology, RestorationPlan, RestorationAction } from '../models/grid';
import { evaluateGridState } from './connectivity';

/**
 * Generate a rule-based restoration plan (Frontend Heuristic Demo).
 * Note: Clearly identified as a frontend demonstration heuristic.
 * The production QUBO formulation and Qiskit QAOA solver will be
 * connected via the Python FastAPI backend in the next phase.
 */
export function generateRestorationPlan(
  currentTopology: GridTopology,
  backupCapacityMw: number = 25,
  criticalityWeight: number = 0.8
): RestorationPlan {
  const t0 = performance.now();
  const baseEval = evaluateGridState(currentTopology, backupCapacityMw);
  const actions: RestorationAction[] = [];

  // Deep clone topology to simulate hypothetical post-restoration state
  const testNodes = currentTopology.nodes.map((n) => ({ ...n }));
  const testEdges = currentTopology.edges.map((e) => ({ ...e }));
  const testTowers = currentTopology.towers.map((t) => ({ ...t }));

  let stepCounter = 1;

  // 1. Identify faulted transmission lines that need isolation to avoid bus faults
  const faultedEdges = testEdges.filter((e) => e.status === 'faulted');
  faultedEdges.forEach((edge) => {
    actions.push({
      id: `act-${stepCounter}`,
      step: stepCounter++,
      type: 'isolate_line',
      targetId: edge.id,
      targetName: edge.name,
      description: `Trip circuit breakers and open disconnect switches at terminal substations to isolate faulted ${edge.name}.`,
      estimatedTimeMin: 4,
      mwRestored: 0,
      criticalMwRestored: 0,
      status: 'pending',
    });
    // Mark isolated in test topology
    edge.status = 'isolated';
  });

  // 2. Check if the emergency cross-tie line (line-692: North Substation to South Substation) is open and can be closed
  const tieLine = testEdges.find((e) => e.id === 'line-692');
  const southSub = testNodes.find((n) => n.id === 'sub-dist-south');
  const northSub = testNodes.find((n) => n.id === 'sub-dist-north');

  if (tieLine && tieLine.status === 'isolated') {
    // If south substation is unenergized but north is energized (or can be fed from Peaker/Hydro)
    const isNorthEnergized = baseEval.reachabilityMap['sub-dist-north'];
    const isSouthDeenergized = !baseEval.reachabilityMap['sub-dist-south'];

    if (isNorthEnergized && isSouthDeenergized) {
      actions.push({
        id: `act-${stepCounter}`,
        step: stepCounter++,
        type: 'switch_tie',
        targetId: tieLine.id,
        targetName: tieLine.name,
        description: `Synchronize and close inter-substation Tie-Line TL-692 (69 kV) to re-route bulk power from North Hills to South Metro Substation.`,
        estimatedTimeMin: 8,
        mwRestored: 30, // Hospital + Water + EOC
        criticalMwRestored: 30,
        status: 'pending',
      });
      tieLine.status = 'restored';
    }
  }

  // 3. Check microgrid emergency tie (feed-tie-hosp) if Hospital remains disconnected
  const hospNode = testNodes.find((n) => n.id === 'fac-hospital');
  const microTie = testEdges.find((e) => e.id === 'feed-tie-hosp');
  if (microTie && microTie.status === 'isolated' && hospNode && !baseEval.reachabilityMap['fac-hospital']) {
    actions.push({
      id: `act-${stepCounter}`,
      step: stepCounter++,
      type: 'switch_tie',
      targetId: microTie.id,
      targetName: microTie.name,
      description: `Close transfer switch TS-101 on Microgrid Emergency Tie (feed-tie-hosp) to bridge critical feeder loop.`,
      estimatedTimeMin: 5,
      mwRestored: hospNode.demandMw,
      criticalMwRestored: hospNode.demandMw,
      status: 'pending',
    });
    microTie.status = 'restored';
  }

  // 4. Dispatch on-site backup generators for any isolated facilities
  const isolatedNodes = testNodes.filter(
    (n) => n.demandMw > 0 && (!baseEval.reachabilityMap[n.id] || n.status === 'isolated')
  );

  // Sort by priority (criticality tier 1 first, then priority score)
  isolatedNodes.sort((a, b) => {
    if (a.criticality !== b.criticality) return a.criticality - b.criticality;
    return b.priorityScore - a.priorityScore;
  });

  isolatedNodes.forEach((node) => {
    if (node.backupGenCapacityMw > 0) {
      const restoreMw = Math.min(node.demandMw, node.backupGenCapacityMw);
      actions.push({
        id: `act-${stepCounter}`,
        step: stepCounter++,
        type: 'start_backup',
        targetId: node.id,
        targetName: node.name,
        description: `Black-start on-site emergency generator (${node.backupGenCapacityMw} MW capacity) for ${node.name} and engage automatic transfer switch.`,
        estimatedTimeMin: 3,
        mwRestored: restoreMw,
        criticalMwRestored: node.criticality === 1 ? restoreMw : 0,
        status: 'pending',
      });
    }
  });

  // 5. If transmission line T-04 or T-06 was faulted, dispatch emergency line maintenance crew
  const faultedTowers = testTowers.filter((t) => t.status === 'faulted' || t.status === 'damaged');
  faultedTowers.forEach((tower) => {
    actions.push({
      id: `act-${stepCounter}`,
      step: stepCounter++,
      type: 'clear_fault',
      targetId: tower.id,
      targetName: tower.name,
      description: `Dispatch regional emergency line restoration team to inspect and repair ${tower.name} insulator strings.`,
      estimatedTimeMin: 45,
      mwRestored: 45,
      criticalMwRestored: 0,
      status: 'pending',
    });
  });

  // Calculate projected outcome if actions are executed
  const projectedEval = evaluateGridState({
    nodes: testNodes,
    edges: testEdges,
    towers: testTowers,
  }, backupCapacityMw);

  const t1 = performance.now();

  return {
    id: `plan-${Date.now()}`,
    title: `Restoration Sequence Plan #${Math.floor(Math.random() * 900 + 100)}`,
    method: 'frontend_heuristic',
    generatedAt: new Date().toLocaleTimeString(),
    actions,
    projectedMetrics: projectedEval.metrics,
    computationTimeMs: Math.round(t1 - t0),
    notes: 'Rule-based heuristic demonstration. Reconfigures open tie-lines (TL-692), activates standby generators, and isolates faulted line segments. Quantum QAOA formulation ready for backend execution.',
  };
}
