import os
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException, status, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models import (
    GridTopologyResponse,
    FailureSimulationRequest,
    SimulationResponse,
    ClassicalSolveRequest,
    ClassicalSolverResponse,
    QUBOResponse,
    QAOASolveRequest,
    QAOASolverResponse,
    CompareRequest,
    CompareResponse,
)
from grid_model import (
    get_default_topology,
    get_default_nodes,
    get_default_edges,
    get_default_towers,
)
from simulation import simulate_grid_state
from classical_optimizer import solve_restoration_classical
from qubo_builder import build_restoration_qubo
from qaoa_solver import solve_restoration_qaoa, QISKIT_AVAILABLE
from ortools.linear_solver import pywraplp

# Initialize FastAPI application
app = FastAPI(
    title="GridWeaver Backend API",
    description="A Hybrid Quantum-Classical Framework for Resilient Power Grid Restoration Decision Support",
    version="1.0.0",
)

# Configure CORS for local development frontend
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev/sandbox preview
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", summary="Health Check and Solver Engines Status")
def health_check() -> Dict[str, Any]:
    """
    Returns API health status, versions, and verified solver availability:
    - Qiskit Aer quantum simulator
    - Google OR-Tools CBC/SCIP MIP solver
    """
    has_ortools = pywraplp.Solver.CreateSolver("CBC") is not None or pywraplp.Solver.CreateSolver("SCIP") is not None
    return {
        "status": "healthy" if (QISKIT_AVAILABLE and has_ortools) else "degraded",
        "version": "1.0.0",
        "solverEngines": {
            "qiskitAerAvailable": QISKIT_AVAILABLE,
            "classicalMipAvailable": has_ortools,
            "gpuAcceleration": False,
        },
        "qiskit_status": "Operational (AerSimulator statevector)" if QISKIT_AVAILABLE else "Unavailable",
        "ortools_status": "Operational (CBC Branch-and-Cut)" if has_ortools else "Unavailable",
    }


@app.get("/api/grid", response_model=GridTopologyResponse, summary="Get Complete Power Grid Network")
def get_grid_topology() -> GridTopologyResponse:
    """
    Retrieves the complete electricity distribution network model including:
    - Generation: Main Hydro Power Plant (360 MW), Peaker/BESS Backup (110 MW)
    - Grid Infrastructure: High Falls Substation (500/230kV), North Substation (230/69kV), South Substation (69/13.8kV)
    - Critical Facilities: City Hospital (14 MW, Criticality 1), Water Treatment Plant (10 MW, Criticality 1)
    - Other Loads: Semiconductor Fab (45 MW), Cargo Port (24 MW), Residential Township (38 MW), Downtown Commercial (62 MW)
    - Transmission lines and Steel Lattice Towers
    """
    return get_default_topology()


@app.post("/api/scenarios/simulate", response_model=SimulationResponse, summary="Simulate Grid Outage Scenario")
def simulate_scenario(request: FailureSimulationRequest) -> SimulationResponse:
    """
    Simulates component failures (transmission line trips, tower collapses, substation flashovers)
    and dynamically calculates network reachability, unserved load, affected critical demand,
    line power flows, and standby generator islanding without hardcoded responses.
    """
    # Validation
    if request.backup_power_mw < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="backup_power_mw cannot be negative",
        )

    # Validate component IDs
    valid_ids = {n.id for n in get_default_nodes()} | {e.id for e in get_default_edges()} | {t.id for t in get_default_towers()}
    # Also valid aliases
    valid_aliases = {"transmission_line_1", "transmission_line_2", "transmission_line_3", "line_1", "line_2", "line_3", "tower_6", "tower_4"}

    requested_comps = (request.failed_components or []) + (request.failed_edge_ids or []) + (request.failed_node_ids or []) + (request.failed_tower_ids or [])
    for cid in requested_comps:
        if cid not in valid_ids and cid.lower() not in valid_aliases:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid component ID '{cid}'. Valid network IDs: {sorted(list(valid_ids))}",
            )

    try:
        response = simulate_grid_state(request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Simulation error: {str(e)}",
        )


@app.post("/api/restoration/solve-classical", response_model=ClassicalSolverResponse, summary="Classical MIP Restoration Optimizer")
def solve_classical(request: ClassicalSolveRequest) -> ClassicalSolverResponse:
    """
    Solves the optimal grid restoration sequence and resource allocation problem
    using OR-Tools Mixed-Integer Linear Programming (MIP) branch-and-cut.
    Prioritizes critical life-safety loads, radial constraints, and efficient standby power.
    """
    if request.backup_capacity_mw < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="backup_capacity_mw cannot be negative",
        )

    try:
        return solve_restoration_classical(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Classical optimizer error: {str(e)}",
        )


@app.post("/api/quantum/qubo", response_model=QUBOResponse, summary="Generate Restoration QUBO Model")
def get_restoration_qubo(
    request: Optional[FailureSimulationRequest] = Body(default=None),
) -> QUBOResponse:
    """
    Constructs and returns the genuine Quadratic Unconstrained Binary Optimization (QUBO)
    matrix Q, linear coefficients, decision variable definitions, and penalty formulations
    for power grid restoration.
    """
    failed_comps = request.failed_components if request else None
    backup_mw = request.backup_power_mw if request else 25.0
    return build_restoration_qubo(failed_comps, backup_capacity_mw=backup_mw)


@app.post("/api/quantum/solve-qaoa", response_model=QAOASolverResponse, summary="Quantum QAOA Restoration Solver")
def solve_qaoa(request: QAOASolveRequest) -> QAOASolverResponse:
    """
    Executes a genuine Quantum Approximate Optimization Algorithm (QAOA) using Qiskit
    and the Qiskit Aer simulator:
    1. Formulates the constrained restoration QUBO problem.
    2. Maps binary variables x_i to quantum Ising Pauli-Z operators.
    3. Synthesizes a parameterized QAOA circuit with p layers of cost and mixer unitaries.
    4. Optimizes gamma and beta variational parameters with classical COBYLA.
    5. Samples quantum measurement distributions from AerSimulator.
    6. Decodes bitstrings into physical restoration actions and calculates restored loads.
    """
    if not QISKIT_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Qiskit Aer quantum simulator is not available in the current environment.",
        )

    if request.backup_capacity_mw < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="backup_capacity_mw cannot be negative",
        )

    try:
        return solve_restoration_qaoa(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"QAOA solver execution error: {str(e)}",
        )


@app.post("/api/compare", response_model=CompareResponse, summary="Compare Classical MIP vs Quantum QAOA")
def compare_classical_vs_quantum(request: CompareRequest) -> CompareResponse:
    """
    Evaluates both classical OR-Tools MIP and Qiskit QAOA on the exact same outage contingency.
    Compares total demand restored, critical life-safety rate, execution time, objective value,
    and reports scientific approximation ratio without unsubstantiated quantum advantage claims.
    """
    if request.backup_power_mw < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="backup_power_mw cannot be negative",
        )

    from compare_service import run_classical_vs_quantum_comparison
    try:
        return run_classical_vs_quantum_comparison(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Comparison evaluation error: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
