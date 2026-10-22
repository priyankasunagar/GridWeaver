import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add python_backend to sys.path so imports resolve
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from grid_model import get_default_nodes, get_default_edges
from simulation import simulate_grid_state, FailureSimulationRequest
from classical_optimizer import solve_restoration_classical, ClassicalSolveRequest
from qubo_builder import build_restoration_qubo
from qaoa_solver import solve_restoration_qaoa, QAOASolveRequest

client = TestClient(app)


# 1. Test /health
def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("healthy", "degraded")
    assert "version" in data
    assert "solverEngines" in data
    assert "qiskitAerAvailable" in data["solverEngines"]
    assert "classicalMipAvailable" in data["solverEngines"]
    assert data["solverEngines"]["classicalMipAvailable"] is True


# 2. Test /api/grid
def test_grid_topology_endpoint():
    res = client.get("/api/grid")
    assert res.status_code == 200
    data = res.json()
    assert "nodes" in data
    assert "edges" in data
    assert "towers" in data
    assert len(data["nodes"]) >= 8
    assert len(data["edges"]) >= 8

    # Verify key nodes exist
    node_ids = [n["id"] for n in data["nodes"]]
    assert "gen-hydro" in node_ids
    assert "gen-peaker" in node_ids
    assert "sub-main" in node_ids
    assert "sub-dist-north" in node_ids
    assert "sub-dist-south" in node_ids
    assert "fac-hospital" in node_ids
    assert "fac-water" in node_ids
    assert "fac-industrial" in node_ids
    assert "fac-res-north" in node_ids


# 3. Test Single Transmission-Line Failure
def test_single_transmission_line_failure():
    payload = {
        "failed_components": ["line-691"],
        "backup_power_mw": 20.0,
        "priority_mode": "critical_first",
    }
    res = client.post("/api/scenarios/simulate", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert "line-691" in data["failed_components"]
    assert data["metrics"]["active_failures_count"] >= 1
    # Without tie-line closed, South Substation is disconnected from bulk grid
    assert "fac-hospital" in data["disconnected_facilities"]
    assert "fac-water" in data["disconnected_facilities"]
    assert data["affected_critical_demand_mw"] >= 24.0
    # Hospital & Water have on-site generators, so backup is dispatched
    assert data["metrics"]["backup_power_in_use_mw"] > 0


# 4. Test Multiple Failures (Compound bulk outage: sub-main transformer flashover)
def test_multiple_failures():
    payload = {
        "failed_components": ["sub-main", "line-691"],
        "backup_power_mw": 25.0,
        "priority_mode": "critical_first",
    }
    res = client.post("/api/scenarios/simulate", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert len(data["failed_components"]) >= 2
    assert data["metrics"]["active_failures_count"] >= 2
    assert data["affected_demand_mw"] >= 62.0  # Downtown (62 MW) + South corridor (30 MW)
    assert len(data["constraint_violations"]) > 0


# 5. Test Critical Facility Restoration Under Ice Storm Scenario
def test_critical_facility_restoration():
    # Ice storm: Tower T-06 collapse severs Line STL-691
    payload = {
        "failed_components": ["tow-06"],
        "backup_power_mw": 25.0,
        "priority_mode": "critical_first",
    }
    res = client.post("/api/scenarios/simulate", json=payload)
    assert res.status_code == 200
    data = res.json()

    # Verify tower failure cascaded to line-691
    line_691 = next((e for e in data["topology"]["edges"] if e["id"] == "line-691"), None)
    assert line_691 is not None
    assert line_691["status"] == "faulted" or line_691["failed"] is True

    # Critical facilities (Hospital: 10 MW gen, Water: 5 MW gen, EOC: 6 MW gen = 21 MW total on-site backup)
    assert data["metrics"]["critical_demand_served_mw"] >= 21.0


# 6. Test Classical Optimization (OR-Tools MIP)
def test_classical_optimization():
    payload = {
        "failed_components": ["line-691"],
        "backup_capacity_mw": 20.0,
        "objective_weight_critical": 0.85,
        "max_switching_steps": 8,
    }
    res = client.post("/api/restoration/solve-classical", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["method"] == "classical_mip"
    assert data["optimal"] is True
    assert data["objectiveValue"] > 0
    assert "fac-hospital" in data["restored_facilities"]
    assert "fac-water" in data["restored_facilities"]
    assert data["restored_critical_demand_mw"] == 30.0  # 14 + 10 + 6
    assert len(data["plan"]["actions"]) >= 2

    # Check that TL-692 tie-line switch was selected to restore South corridor
    action_types = [a["type"] for a in data["plan"]["actions"]]
    assert "switch_tie" in action_types or "start_backup" in action_types


# 7. Test QUBO Generation
def test_qubo_generation():
    payload = {
        "failed_components": ["line-691"],
        "backup_power_mw": 25.0,
    }
    res = client.post("/api/quantum/qubo", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["num_variables"] >= 10
    assert "variable_names" in data
    assert "linear_coefficients" in data
    assert "quadratic_coefficients" in data
    assert "x_fac_hospital" in data["variable_names"]
    assert "x_switch_tie_692" in data["variable_names"]
    # Linear coefficients should have negative values (rewards for restoring loads)
    assert data["linear_coefficients"]["x_fac_hospital"] < 0


# 8. Test QAOA Execution (Qiskit Aer)
def test_qaoa_execution():
    payload = {
        "failed_components": ["line-691"],
        "backup_capacity_mw": 20.0,
        "objective_weight_critical": 0.85,
        "ansatz_depth_p": 1,
        "shots": 256,
        "max_iter": 5,
    }
    res = client.post("/api/quantum/solve-qaoa", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["method"] == "quantum_qaoa"
    assert data["ansatzDepthP"] == 1
    assert data["qubitCount"] >= 10
    assert "Qiskit Aer" in data["quantumSimulator"]
    assert len(data["best_bitstring"]) == data["qubitCount"]
    assert data["approximationRatio"] > 0.0
    assert data["runtimeMs"] > 0.0
    assert len(data["plan"]["actions"]) >= 1


# 9. Test Classical vs QAOA Comparison
def test_classical_vs_qaoa_comparison():
    payload = {
        "failed_components": ["line-691"],
        "backup_power_mw": 20.0,
        "objective_weight_critical": 0.85,
        "ansatz_depth_p": 1,
    }
    res = client.post("/api/compare", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert "classical" in data
    assert "quantum" in data
    assert "comparison" in data
    assert "metricsComparison" in data
    assert len(data["metricsComparison"]) == 2
    # Verify scientific integrity: quantum advantage is NOT falsely claimed
    assert data["comparison"]["quantum_advantage_demonstrated"] is False


# 10. Test Invalid Inputs & Error Handling
def test_invalid_inputs():
    # Negative backup power must be rejected
    res_neg_backup = client.post("/api/scenarios/simulate", json={"backup_power_mw": -10.0})
    assert res_neg_backup.status_code in (400, 422)

    # Invalid component ID must be rejected
    res_bad_comp = client.post(
        "/api/scenarios/simulate",
        json={"failed_components": ["non_existent_fake_substation_999"]},
    )
    assert res_bad_comp.status_code == 400

    # Negative backup in classical solver
    res_neg_class = client.post(
        "/api/restoration/solve-classical",
        json={"backup_capacity_mw": -5.0},
    )
    assert res_neg_class.status_code in (400, 422)
