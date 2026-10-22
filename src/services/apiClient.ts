import { GridTopology, RestorationPlan, SimulationMetrics } from '../models/grid';

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded';
  version: string;
  solverEngines: {
    qiskitAerAvailable: boolean;
    classicalMipAvailable: boolean;
    gpuAcceleration: boolean;
  };
  qiskit_status?: string;
  ortools_status?: string;
}

export interface SimulateScenarioRequest {
  failed_components?: string[];
  failedNodeIds?: string[];
  failedEdgeIds?: string[];
  failedTowerIds?: string[];
  backup_power_mw?: number;
  backupCapacityMw?: number;
  priority_mode?: string;
}

export interface SimulateScenarioResponse {
  topology: GridTopology;
  metrics: SimulationMetrics;
  reachability_map: Record<string, boolean>;
  reachabilityMap: Record<string, boolean>;
  power_flow_map: Record<string, number>;
  powerFlowMap: Record<string, number>;
  failed_components: string[];
  disconnected_facilities: string[];
  affected_demand_mw: number;
  affected_critical_demand_mw: number;
  available_generation_mw: number;
  available_backup_mw: number;
  reachable_facilities: string[];
  constraint_violations: string[];
}

export interface SolveRestorationRequest {
  topology?: GridTopology;
  failed_components?: string[];
  backup_capacity_mw?: number;
  backupCapacityMw?: number;
  objective_weight_critical?: number;
  objectiveWeightCritical?: number;
  max_switching_steps?: number;
  maxSwitchingSteps?: number;
  time_limit_sec?: number;
  timeLimitSec?: number;
}

export interface ClassicalSolverResponse {
  planId: string;
  method: 'classical_mip';
  solverName: string;
  optimal: boolean;
  objectiveValue: number;
  runtimeMs: number;
  restored_facilities: string[];
  restored_demand_mw: number;
  restored_critical_demand_mw: number;
  backup_power_used_mw: number;
  constraint_violations: string[];
  plan: RestorationPlan;
}

export interface QAOASolveRequest {
  failed_components?: string[];
  backup_capacity_mw?: number;
  backupCapacityMw?: number;
  objective_weight_critical?: number;
  objectiveWeightCritical?: number;
  ansatz_depth_p?: number;
  ansatzDepthP?: number;
  shots?: number;
  max_iter?: number;
}

export interface QAOASolverResponse {
  planId: string;
  method: 'quantum_qaoa';
  ansatzDepthP: number;
  qubitCount: number;
  quantumSimulator: string;
  costHamiltonianTerms: number;
  approximationRatio: number;
  runtimeMs: number;
  best_bitstring: string;
  measurement_distribution?: Record<string, number>;
  restored_facilities: string[];
  restored_demand_mw: number;
  restored_critical_demand_mw: number;
  backup_power_used_mw: number;
  constraint_violations: string[];
  objective_value: number;
  plan: RestorationPlan;
  circuitSummary: {
    numQubits: number;
    depth: number;
    numGates: number;
  };
}

export interface QUBOResponse {
  num_variables: number;
  variable_names: string[];
  variable_descriptions: Record<string, string>;
  linear_coefficients: Record<string, number>;
  quadratic_coefficients: Record<string, Record<string, number>>;
  constant: number;
  formulation_details: Record<string, any>;
}

export interface CompareScenariosRequest {
  failed_components?: string[];
  backup_power_mw?: number;
  backupCapacityMw?: number;
  objective_weight_critical?: number;
  ansatz_depth_p?: number;
  baselineScenarioId?: string;
  comparisonScenarioIds?: string[];
}

export interface CompareScenariosResponse {
  scenario_description: string;
  failed_components: string[];
  classical: Record<string, any>;
  quantum: Record<string, any>;
  comparison: Record<string, any>;
  metricsComparison: Array<{
    scenarioName: string;
    totalDemandServedMw: number;
    criticalDemandServedMw: number;
    activeFailures: number;
    backupFuelUsedMw: number;
    switchingSteps: number;
    runtimeMs?: number;
    objectiveValue?: number;
    optimal?: boolean;
  }>;
}

type StatusListener = (online: boolean, health: HealthCheckResponse | null) => void;

class GridWeaverApiClient {
  private baseUrl: string;
  private isConnected: boolean = false;
  private healthData: HealthCheckResponse | null = null;
  private listeners: Set<StatusListener> = new Set();

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
    // Auto-check health in background
    if (typeof window !== 'undefined') {
      setTimeout(() => this.checkHealth(), 500);
    }
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url;
    this.checkHealth();
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.isConnected, this.healthData);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.isConnected, this.healthData));
  }

  public async checkHealth(): Promise<HealthCheckResponse | null> {
    const urlsToTry = [this.baseUrl, 'http://localhost:8000', 'http://localhost:8001', 'http://127.0.0.1:8000', 'http://127.0.0.1:8001'];
    // Deduplicate
    const uniqueUrls = Array.from(new Set(urlsToTry));

    for (const url of uniqueUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(`${url}/health`, {
          credentials: 'omit',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          this.baseUrl = url;
          this.isConnected = true;
          this.healthData = data;
          this.notify();
          return this.healthData;
        }
      } catch {
        // Continue trying next candidate
      }
    }

    this.isConnected = false;
    this.healthData = null;
    this.notify();
    return null;
  }

  public isBackendOnline(): boolean {
    return this.isConnected;
  }

  public getCachedHealth(): HealthCheckResponse | null {
    return this.healthData;
  }

  public async getGridTopology(): Promise<GridTopology | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/grid`);
      if (res.ok) {
        this.isConnected = true;
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  public async simulateScenario(req: SimulateScenarioRequest): Promise<SimulateScenarioResponse | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/scenarios/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        this.isConnected = true;
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  public async solveClassicalMIP(req: SolveRestorationRequest): Promise<ClassicalSolverResponse | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/restoration/solve-classical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        this.isConnected = true;
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  public async getQUBO(req?: SimulateScenarioRequest): Promise<QUBOResponse | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/quantum/qubo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req || {}),
      });
      if (res.ok) {
        this.isConnected = true;
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  public async solveQuantumQAOA(req: QAOASolveRequest): Promise<QAOASolverResponse | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/quantum/solve-qaoa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        this.isConnected = true;
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  public async compareScenarios(req: CompareScenariosRequest): Promise<CompareScenariosResponse | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        this.isConnected = true;
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const gridWeaverApi = new GridWeaverApiClient();
