# GridWeaver Python FastAPI Backend

A Hybrid Quantum-Classical Framework for Resilient Power Grid Restoration Decision Support.

This backend provides mathematical modeling, graph-theoretic failure simulation, Mixed-Integer Linear Programming (MIP) restoration optimization with Google OR-Tools, Quadratic Unconstrained Binary Optimization (QUBO) formulation, and quantum variational circuit optimization with Qiskit QAOA on the Qiskit Aer simulator.

---

## Architecture Overview

```
python_backend/
├── main.py                 # FastAPI application, CORS configuration, and REST routing
├── models.py               # Pydantic schemas, validation, and serialization models
├── grid_model.py           # NetworkX graph representation of the distribution network
├── simulation.py           # Dynamic failure propagation, BFS reachability & power flow
├── classical_optimizer.py   # OR-Tools CBC/SCIP MIP mathematical restoration optimizer
├── qubo_builder.py         # True QUBO matrix Q generation & penalty objective formulations
├── qaoa_solver.py          # Qiskit QAOA circuit synthesis, parameterized statevector execution
├── compare_service.py      # Classical vs QAOA comparative benchmark engine
├── requirements.txt        # Production dependency specifications
├── README.md               # Backend documentation and quickstart instructions
└── tests/
    └── test_backend.py     # Comprehensive 10-point test suite (Pytest + HTTPX TestClient)
```

---

## Quickstart & Local Setup

### Windows PowerShell Setup

```powershell
cd python_backend
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Linux / macOS Bash Setup

```bash
cd python_backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Once running, visit:
- **Interactive OpenAPI Swagger Docs:** `http://localhost:8000/docs`
- **Alternative ReDoc UI:** `http://localhost:8000/redoc`
- **Health Endpoint:** `http://localhost:8000/health`

---

## API Endpoints & Request Examples

### 1. `GET /health`
Verifies backend connectivity and solver engine availability (`Qiskit Aer` and `OR-Tools MIP`).

**Example Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "solverEngines": {
    "qiskitAerAvailable": true,
    "classicalMipAvailable": true,
    "gpuAcceleration": false
  },
  "qiskit_status": "Operational (AerSimulator statevector)",
  "ortools_status": "Operational (CBC Branch-and-Cut)"
}
```

---

### 2. `GET /api/grid`
Returns the complete electricity distribution network model with nodes (generation, substations, critical facilities, industrial/residential loads), transmission/distribution lines, and transmission towers.

**Example Response:**
```json
{
  "nodes": [
    {
      "id": "gen-hydro",
      "name": "Cascade Gorge Hydro Generating Station (Main Power Plant)",
      "type": "generation",
      "voltage_kv": 500.0,
      "demand_mw": 0.0,
      "generation_mw": 360.0,
      "capacity_mw": 360.0,
      "priority": 100,
      "criticality": 1,
      "status": "operational",
      "backup_availability": false
    },
    {
      "id": "fac-hospital",
      "name": "St. Jude Regional Trauma Center & Hospital (City Hospital)",
      "type": "hospital",
      "demand_mw": 14.0,
      "priority": 99,
      "criticality": 1,
      "backup_capacity_mw": 10.0
    }
  ],
  "edges": [
    {
      "id": "line-691",
      "name": "Sub-Transmission Line STL-691 (69 kV South Backbone)",
      "source": "sub-main",
      "target": "sub-dist-south",
      "capacity_mw": 85.0,
      "status": "operational"
    }
  ],
  "towers": [...]
}
```

---

### 3. `POST /api/scenarios/simulate`
Simulates component outages (transmission line trips, tower collapses, substation trips). Calculates affected critical demand, connected components, and available standby generators.

**Example Request:**
```json
{
  "failed_components": ["line-691"],
  "backup_power_mw": 20.0,
  "priority_mode": "critical_first"
}
```

**Example Response:**
```json
{
  "topology": { "nodes": [...], "edges": [...] },
  "metrics": {
    "total_demand_mw": 199.0,
    "demand_served_mw": 190.0,
    "critical_demand_served_mw": 21.0,
    "unserved_facilities_count": 2,
    "active_failures_count": 1,
    "backup_power_in_use_mw": 21.0,
    "backup_power_remaining_mw": 0.0,
    "constraint_violations": [...]
  },
  "reachability_map": {
    "fac-hospital": false,
    "fac-water": false,
    "sub-dist-south": false
  },
  "disconnected_facilities": ["fac-hospital", "fac-water", "fac-eoc"],
  "affected_critical_demand_mw": 30.0
}
```

---

### 4. `POST /api/restoration/solve-classical`
Executes OR-Tools MIP solver (Branch-and-Cut) to compute an optimal restoration switching sequence, tie-line closures (e.g. TL-692), and generator dispatches.

**Example Request:**
```json
{
  "failed_components": ["line-691"],
  "backup_capacity_mw": 20.0,
  "objective_weight_critical": 0.85,
  "max_switching_steps": 8
}
```

**Example Response:**
```json
{
  "planId": "plan-mip-9a4f210b",
  "method": "classical_mip",
  "solverName": "OR-Tools CBC / SCIP Branch-and-Cut",
  "optimal": true,
  "objectiveValue": 2854.6,
  "runtimeMs": 14.8,
  "restored_facilities": ["fac-hospital", "fac-water", "fac-eoc", "fac-industrial", ...],
  "restored_demand_mw": 199.0,
  "restored_critical_demand_mw": 30.0,
  "backup_power_used_mw": 0.0,
  "plan": {
    "title": "Classical MIP Restoration Sequence (OR-Tools)",
    "actions": [
      {
        "step": 1,
        "type": "isolate_line",
        "targetId": "line-691",
        "description": "Trip circuit breakers at terminal substations to isolate faulted STL-691."
      },
      {
        "step": 2,
        "type": "switch_tie",
        "targetId": "line-692",
        "description": "Synchronize and close inter-substation switch on Tie-Line TL-692 (69 kV)."
      }
    ]
  }
}
```

---

### 5. `POST /api/quantum/qubo`
Generates the Quadratic Unconstrained Binary Optimization (QUBO) model coefficients and interaction matrix Q.

**Example Request:**
```json
{
  "failed_components": ["line-691"],
  "backup_power_mw": 25.0
}
```

**Example Response:**
```json
{
  "num_variables": 12,
  "variable_names": [
    "x_fac_hospital",
    "x_fac_water",
    "x_fac_eoc",
    "x_fac_industrial",
    "x_fac_port",
    "x_fac_res_north",
    "x_fac_downtown",
    "x_switch_tie_692",
    "x_switch_tie_micro",
    "x_bkp_hospital",
    "x_bkp_water",
    "x_bkp_eoc"
  ],
  "linear_coefficients": {
    "x_fac_hospital": -58.21,
    "x_switch_tie_692": 5.0
  },
  "quadratic_coefficients": {
    "x_fac_hospital": {
      "x_switch_tie_692": -72.0,
      "x_bkp_hospital": -72.0
    }
  },
  "constant": 0.0
}
```

---

### 6. `POST /api/quantum/solve-qaoa`
Executes a parameterized QAOA circuit using Qiskit Aer simulator (`AerSimulator`), optimizes $(\vec{\gamma}, \vec{\beta})$ variational angles with COBYLA, and samples the quantum measurement distribution.

**Example Request:**
```json
{
  "failed_components": ["line-691"],
  "backup_capacity_mw": 20.0,
  "objective_weight_critical": 0.85,
  "ansatz_depth_p": 2,
  "shots": 1024,
  "max_iter": 30
}
```

**Example Response:**
```json
{
  "planId": "plan-qaoa-b1e8470a",
  "method": "quantum_qaoa",
  "ansatzDepthP": 2,
  "qubitCount": 12,
  "quantumSimulator": "Qiskit Aer AerSimulator (shots=1024)",
  "costHamiltonianTerms": 28,
  "approximationRatio": 0.935,
  "runtimeMs": 342.5,
  "best_bitstring": "111111110000",
  "restored_demand_mw": 199.0,
  "restored_critical_demand_mw": 30.0,
  "circuitSummary": {
    "numQubits": 12,
    "depth": 36,
    "numGates": 94
  },
  "plan": { ... }
}
```

---

### 7. `POST /api/compare`
Executes both classical MIP and Qiskit QAOA on the exact same outage contingency and returns side-by-side performance benchmarks.

**Example Request:**
```json
{
  "failed_components": ["line-691"],
  "backup_power_mw": 20.0,
  "objective_weight_critical": 0.85,
  "ansatz_depth_p": 2
}
```

---

## Running the Automated Test Suite

```bash
cd python_backend
.venv/bin/pytest tests/test_backend.py -v
```

The 10-point test suite validates:
1. `GET /health` endpoint and solver verification
2. `GET /api/grid` topology and node inventory
3. Single transmission-line failure simulation
4. Compound / multiple outage simulation
5. Critical facility life-safety backup islanding
6. Classical OR-Tools MIP optimization
7. Mathematical QUBO matrix generation
8. Quantum QAOA execution on Qiskit Aer
9. Classical vs QAOA comparative benchmark
10. Input validation (rejection of negative values and invalid IDs)
