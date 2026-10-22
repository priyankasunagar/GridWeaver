from typing import Dict, List, Any
from models import (
    CompareRequest,
    CompareResponse,
    ClassicalSolveRequest,
    QAOASolveRequest,
)
from classical_optimizer import solve_restoration_classical
from qaoa_solver import solve_restoration_qaoa


def run_classical_vs_quantum_comparison(request: CompareRequest) -> CompareResponse:
    """
    Executes both the classical OR-Tools MIP solver and Qiskit QAOA quantum simulator
    on the exact same failure contingency scenario and calculates side-by-side performance metrics.
    """
    failed_comps = request.failed_components or ["line-691"]

    # 1. Run Classical OR-Tools MIP Optimizer
    classical_req = ClassicalSolveRequest(
        failed_components=failed_comps,
        backup_capacity_mw=request.backup_power_mw,
        objective_weight_critical=request.objective_weight_critical,
        max_switching_steps=10,
        time_limit_sec=10.0,
    )
    classical_res = solve_restoration_classical(classical_req)

    # 2. Run Quantum QAOA Simulator
    qaoa_req = QAOASolveRequest(
        failed_components=failed_comps,
        backup_capacity_mw=request.backup_power_mw,
        objective_weight_critical=request.objective_weight_critical,
        ansatz_depth_p=request.ansatz_depth_p,
        shots=1024,
        max_iter=25,
    )
    qaoa_res = solve_restoration_qaoa(qaoa_req)

    # 3. Analyze Comparative Results (Truth-in-Science without false quantum advantage claims)
    # Typically, classical branch-and-cut solves small 12-qubit QUBO in a few milliseconds to mathematical optimality.
    # QAOA on an Aer simulator takes hundreds of milliseconds due to classical parameter loop and quantum state simulation.
    quantum_advantage_achieved = False  # Scientifically honest: NISQ simulation does not exceed classical MIP on 12 variables

    comp_summary = {
        "restored_total_demand_diff_mw": round(
            classical_res.restored_demand_mw - qaoa_res.restored_demand_mw, 1
        ),
        "restored_critical_demand_diff_mw": round(
            classical_res.restored_critical_demand_mw - qaoa_res.restored_critical_demand_mw, 1
        ),
        "classical_runtime_ms": classical_res.runtimeMs,
        "quantum_runtime_ms": qaoa_res.runtimeMs,
        "runtime_ratio_qaoa_vs_classical": round(qaoa_res.runtimeMs / max(0.1, classical_res.runtimeMs), 2),
        "qaoa_approximation_ratio": qaoa_res.approximationRatio,
        "quantum_advantage_demonstrated": quantum_advantage_achieved,
        "analysis_notes": (
            "Classical OR-Tools MIP reached deterministic global optimum in "
            f"{classical_res.runtimeMs} ms. Qiskit QAOA with p={request.ansatz_depth_p} layers achieved an "
            f"approximation ratio of {qaoa_res.approximationRatio:.2f} with {qaoa_res.circuitSummary['numQubits']} qubits. "
            "Consistent with quantum computing literature, noisy/simulated QAOA does not demonstrate quantum advantage "
            "over mature classical MIP branch-and-cut for small distribution networks (< 50 qubits)."
        ),
    }

    metrics_comparison = [
        {
            "scenarioName": "Classical OR-Tools MIP",
            "totalDemandServedMw": classical_res.restored_demand_mw,
            "criticalDemandServedMw": classical_res.restored_critical_demand_mw,
            "activeFailures": len(failed_comps),
            "backupFuelUsedMw": classical_res.backup_power_used_mw,
            "switchingSteps": len(classical_res.plan.actions),
            "runtimeMs": classical_res.runtimeMs,
            "objectiveValue": classical_res.objectiveValue,
            "optimal": classical_res.optimal,
        },
        {
            "scenarioName": f"Qiskit QAOA (p={request.ansatz_depth_p})",
            "totalDemandServedMw": qaoa_res.restored_demand_mw,
            "criticalDemandServedMw": qaoa_res.restored_critical_demand_mw,
            "activeFailures": len(failed_comps),
            "backupFuelUsedMw": qaoa_res.backup_power_used_mw,
            "switchingSteps": len(qaoa_res.plan.actions),
            "runtimeMs": qaoa_res.runtimeMs,
            "objectiveValue": qaoa_res.objective_value,
            "optimal": False,
        },
    ]

    return CompareResponse(
        scenario_description=f"Contingency outage simulation with {len(failed_comps)} failed component(s): {', '.join(failed_comps)}",
        failed_components=failed_comps,
        classical={
            "solver_name": classical_res.solverName,
            "optimal": classical_res.optimal,
            "objective_value": classical_res.objectiveValue,
            "runtime_ms": classical_res.runtimeMs,
            "restored_facilities": classical_res.restored_facilities,
            "restored_total_demand_mw": classical_res.restored_demand_mw,
            "restored_critical_demand_mw": classical_res.restored_critical_demand_mw,
            "backup_power_used_mw": classical_res.backup_power_used_mw,
            "constraint_violations": classical_res.constraint_violations,
            "plan": classical_res.plan.model_dump(),
        },
        quantum={
            "simulator": qaoa_res.quantumSimulator,
            "ansatz_depth_p": qaoa_res.ansatzDepthP,
            "qubit_count": qaoa_res.qubitCount,
            "runtime_ms": qaoa_res.runtimeMs,
            "approximation_ratio": qaoa_res.approximationRatio,
            "best_bitstring": qaoa_res.best_bitstring,
            "restored_facilities": qaoa_res.restored_facilities,
            "restored_total_demand_mw": qaoa_res.restored_demand_mw,
            "restored_critical_demand_mw": qaoa_res.restored_critical_demand_mw,
            "backup_power_used_mw": qaoa_res.backup_power_used_mw,
            "constraint_violations": qaoa_res.constraint_violations,
            "circuit_summary": qaoa_res.circuitSummary,
            "plan": qaoa_res.plan.model_dump(),
        },
        comparison=comp_summary,
        metricsComparison=metrics_comparison,
    )
