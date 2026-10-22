export type NodeType = 
  | 'generation' 
  | 'substation_main' 
  | 'substation_distribution' 
  | 'hospital' 
  | 'water_treatment' 
  | 'emergency_eoc' 
  | 'industrial' 
  | 'residential_north' 
  | 'commercial_downtown';

export type CriticalityTier = 1 | 2 | 3; // 1 = Life Safety / Critical, 2 = Essential / Infrastructure, 3 = Standard

export type OperationalStatus = 
  | 'operational' 
  | 'faulted' 
  | 'isolated' 
  | 'restored' 
  | 'islanded_backup';

export interface GridNode {
  id: string;
  name: string;
  type: NodeType;
  voltageKv: number; // e.g. 500, 230, 69, 13.8
  position: [number, number, number]; // [x, y, z] in 3D world
  demandMw: number; // 0 for pure generation
  generationCapacityMw: number; // >0 for power plants
  criticality: CriticalityTier;
  status: OperationalStatus;
  backupGenCapacityMw: number;
  backupGenActive: boolean;
  priorityScore: number; // 1-100
  description: string;
  substationId?: string;
  powerServedMw?: number;
  isEnergized?: boolean;
}

export interface GridEdge {
  id: string;
  name: string;
  sourceNodeId: string;
  targetNodeId: string;
  voltageKv: number;
  capacityMw: number;
  currentFlowMw: number;
  status: 'operational' | 'faulted' | 'isolated' | 'restored';
  lengthKm: number;
  // Intermediate tower IDs supporting this line
  towerIds: string[];
  // Path points for sagged catenary lines
  intermediatePoints?: [number, number, number][];
}

export interface TransmissionTower {
  id: string;
  name: string;
  position: [number, number, number];
  height: number;
  voltageKv: number;
  lineIds: string[];
  status: 'operational' | 'faulted' | 'damaged';
  hasAviationMarkings?: boolean;
}

export interface GridTopology {
  nodes: GridNode[];
  edges: GridEdge[];
  towers: TransmissionTower[];
}

export interface SimulationMetrics {
  totalCapacityMw: number;
  totalDemandMw: number;
  demandServedMw: number;
  criticalDemandTotalMw: number;
  criticalDemandServedMw: number;
  unservedFacilitiesCount: number;
  totalFacilitiesCount: number;
  activeFailuresCount: number;
  backupPowerInUseMw: number;
  backupPowerRemainingMw: number;
  totalBackupCapacityMw: number;
  constraintViolations: string[];
  restorationPercentage: number;
  criticalRestorationPercentage: number;
}

export interface RestorationAction {
  id: string;
  step: number;
  type: 'switch_tie' | 'clear_fault' | 'start_backup' | 'isolate_line' | 'shed_load';
  targetId: string;
  targetName: string;
  description: string;
  estimatedTimeMin: number;
  mwRestored: number;
  criticalMwRestored: number;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface RestorationPlan {
  id: string;
  title: string;
  method: 'frontend_heuristic' | 'classical_mip' | 'quantum_qaoa';
  generatedAt: string;
  actions: RestorationAction[];
  projectedMetrics: SimulationMetrics;
  computationTimeMs: number;
  notes: string;
}

export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'moderate' | 'severe' | 'critical';
  failedNodeIds: string[];
  failedEdgeIds: string[];
  failedTowerIds: string[];
  defaultBackupCapacity: number;
}
