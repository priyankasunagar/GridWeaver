import { GridTopology, SimulationMetrics, GridNode, GridEdge } from '../models/grid';

export interface EvaluatedGridState {
  topology: GridTopology;
  metrics: SimulationMetrics;
  reachabilityMap: Record<string, boolean>; // nodeId -> isConnectedToGen
  powerFlowMap: Record<string, number>; // edgeId -> flowMw
}

/**
 * Transparent Graph Reachability and Power Flow Evaluation
 * Uses Breadth-First Search (BFS) from active generation sources
 * along operational transmission edges and distribution feeders.
 */
export function evaluateGridState(
  baseTopology: GridTopology,
  backupFuelAllowanceMw: number = 25
): EvaluatedGridState {
  const nodesMap = new Map<string, GridNode>();
  baseTopology.nodes.forEach((n) => nodesMap.set(n.id, { ...n }));

  const edgesMap = new Map<string, GridEdge>();
  baseTopology.edges.forEach((e) => edgesMap.set(e.id, { ...e }));

  // Identify active generation nodes
  const activeGenNodes = Array.from(nodesMap.values()).filter(
    (n) => n.type === 'generation' && n.status === 'operational'
  );

  // Build adjacency list for operational edges
  // Directed / Bidirectional for power transmission
  const adj = new Map<string, Array<{ edgeId: string; neighborId: string; capacityMw: number }>>();
  nodesMap.forEach((_, id) => adj.set(id, []));

  baseTopology.edges.forEach((edge) => {
    if (edge.status === 'operational' || edge.status === 'restored') {
      const srcList = adj.get(edge.sourceNodeId);
      if (srcList) {
        srcList.push({ edgeId: edge.id, neighborId: edge.targetNodeId, capacityMw: edge.capacityMw });
      }
      // Power lines are physically bidirectional in power flow networks
      const tgtList = adj.get(edge.targetNodeId);
      if (tgtList) {
        tgtList.push({ edgeId: edge.id, neighborId: edge.sourceNodeId, capacityMw: edge.capacityMw });
      }
    }
  });

  // BFS Reachability from all active generation sources
  const reachableFromGen = new Set<string>();
  const visitedEdges = new Set<string>();
  const queue: string[] = [];

  activeGenNodes.forEach((gen) => {
    reachableFromGen.add(gen.id);
    queue.push(gen.id);
  });

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const neighbors = adj.get(currentId) || [];

    for (const { edgeId, neighborId } of neighbors) {
      visitedEdges.add(edgeId);
      if (!reachableFromGen.has(neighborId)) {
        // Node must not be faulted
        const neighborNode = nodesMap.get(neighborId);
        if (neighborNode && neighborNode.status !== 'faulted') {
          reachableFromGen.add(neighborId);
          queue.push(neighborId);
        }
      }
    }
  }

  // Calculate flow and served power for each node
  let totalDemandMw = 0;
  let demandServedMw = 0;
  let criticalDemandTotalMw = 0;
  let criticalDemandServedMw = 0;
  let unservedFacilitiesCount = 0;
  let totalFacilitiesCount = 0;
  let backupPowerInUseMw = 0;
  let availableBackupRemaining = backupFuelAllowanceMw;
  const constraintViolations: string[] = [];

  const reachabilityMap: Record<string, boolean> = {};
  const powerFlowMap: Record<string, number> = {};

  nodesMap.forEach((node) => {
    reachabilityMap[node.id] = reachableFromGen.has(node.id);

    if (node.demandMw > 0) {
      totalDemandMw += node.demandMw;
      totalFacilitiesCount++;

      const isCritical = node.criticality === 1;
      if (isCritical) {
        criticalDemandTotalMw += node.demandMw;
      }

      if (reachableFromGen.has(node.id) && node.status !== 'faulted') {
        // Energized via primary transmission grid
        node.isEnergized = true;
        node.powerServedMw = node.demandMw;
        node.backupGenActive = false;
        demandServedMw += node.demandMw;
        if (isCritical) {
          criticalDemandServedMw += node.demandMw;
        }
        if (node.status !== 'restored') {
          node.status = 'operational';
        }
      } else {
        // Grid disconnected: evaluate on-site backup generator
        const potentialBackup = Math.min(node.backupGenCapacityMw, availableBackupRemaining);

        if (potentialBackup >= node.demandMw && node.status !== 'faulted') {
          // Can island on full backup
          node.isEnergized = true;
          node.status = 'islanded_backup';
          node.backupGenActive = true;
          node.powerServedMw = node.demandMw;
          demandServedMw += node.demandMw;
          backupPowerInUseMw += node.demandMw;
          availableBackupRemaining -= node.demandMw;
          if (isCritical) {
            criticalDemandServedMw += node.demandMw;
          }
        } else if (potentialBackup > 0 && node.status !== 'faulted') {
          // Partial backup
          node.isEnergized = true;
          node.status = 'islanded_backup';
          node.backupGenActive = true;
          node.powerServedMw = potentialBackup;
          demandServedMw += potentialBackup;
          backupPowerInUseMw += potentialBackup;
          availableBackupRemaining -= potentialBackup;
          if (isCritical) {
            criticalDemandServedMw += potentialBackup;
          }
          unservedFacilitiesCount++;
          constraintViolations.push(`${node.name}: Partial backup only (${potentialBackup} / ${node.demandMw} MW served)`);
        } else {
          // Complete Blackout
          node.isEnergized = false;
          node.powerServedMw = 0;
          node.backupGenActive = false;
          if (node.status !== 'faulted') {
            node.status = 'isolated';
          }
          unservedFacilitiesCount++;
          constraintViolations.push(`${node.name}: Unserved load (${node.demandMw} MW blackout)`);
        }
      }
    } else {
      // Substation or generation
      node.isEnergized = reachableFromGen.has(node.id);
      node.powerServedMw = 0;
    }
  });

  // Calculate realistic power flow through lines
  baseTopology.edges.forEach((edge) => {
    const isTransmitting = visitedEdges.has(edge.id) && 
      (edge.status === 'operational' || edge.status === 'restored');

    if (isTransmitting) {
      // Approximate flow based on downstream demand
      const targetNode = nodesMap.get(edge.targetNodeId);
      const approxFlow = targetNode?.demandMw || Math.min(edge.capacityMw * 0.6, 120);
      edge.currentFlowMw = Math.round(approxFlow);
      powerFlowMap[edge.id] = edge.currentFlowMw;

      if (edge.currentFlowMw > edge.capacityMw) {
        constraintViolations.push(`Line Overload: ${edge.name} flow ${edge.currentFlowMw} MW exceeds capacity ${edge.capacityMw} MW`);
      }
    } else {
      edge.currentFlowMw = 0;
      powerFlowMap[edge.id] = 0;
    }
  });

  // Count active failures (faulted nodes, edges, or damaged towers)
  const failedNodesCount = Array.from(nodesMap.values()).filter((n) => n.status === 'faulted').length;
  const failedEdgesCount = baseTopology.edges.filter((e) => e.status === 'faulted').length;
  const failedTowersCount = baseTopology.towers.filter((t) => t.status === 'faulted' || t.status === 'damaged').length;
  const activeFailuresCount = failedNodesCount + failedEdgesCount + failedTowersCount;

  // Total generation capacity
  const totalCapacityMw = activeGenNodes.reduce((acc, n) => acc + n.generationCapacityMw, 0);

  const restorationPercentage = totalDemandMw > 0 
    ? Math.round((demandServedMw / totalDemandMw) * 100) 
    : 100;

  const criticalRestorationPercentage = criticalDemandTotalMw > 0
    ? Math.round((criticalDemandServedMw / criticalDemandTotalMw) * 100)
    : 100;

  const metrics: SimulationMetrics = {
    totalCapacityMw,
    totalDemandMw,
    demandServedMw: Math.round(demandServedMw * 10) / 10,
    criticalDemandTotalMw,
    criticalDemandServedMw: Math.round(criticalDemandServedMw * 10) / 10,
    unservedFacilitiesCount,
    totalFacilitiesCount,
    activeFailuresCount,
    backupPowerInUseMw: Math.round(backupPowerInUseMw * 10) / 10,
    backupPowerRemainingMw: Math.max(0, Math.round(availableBackupRemaining * 10) / 10),
    totalBackupCapacityMw: backupFuelAllowanceMw,
    constraintViolations,
    restorationPercentage,
    criticalRestorationPercentage,
  };

  return {
    topology: {
      nodes: Array.from(nodesMap.values()),
      edges: Array.from(edgesMap.values()),
      towers: [...baseTopology.towers],
    },
    metrics,
    reachabilityMap,
    powerFlowMap,
  };
}
