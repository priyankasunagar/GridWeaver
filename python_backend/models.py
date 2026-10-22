from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel, Field, field_validator, model_validator


class GridNode(BaseModel):
    id: str
    name: str
    type: str  # 'generation', 'substation_main', 'substation_distribution', 'hospital', 'water_treatment', 'emergency_eoc', 'industrial', 'residential_north', 'commercial_downtown'
    voltage_kv: float = Field(default=13.8, ge=0)
    demand_mw: float = Field(default=0.0, ge=0)
    generation_mw: float = Field(default=0.0, ge=0)
    capacity_mw: float = Field(default=0.0, ge=0)
    priority: int = Field(default=50, ge=1, le=100)
    criticality: int = Field(default=3, ge=1, le=3)  # 1 = Life-Safety, 2 = Essential, 3 = Standard
    status: str = Field(default="operational")  # 'operational', 'faulted', 'isolated', 'restored', 'islanded_backup'
    backup_availability: bool = Field(default=False)
    backup_capacity_mw: float = Field(default=0.0, ge=0)
    backup_active: bool = Field(default=False)
    position: Optional[List[float]] = None
    description: Optional[str] = None
    substation_id: Optional[str] = None
    power_served_mw: float = Field(default=0.0, ge=0)
    is_energized: bool = Field(default=True)

    # Aliases for camelCase frontend compatibility
    voltageKv: Optional[float] = None
    demandMw: Optional[float] = None
    generationCapacityMw: Optional[float] = None
    priorityScore: Optional[int] = None
    backupGenCapacityMw: Optional[float] = None
    backupGenActive: Optional[bool] = None
    powerServedMw: Optional[float] = None
    isEnergized: Optional[bool] = None

    @model_validator(mode="before")
    @classmethod
    def sync_camel_case(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Map camelCase to snake_case if snake_case not provided
            if "voltageKv" in data and "voltage_kv" not in data:
                data["voltage_kv"] = data["voltageKv"]
            if "demandMw" in data and "demand_mw" not in data:
                data["demand_mw"] = data["demandMw"]
            if "generationCapacityMw" in data and "generation_mw" not in data:
                data["generation_mw"] = data["generationCapacityMw"]
            if "generationCapacityMw" in data and "capacity_mw" not in data:
                data["capacity_mw"] = data["generationCapacityMw"]
            if "priorityScore" in data and "priority" not in data:
                data["priority"] = data["priorityScore"]
            if "backupGenCapacityMw" in data and "backup_capacity_mw" not in data:
                data["backup_capacity_mw"] = data["backupGenCapacityMw"]
                data["backup_availability"] = data["backupGenCapacityMw"] > 0
            if "backupGenActive" in data and "backup_active" not in data:
                data["backup_active"] = data["backupGenActive"]
            if "isEnergized" in data and "is_energized" not in data:
                data["is_energized"] = data["isEnergized"]
            if "powerServedMw" in data and "power_served_mw" not in data:
                data["power_served_mw"] = data["powerServedMw"]
        return data


class TransmissionLine(BaseModel):
    id: str
    name: str
    source: str
    target: str
    voltage_kv: float = Field(default=69.0, ge=0)
    capacity_mw: float = Field(default=100.0, ge=0)
    current_flow_mw: float = Field(default=0.0, ge=0)
    status: str = Field(default="operational")  # 'operational', 'faulted', 'isolated', 'restored'
    failed: bool = Field(default=False)
    restoration_time_min: float = Field(default=30.0, ge=0)
    distance_km: float = Field(default=10.0, ge=0)
    tower_ids: List[str] = Field(default_factory=list)

    # Aliases for frontend compatibility
    sourceNodeId: Optional[str] = None
    targetNodeId: Optional[str] = None
    voltageKv: Optional[float] = None
    capacityMw: Optional[float] = None
    currentFlowMw: Optional[float] = None
    lengthKm: Optional[float] = None
    towerIds: Optional[List[str]] = None

    @model_validator(mode="before")
    @classmethod
    def sync_line_camel_case(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "sourceNodeId" in data and "source" not in data:
                data["source"] = data["sourceNodeId"]
            if "targetNodeId" in data and "target" not in data:
                data["target"] = data["targetNodeId"]
            if "source" in data and "sourceNodeId" not in data:
                data["sourceNodeId"] = data["source"]
            if "target" in data and "targetNodeId" not in data:
                data["targetNodeId"] = data["target"]
            if "voltageKv" in data and "voltage_kv" not in data:
                data["voltage_kv"] = data["voltageKv"]
            if "capacityMw" in data and "capacity_mw" not in data:
                data["capacity_mw"] = data["capacityMw"]
            if "currentFlowMw" in data and "current_flow_mw" not in data:
                data["current_flow_mw"] = data["currentFlowMw"]
            if "lengthKm" in data and "distance_km" not in data:
                data["distance_km"] = data["lengthKm"]
            if "towerIds" in data and "tower_ids" not in data:
                data["tower_ids"] = data["towerIds"]
            if data.get("status") == "faulted":
                data["failed"] = True
        return data


class TransmissionTower(BaseModel):
    id: str
    name: str
    height: float = Field(default=14.0, ge=0)
    voltage_kv: float = Field(default=230.0, ge=0)
    line_ids: List[str] = Field(default_factory=list)
    status: str = Field(default="operational")  # 'operational', 'faulted', 'damaged'
    has_aviation_markings: bool = Field(default=False)
    position: Optional[List[float]] = None

    voltageKv: Optional[float] = None
    lineIds: Optional[List[str]] = None
    hasAviationMarkings: Optional[bool] = None

    @model_validator(mode="before")
    @classmethod
    def sync_tower_camel_case(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "voltageKv" in data and "voltage_kv" not in data:
                data["voltage_kv"] = data["voltageKv"]
            if "lineIds" in data and "line_ids" not in data:
                data["line_ids"] = data["lineIds"]
            if "hasAviationMarkings" in data and "has_aviation_markings" not in data:
                data["has_aviation_markings"] = data["hasAviationMarkings"]
        return data


class SimulationMetrics(BaseModel):
    total_capacity_mw: float = 0.0
    total_demand_mw: float = 0.0
    demand_served_mw: float = 0.0
    critical_demand_total_mw: float = 0.0
    critical_demand_served_mw: float = 0.0
    unserved_facilities_count: int = 0
    total_facilities_count: int = 0
    active_failures_count: int = 0
    backup_power_in_use_mw: float = 0.0
    backup_power_remaining_mw: float = 0.0
    total_backup_capacity_mw: float = 0.0
    constraint_violations: List[str] = Field(default_factory=list)
    restoration_percentage: float = 100.0
    critical_restoration_percentage: float = 100.0

    # CamelCase aliases
    totalCapacityMw: Optional[float] = None
    totalDemandMw: Optional[float] = None
    demandServedMw: Optional[float] = None
    criticalDemandTotalMw: Optional[float] = None
    criticalDemandServedMw: Optional[float] = None
    unservedFacilitiesCount: Optional[int] = None
    totalFacilitiesCount: Optional[int] = None
    activeFailuresCount: Optional[int] = None
    backupPowerInUseMw: Optional[float] = None
    backupPowerRemainingMw: Optional[float] = None
    totalBackupCapacityMw: Optional[float] = None
    constraintViolations: Optional[List[str]] = None
    restorationPercentage: Optional[float] = None
    criticalRestorationPercentage: Optional[float] = None

    @model_validator(mode="before")
    @classmethod
    def sync_metrics_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Sync snake to camel and vice versa
            mapping = {
                "totalCapacityMw": "total_capacity_mw",
                "totalDemandMw": "total_demand_mw",
                "demandServedMw": "demand_served_mw",
                "criticalDemandTotalMw": "critical_demand_total_mw",
                "criticalDemandServedMw": "critical_demand_served_mw",
                "unservedFacilitiesCount": "unserved_facilities_count",
                "totalFacilitiesCount": "total_facilities_count",
                "activeFailuresCount": "active_failures_count",
                "backupPowerInUseMw": "backup_power_in_use_mw",
                "backupPowerRemainingMw": "backup_power_remaining_mw",
                "totalBackupCapacityMw": "total_backup_capacity_mw",
                "constraintViolations": "constraint_violations",
                "restorationPercentage": "restoration_percentage",
                "criticalRestorationPercentage": "critical_restoration_percentage",
            }
            for camel, snake in mapping.items():
                if camel in data and snake not in data:
                    data[snake] = data[camel]
                elif snake in data and camel not in data:
                    data[camel] = data[snake]
        return data


class GridTopologyResponse(BaseModel):
    nodes: List[GridNode]
    edges: List[TransmissionLine]
    towers: List[TransmissionTower] = Field(default_factory=list)
    metrics: Optional[SimulationMetrics] = None


class FailureSimulationRequest(BaseModel):
    failed_components: Optional[List[str]] = Field(default=None, description="Component IDs to fail (lines, nodes, towers)")
    failed_node_ids: Optional[List[str]] = None
    failed_edge_ids: Optional[List[str]] = None
    failed_tower_ids: Optional[List[str]] = None
    backup_power_mw: float = Field(default=25.0, description="Available backup power capacity in MW")
    priority_mode: str = Field(default="critical_first", description="'critical_first' or 'balanced'")

    # CamelCase aliases
    failedComponents: Optional[List[str]] = None
    failedNodeIds: Optional[List[str]] = None
    failedEdgeIds: Optional[List[str]] = None
    failedTowerIds: Optional[List[str]] = None
    backupCapacityMw: Optional[float] = None

    @model_validator(mode="before")
    @classmethod
    def validate_simulation_inputs(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Map camelCase
            if "backupCapacityMw" in data and "backup_power_mw" not in data:
                data["backup_power_mw"] = data["backupCapacityMw"]
            if "failedComponents" in data and "failed_components" not in data:
                data["failed_components"] = data["failedComponents"]
            if "failedNodeIds" in data and "failed_node_ids" not in data:
                data["failed_node_ids"] = data["failedNodeIds"]
            if "failedEdgeIds" in data and "failed_edge_ids" not in data:
                data["failed_edge_ids"] = data["failedEdgeIds"]
            if "failedTowerIds" in data and "failed_tower_ids" not in data:
                data["failed_tower_ids"] = data["failedTowerIds"]

            # Validate non-negative backup power
            backup = data.get("backup_power_mw", 25.0)
            if backup is not None and backup < 0:
                raise ValueError("backup_power_mw must be non-negative (>= 0)")
        return data


class SimulationResponse(BaseModel):
    topology: GridTopologyResponse
    metrics: SimulationMetrics
    reachability_map: Dict[str, bool]
    reachabilityMap: Dict[str, bool]
    power_flow_map: Dict[str, float]
    powerFlowMap: Dict[str, float]
    failed_components: List[str]
    disconnected_facilities: List[str]
    affected_demand_mw: float
    affected_critical_demand_mw: float
    available_generation_mw: float
    available_backup_mw: float
    reachable_facilities: List[str]
    constraint_violations: List[str]


class RestorationAction(BaseModel):
    id: str
    step: int
    type: str  # 'switch_tie', 'clear_fault', 'start_backup', 'isolate_line', 'shed_load'
    targetId: str
    targetName: str
    description: str
    estimatedTimeMin: float
    mwRestored: float
    criticalMwRestored: float
    status: str = "pending"  # 'pending', 'in_progress', 'completed'

    # Snake case equivalents
    target_id: Optional[str] = None
    target_name: Optional[str] = None
    estimated_time_min: Optional[float] = None
    mw_restored: Optional[float] = None
    critical_mw_restored: Optional[float] = None

    @model_validator(mode="before")
    @classmethod
    def sync_action_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "target_id" in data and "targetId" not in data:
                data["targetId"] = data["target_id"]
            if "targetId" in data and "target_id" not in data:
                data["target_id"] = data["targetId"]
            if "target_name" in data and "targetName" not in data:
                data["targetName"] = data["target_name"]
            if "targetName" in data and "target_name" not in data:
                data["target_name"] = data["targetName"]
            if "estimated_time_min" in data and "estimatedTimeMin" not in data:
                data["estimatedTimeMin"] = data["estimated_time_min"]
            if "mw_restored" in data and "mwRestored" not in data:
                data["mwRestored"] = data["mw_restored"]
            if "critical_mw_restored" in data and "criticalMwRestored" not in data:
                data["criticalMwRestored"] = data["critical_mw_restored"]
        return data


class RestorationPlan(BaseModel):
    id: str
    title: str
    method: str  # 'classical_mip', 'quantum_qaoa', 'frontend_heuristic'
    generatedAt: str
    actions: List[RestorationAction]
    projectedMetrics: SimulationMetrics
    computationTimeMs: float
    notes: str


class ClassicalSolveRequest(BaseModel):
    failed_components: Optional[List[str]] = None
    failed_edge_ids: Optional[List[str]] = None
    failed_node_ids: Optional[List[str]] = None
    failed_tower_ids: Optional[List[str]] = None
    backup_capacity_mw: float = Field(default=25.0, ge=0)
    objective_weight_critical: float = Field(default=0.85, ge=0.0, le=1.0)
    max_switching_steps: int = Field(default=8, ge=1)
    time_limit_sec: Optional[float] = Field(default=10.0, ge=0.1)

    # CamelCase aliases
    backupCapacityMw: Optional[float] = None
    objectiveWeightCritical: Optional[float] = None
    maxSwitchingSteps: Optional[int] = None
    timeLimitSec: Optional[float] = None

    @model_validator(mode="before")
    @classmethod
    def sync_classical_req(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "backupCapacityMw" in data and "backup_capacity_mw" not in data:
                data["backup_capacity_mw"] = data["backupCapacityMw"]
            if "objectiveWeightCritical" in data and "objective_weight_critical" not in data:
                data["objective_weight_critical"] = data["objectiveWeightCritical"]
            if "maxSwitchingSteps" in data and "max_switching_steps" not in data:
                data["max_switching_steps"] = data["maxSwitchingSteps"]
            if "timeLimitSec" in data and "time_limit_sec" not in data:
                data["time_limit_sec"] = data["timeLimitSec"]
            if data.get("backup_capacity_mw", 0) < 0:
                raise ValueError("backup_capacity_mw must be >= 0")
        return data


class ClassicalSolverResponse(BaseModel):
    planId: str
    method: str = "classical_mip"
    solverName: str
    optimal: bool
    objectiveValue: float
    runtimeMs: float
    restored_facilities: List[str]
    restored_demand_mw: float
    restored_critical_demand_mw: float
    backup_power_used_mw: float
    constraint_violations: List[str]
    plan: RestorationPlan


class QUBOResponse(BaseModel):
    num_variables: int
    variable_names: List[str]
    variable_descriptions: Dict[str, str]
    linear_coefficients: Dict[str, float]
    quadratic_coefficients: Dict[str, Dict[str, float]]
    constant: float
    formulation_details: Dict[str, Any]


class QAOASolveRequest(BaseModel):
    failed_components: Optional[List[str]] = None
    failed_edge_ids: Optional[List[str]] = None
    failed_node_ids: Optional[List[str]] = None
    failed_tower_ids: Optional[List[str]] = None
    backup_capacity_mw: float = Field(default=25.0, ge=0)
    objective_weight_critical: float = Field(default=0.85, ge=0.0, le=1.0)
    ansatz_depth_p: int = Field(default=2, ge=1, le=5)
    shots: int = Field(default=1024, ge=100, le=8192)
    max_iter: int = Field(default=30, ge=5, le=100)

    # CamelCase aliases
    backupCapacityMw: Optional[float] = None
    objectiveWeightCritical: Optional[float] = None
    ansatzDepthP: Optional[int] = None

    @model_validator(mode="before")
    @classmethod
    def sync_qaoa_req(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "backupCapacityMw" in data and "backup_capacity_mw" not in data:
                data["backup_capacity_mw"] = data["backupCapacityMw"]
            if "objectiveWeightCritical" in data and "objective_weight_critical" not in data:
                data["objective_weight_critical"] = data["objectiveWeightCritical"]
            if "ansatzDepthP" in data and "ansatz_depth_p" not in data:
                data["ansatz_depth_p"] = data["ansatzDepthP"]
            if data.get("backup_capacity_mw", 0) < 0:
                raise ValueError("backup_capacity_mw must be >= 0")
        return data


class QAOASolverResponse(BaseModel):
    planId: str
    method: str = "quantum_qaoa"
    ansatzDepthP: int
    qubitCount: int
    quantumSimulator: str
    costHamiltonianTerms: int
    approximationRatio: float
    runtimeMs: float
    best_bitstring: str
    measurement_distribution: Optional[Dict[str, int]] = None
    restored_facilities: List[str]
    restored_demand_mw: float
    restored_critical_demand_mw: float
    backup_power_used_mw: float
    constraint_violations: List[str]
    objective_value: float
    circuitSummary: Dict[str, int]
    plan: RestorationPlan


class CompareRequest(BaseModel):
    failed_components: Optional[List[str]] = None
    failed_edge_ids: Optional[List[str]] = None
    failed_node_ids: Optional[List[str]] = None
    failed_tower_ids: Optional[List[str]] = None
    backup_power_mw: float = Field(default=25.0, ge=0)
    objective_weight_critical: float = Field(default=0.85, ge=0.0, le=1.0)
    ansatz_depth_p: int = Field(default=2, ge=1, le=4)

    # CamelCase
    backupCapacityMw: Optional[float] = None
    objectiveWeightCritical: Optional[float] = None

    @model_validator(mode="before")
    @classmethod
    def sync_compare_req(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "backupCapacityMw" in data and "backup_power_mw" not in data:
                data["backup_power_mw"] = data["backupCapacityMw"]
            if "objectiveWeightCritical" in data and "objective_weight_critical" not in data:
                data["objective_weight_critical"] = data["objectiveWeightCritical"]
            if data.get("backup_power_mw", 0) < 0:
                raise ValueError("backup_power_mw must be >= 0")
        return data


class CompareResponse(BaseModel):
    scenario_description: str
    failed_components: List[str]
    classical: Dict[str, Any]
    quantum: Dict[str, Any]
    comparison: Dict[str, Any]
    metricsComparison: List[Dict[str, Any]]
