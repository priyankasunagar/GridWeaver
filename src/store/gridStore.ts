import { useState, useEffect } from 'react';
import { 
  GridTopology, 
  GridNode, 
  GridEdge, 
  TransmissionTower, 
  SimulationMetrics, 
  RestorationPlan,
  ScenarioPreset 
} from '../models/grid';
import { INITIAL_GRID_TOPOLOGY, PRESET_SCENARIOS } from '../data/initialGrid';
import { evaluateGridState } from '../simulation/connectivity';
import { generateRestorationPlan } from '../simulation/restorationDemo';
import { gridWeaverApi } from '../services/apiClient';

export interface ViewSettings {
  showTerrain: boolean;
  showConductors: boolean;
  showParticles: boolean;
  showLabels: boolean;
  showTowers: boolean;
  cameraPreset: 'overview' | 'substation' | 'hospital' | 'hydro' | 'topdown';
  reducedMotion: boolean;
  performanceMode: boolean;
}

export interface GridState {
  topology: GridTopology;
  metrics: SimulationMetrics;
  reachabilityMap: Record<string, boolean>;
  powerFlowMap: Record<string, number>;
  activeScenarioId: string;
  selectedComponent: { type: 'node' | 'edge' | 'tower'; id: string } | null;
  backupCapacityMw: number;
  criticalityWeight: number;
  currentPlan: RestorationPlan | null;
  planExecutionStep: number;
  isSimulating: boolean;
  viewSettings: ViewSettings;
  scenarioHistory: Array<{
    timestamp: string;
    scenarioName: string;
    demandServedMw: number;
    criticalPercent: number;
    activeFailures: number;
  }>;
}

const initialEval = evaluateGridState(INITIAL_GRID_TOPOLOGY, 25);

let globalState: GridState = {
  topology: initialEval.topology,
  metrics: initialEval.metrics,
  reachabilityMap: initialEval.reachabilityMap,
  powerFlowMap: initialEval.powerFlowMap,
  activeScenarioId: 'baseline',
  selectedComponent: null,
  backupCapacityMw: 25,
  criticalityWeight: 0.85,
  currentPlan: null,
  planExecutionStep: 0,
  isSimulating: false,
  viewSettings: {
    showTerrain: true,
    showConductors: true,
    showParticles: true,
    showLabels: true,
    showTowers: true,
    cameraPreset: 'overview',
    reducedMotion: false,
    performanceMode: false,
  },
  scenarioHistory: [
    {
      timestamp: new Date().toLocaleTimeString(),
      scenarioName: 'Normal Operating Baseline',
      demandServedMw: initialEval.metrics.demandServedMw,
      criticalPercent: initialEval.metrics.criticalRestorationPercentage,
      activeFailures: 0,
    },
  ],
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function updateState(updater: (prev: GridState) => GridState) {
  globalState = updater(globalState);
  notify();
}

export const gridStore = {
  getState: () => globalState,

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  selectComponent: (type: 'node' | 'edge' | 'tower' | null, id?: string) => {
    updateState((prev) => ({
      ...prev,
      selectedComponent: type && id ? { type, id } : null,
    }));
  },

  setBackupCapacity: (mw: number) => {
    updateState((prev) => {
      const reEval = evaluateGridState(prev.topology, mw);
      return {
        ...prev,
        backupCapacityMw: mw,
        topology: reEval.topology,
        metrics: reEval.metrics,
        reachabilityMap: reEval.reachabilityMap,
        powerFlowMap: reEval.powerFlowMap,
      };
    });
  },

  setCriticalityWeight: (weight: number) => {
    updateState((prev) => ({
      ...prev,
      criticalityWeight: weight,
    }));
  },

  setViewSetting: <K extends keyof ViewSettings>(key: K, value: ViewSettings[K]) => {
    updateState((prev) => ({
      ...prev,
      viewSettings: {
        ...prev.viewSettings,
        [key]: value,
      },
    }));
  },

  setCameraPreset: (preset: ViewSettings['cameraPreset']) => {
    updateState((prev) => ({
      ...prev,
      viewSettings: {
        ...prev.viewSettings,
        cameraPreset: preset,
      },
    }));
  },

  loadPresetScenario: (scenarioId: string) => {
    const preset = PRESET_SCENARIOS.find((s) => s.id === scenarioId);
    if (!preset) return;

    // Reset from baseline
    const freshNodes: GridNode[] = INITIAL_GRID_TOPOLOGY.nodes.map((n) => ({
      ...n,
      status: preset.failedNodeIds.includes(n.id) ? 'faulted' : 'operational',
      isEnergized: !preset.failedNodeIds.includes(n.id),
    }));

    const freshEdges: GridEdge[] = INITIAL_GRID_TOPOLOGY.edges.map((e) => {
      if (preset.failedEdgeIds.includes(e.id)) {
        return { ...e, status: 'faulted', currentFlowMw: 0 };
      }
      return { ...e, status: e.status === 'isolated' ? 'isolated' : 'operational' };
    });

    const freshTowers: TransmissionTower[] = INITIAL_GRID_TOPOLOGY.towers.map((t) => ({
      ...t,
      status: preset.failedTowerIds.includes(t.id) ? 'faulted' : 'operational',
    }));

    const reEval = evaluateGridState(
      { nodes: freshNodes, edges: freshEdges, towers: freshTowers },
      preset.defaultBackupCapacity
    );

    updateState((prev) => ({
      ...prev,
      activeScenarioId: scenarioId,
      backupCapacityMw: preset.defaultBackupCapacity,
      topology: reEval.topology,
      metrics: reEval.metrics,
      reachabilityMap: reEval.reachabilityMap,
      powerFlowMap: reEval.powerFlowMap,
      currentPlan: null,
      planExecutionStep: 0,
      scenarioHistory: [
        {
          timestamp: new Date().toLocaleTimeString(),
          scenarioName: preset.name,
          demandServedMw: reEval.metrics.demandServedMw,
          criticalPercent: reEval.metrics.criticalRestorationPercentage,
          activeFailures: reEval.metrics.activeFailuresCount,
        },
        ...prev.scenarioHistory.slice(0, 9),
      ],
    }));
  },

  toggleFaultNode: (nodeId: string) => {
    updateState((prev) => {
      const nodes = prev.topology.nodes.map((n) => {
        if (n.id === nodeId) {
          const nextStatus = (n.status === 'faulted' ? 'operational' : 'faulted') as GridNode['status'];
          return { ...n, status: nextStatus };
        }
        return n;
      });

      const reEval = evaluateGridState(
        { ...prev.topology, nodes },
        prev.backupCapacityMw
      );

      return {
        ...prev,
        topology: reEval.topology,
        metrics: reEval.metrics,
        reachabilityMap: reEval.reachabilityMap,
        powerFlowMap: reEval.powerFlowMap,
        currentPlan: null,
      };
    });
  },

  toggleFaultEdge: (edgeId: string) => {
    updateState((prev) => {
      const edges = prev.topology.edges.map((e) => {
        if (e.id === edgeId) {
          const nextStatus = (e.status === 'faulted' ? 'operational' : 'faulted') as GridEdge['status'];
          return { ...e, status: nextStatus };
        }
        return e;
      });

      const reEval = evaluateGridState(
        { ...prev.topology, edges },
        prev.backupCapacityMw
      );

      return {
        ...prev,
        topology: reEval.topology,
        metrics: reEval.metrics,
        reachabilityMap: reEval.reachabilityMap,
        powerFlowMap: reEval.powerFlowMap,
        currentPlan: null,
      };
    });
  },

  toggleFaultTower: (towerId: string) => {
    updateState((prev) => {
      const tower = prev.topology.towers.find((t) => t.id === towerId);
      if (!tower) return prev;

      const nextTowerStatus = (tower.status === 'faulted' ? 'operational' : 'faulted') as TransmissionTower['status'];
      const towers = prev.topology.towers.map((t) => 
        t.id === towerId ? { ...t, status: nextTowerStatus } : t
      );

      // Faulting a tower faults the transmission lines it carries!
      const edges = prev.topology.edges.map((e) => {
        if (tower.lineIds.includes(e.id)) {
          return {
            ...e,
            status: (nextTowerStatus === 'faulted' ? 'faulted' : 'operational') as GridEdge['status'],
          };
        }
        return e;
      });

      const reEval = evaluateGridState(
        { ...prev.topology, towers, edges },
        prev.backupCapacityMw
      );

      return {
        ...prev,
        topology: reEval.topology,
        metrics: reEval.metrics,
        reachabilityMap: reEval.reachabilityMap,
        powerFlowMap: reEval.powerFlowMap,
        currentPlan: null,
      };
    });
  },

  generateRestorationPlan: async () => {
    const s = globalState;
    if (gridWeaverApi.isBackendOnline()) {
      try {
        const faultedEdges = s.topology.edges.filter((e) => e.status === 'faulted').map((e) => e.id);
        const faultedNodes = s.topology.nodes.filter((n) => n.status === 'faulted').map((n) => n.id);
        const failedComps = [...faultedEdges, ...faultedNodes];
        const res = await gridWeaverApi.solveClassicalMIP({
          failed_components: failedComps.length > 0 ? failedComps : ['line-691'],
          backup_capacity_mw: s.backupCapacityMw,
          objective_weight_critical: s.criticalityWeight,
          max_switching_steps: 10,
        });
        if (res && res.plan) {
          updateState((prev) => ({
            ...prev,
            currentPlan: res.plan,
            planExecutionStep: 0,
          }));
          return;
        }
      } catch (e) {
        // Fallback to local heuristic
      }
    }
    const plan = generateRestorationPlan(s.topology, s.backupCapacityMw, s.criticalityWeight);
    updateState((prev) => ({
      ...prev,
      currentPlan: plan,
      planExecutionStep: 0,
    }));
  },

  applyRestorationAction: (actionId: string) => {
    updateState((prev) => {
      if (!prev.currentPlan) return prev;

      const action = prev.currentPlan.actions.find((a) => a.id === actionId);
      if (!action || action.status === 'completed') return prev;

      // Execute targeted action on topology
      const nodes = prev.topology.nodes.map((n) => {
        if (n.id === action.targetId) {
          if (action.type === 'start_backup') {
            return { ...n, backupGenActive: true, status: 'islanded_backup' as const };
          }
          if (action.type === 'clear_fault') {
            return { ...n, status: 'operational' as const };
          }
        }
        return n;
      });

      const edges = prev.topology.edges.map((e) => {
        if (e.id === action.targetId) {
          if (action.type === 'switch_tie') {
            return { ...e, status: 'restored' as const };
          }
          if (action.type === 'isolate_line') {
            return { ...e, status: 'isolated' as const };
          }
        }
        return e;
      });

      const towers = prev.topology.towers.map((t) => {
        if (t.id === action.targetId && action.type === 'clear_fault') {
          return { ...t, status: 'operational' as const };
        }
        return t;
      });

      const updatedActions = prev.currentPlan.actions.map((a) =>
        a.id === actionId ? { ...a, status: 'completed' as const } : a
      );

      const reEval = evaluateGridState(
        { nodes, edges, towers },
        prev.backupCapacityMw
      );

      return {
        ...prev,
        topology: reEval.topology,
        metrics: reEval.metrics,
        reachabilityMap: reEval.reachabilityMap,
        powerFlowMap: reEval.powerFlowMap,
        planExecutionStep: prev.planExecutionStep + 1,
        currentPlan: {
          ...prev.currentPlan,
          actions: updatedActions,
        },
      };
    });
  },

  applyAllPlanActions: () => {
    updateState((prev) => {
      if (!prev.currentPlan) return prev;

      let currentTopology = { ...prev.topology };

      prev.currentPlan.actions.forEach((act) => {
        if (act.type === 'switch_tie') {
          currentTopology.edges = currentTopology.edges.map((e) =>
            e.id === act.targetId ? { ...e, status: 'restored' as const } : e
          );
        } else if (act.type === 'isolate_line') {
          currentTopology.edges = currentTopology.edges.map((e) =>
            e.id === act.targetId ? { ...e, status: 'isolated' as const } : e
          );
        } else if (act.type === 'start_backup') {
          currentTopology.nodes = currentTopology.nodes.map((n) =>
            n.id === act.targetId ? { ...n, backupGenActive: true, status: 'islanded_backup' as const } : n
          );
        } else if (act.type === 'clear_fault') {
          currentTopology.towers = currentTopology.towers.map((t) =>
            t.id === act.targetId ? { ...t, status: 'operational' as const } : t
          );
        }
      });

      const completedActions = prev.currentPlan.actions.map((a) => ({
        ...a,
        status: 'completed' as const,
      }));

      const reEval = evaluateGridState(currentTopology, prev.backupCapacityMw);

      return {
        ...prev,
        topology: reEval.topology,
        metrics: reEval.metrics,
        reachabilityMap: reEval.reachabilityMap,
        powerFlowMap: reEval.powerFlowMap,
        planExecutionStep: prev.currentPlan.actions.length,
        currentPlan: {
          ...prev.currentPlan,
          actions: completedActions,
        },
        scenarioHistory: [
          {
            timestamp: new Date().toLocaleTimeString(),
            scenarioName: `Restoration Plan Applied (${prev.currentPlan.id})`,
            demandServedMw: reEval.metrics.demandServedMw,
            criticalPercent: reEval.metrics.criticalRestorationPercentage,
            activeFailures: reEval.metrics.activeFailuresCount,
          },
          ...prev.scenarioHistory.slice(0, 9),
        ],
      };
    });
  },

  resetGrid: () => {
    const reEval = evaluateGridState(INITIAL_GRID_TOPOLOGY, 25);
    updateState((prev) => ({
      ...prev,
      topology: reEval.topology,
      metrics: reEval.metrics,
      reachabilityMap: reEval.reachabilityMap,
      powerFlowMap: reEval.powerFlowMap,
      activeScenarioId: 'baseline',
      currentPlan: null,
      planExecutionStep: 0,
      selectedComponent: null,
      scenarioHistory: [
        {
          timestamp: new Date().toLocaleTimeString(),
          scenarioName: 'Reset to Normal Baseline',
          demandServedMw: reEval.metrics.demandServedMw,
          criticalPercent: reEval.metrics.criticalRestorationPercentage,
          activeFailures: 0,
        },
        ...prev.scenarioHistory.slice(0, 9),
      ],
    }));
  },
};

export function useGridStore(): GridState {
  const [state, setState] = useState<GridState>(gridStore.getState());

  useEffect(() => {
    const unsubscribe = gridStore.subscribe(() => {
      setState(gridStore.getState());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return state;
}
