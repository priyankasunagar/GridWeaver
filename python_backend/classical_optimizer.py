import time
import uuid
from typing import List, Dict, Optional, Tuple, Any
from ortools.linear_solver import pywraplp

from models import (
    GridNode,
    TransmissionLine,
    TransmissionTower,
    GridTopologyResponse,
    RestorationAction,
    RestorationPlan,
    ClassicalSolveRequest,
    ClassicalSolverResponse,
    SimulationMetrics,
)
from simulation import simulate_grid_state, FailureSimulationRequest
from grid_model import get_default_nodes, get_default_edges, get_default_towers


def solve_restoration_classical(request: ClassicalSolveRequest) -> ClassicalSolverResponse:
    """Solves the grid restoration and switching sequence problem using OR-Tools MIP (CBC/SCIP)."""
    t_start = time.perf_counter()

    # Get current base state
    base_nodes = get_default_nodes()
    base_edges = get_default_edges()
    base_towers = get_default_towers()

    # Apply initial failures if provided
    sim_req = FailureSimulationRequest(
        failed_components=request.failed_components,
        failed_edge_ids=request.failed_edge_ids,
        failed_node_ids=request.failed_node_ids,
        failed_tower_ids=request.failed_tower_ids,
        backup_power_mw=request.backup_capacity_mw,
    )
    initial_sim = simulate_grid_state(sim_req, base_nodes, base_edges, base_towers)
    current_topology = initial_sim.topology

    nodes = current_topology.nodes
    edges = current_topology.edges
    towers = current_topology.towers

    nodes_map = {n.id: n for n in nodes}
    edges_map = {e.id: e for e in edges}

    # Identify load facilities
    facility_nodes = [n for n in nodes if n.demand_mw > 0]
    facility_ids = [n.id for n in facility_nodes]

    # Identify reconfigurable candidate switches / tie-lines
    # line-692: Emergency tie from North to South substation
    # feed-tie-hosp: Microgrid tie from Water plant to Hospital
    candidate_tie_lines = [
        e for e in edges if e.id in ("line-692", "feed-tie-hosp") or e.status == "isolated"
    ]
    candidate_tie_ids = [e.id for e in candidate_tie_lines]

    # Initialize OR-Tools MIP solver
    solver = pywraplp.Solver.CreateSolver("CBC")
    if not solver:
        # Fallback to SCIP or GLOP/BOP if CBC not available
        solver = pywraplp.Solver.CreateSolver("SCIP")
    if not solver:
        raise RuntimeError("No OR-Tools linear solver (CBC/SCIP) available on system.")

    if request.time_limit_sec:
        solver.set_time_limit(int(request.time_limit_sec * 1000))

    # --- Decision Variables ---
    # x[i] in {0, 1}: whether facility i is energized (restored)
    x: Dict[str, pywraplp.Variable] = {}
    # g[i] in {0, 1}: whether facility i is energized via bulk grid
    g: Dict[str, pywraplp.Variable] = {}
    # b[i] in {0, 1}: whether facility i is powered by on-site emergency generator
    b: Dict[str, pywraplp.Variable] = {}

    for fid in facility_ids:
        x[fid] = solver.BoolVar(f"x_{fid}")
        g[fid] = solver.BoolVar(f"g_{fid}")
        b[fid] = solver.BoolVar(f"b_{fid}")

    # y[e] in {0, 1}: whether candidate tie-line e is closed
    y: Dict[str, pywraplp.Variable] = {}
    for eid in candidate_tie_ids:
        y[eid] = solver.BoolVar(f"y_{eid}")

    # s_south in {0, 1}: whether South Substation is energized
    s_south = solver.BoolVar("s_south")

    # --- Constraints ---

    # 1. Mutual exclusivity: facility cannot be fed simultaneously by out-of-phase backup and grid
    for fid in facility_ids:
        node = nodes_map[fid]
        if node.status == "faulted":
            solver.Add(x[fid] == 0)
            solver.Add(g[fid] == 0)
            solver.Add(b[fid] == 0)
        else:
            solver.Add(g[fid] + b[fid] == x[fid])

    # 2. Standby Generator constraints
    for fid in facility_ids:
        node = nodes_map[fid]
        if not node.backup_availability or node.backup_capacity_mw < node.demand_mw or node.status == "faulted":
            solver.Add(b[fid] == 0)

    # Total backup power budget
    total_backup_expr = [
        nodes_map[fid].demand_mw * b[fid] for fid in facility_ids if nodes_map[fid].backup_availability
    ]
    if total_backup_expr:
        solver.Add(sum(total_backup_expr) <= request.backup_capacity_mw)

    # 3. Grid Reachability Logic & Substation Energization
    # Check if North Substation is energized from Hydro or Peaker
    # line-501 (Hydro -> Main Sub), line-201 (Main -> North), line-202 (Peaker -> North)
    line_501_ok = edges_map["line-501"].status == "operational" and not edges_map["line-501"].failed
    line_201_ok = edges_map["line-201"].status == "operational" and not edges_map["line-201"].failed
    line_202_ok = edges_map["line-202"].status == "operational" and not edges_map["line-202"].failed
    sub_main_ok = nodes_map["sub-main"].status != "faulted"
    sub_north_ok = nodes_map["sub-dist-north"].status != "faulted"

    north_sub_energized = sub_north_ok and (
        (line_501_ok and sub_main_ok and line_201_ok) or line_202_ok
    )

    # South Substation can be fed either from:
    # Option A: STL-691 (sub-main -> sub-dist-south)
    # Option B: TL-692 (sub-dist-north -> sub-dist-south) if y["line-692"] is closed and north is energized
    line_691_ok = (
        edges_map["line-691"].status == "operational"
        and not edges_map["line-691"].failed
        and sub_main_ok
        and line_501_ok
    )
    sub_south_ok = nodes_map["sub-dist-south"].status != "faulted"

    if not sub_south_ok:
        solver.Add(s_south == 0)
    elif line_691_ok:
        solver.Add(s_south <= 1)
    elif north_sub_energized and "line-692" in y:
        solver.Add(s_south <= y["line-692"])
    else:
        solver.Add(s_south == 0)

    # Feeders connected to South Substation: fac-hospital, fac-water, fac-eoc
    south_feeders = {
        "fac-hospital": "feed-hosp",
        "fac-water": "feed-water",
        "fac-eoc": "feed-eoc",
    }
    for fid, feeder_id in south_feeders.items():
        if fid in g:
            feeder = edges_map.get(feeder_id)
            feeder_ok = feeder is not None and feeder.status == "operational" and not feeder.failed
            if feeder_ok:
                if fid == "fac-hospital" and "feed-tie-hosp" in y:
                    # Hospital can also receive grid power via Microgrid Tie if Water is energized
                    solver.Add(g["fac-hospital"] <= s_south + y["feed-tie-hosp"])
                    solver.Add(y["feed-tie-hosp"] <= g["fac-water"])
                else:
                    solver.Add(g[fid] <= s_south)
            else:
                if fid == "fac-hospital" and "feed-tie-hosp" in y:
                    solver.Add(g["fac-hospital"] <= y["feed-tie-hosp"])
                    solver.Add(y["feed-tie-hosp"] <= g["fac-water"])
                else:
                    solver.Add(g[fid] == 0)

    # Feeders connected to North Substation: fac-industrial, fac-port, fac-res-north
    north_feeders = {
        "fac-industrial": "feed-ind",
        "fac-port": "feed-port",
        "fac-res-north": "feed-res",
    }
    for fid, feeder_id in north_feeders.items():
        if fid in g:
            feeder = edges_map.get(feeder_id)
            feeder_ok = feeder is not None and feeder.status == "operational" and not feeder.failed
            if north_sub_energized and feeder_ok:
                solver.Add(g[fid] <= 1)
            else:
                solver.Add(g[fid] == 0)

    # Feeder to Downtown (from sub-main)
    feed_dt = edges_map.get("feed-dt")
    feed_dt_ok = feed_dt is not None and feed_dt.status == "operational" and not feed_dt.failed
    if "fac-downtown" in g:
        if sub_main_ok and line_501_ok and feed_dt_ok:
            solver.Add(g["fac-downtown"] <= 1)
        else:
            solver.Add(g["fac-downtown"] == 0)

    # Tie line thermal capacity limit vs total transferred load
    if "line-692" in y:
        # line-692 capacity is 60 MW
        south_demand_expr = sum(nodes_map[fid].demand_mw * g[fid] for fid in south_feeders)
        solver.Add(south_demand_expr <= edges_map["line-692"].capacity_mw)

    # Limit switching steps
    all_switch_steps = list(y.values()) + list(b.values())
    if all_switch_steps:
        solver.Add(sum(all_switch_steps) <= request.max_switching_steps)

    # --- Multi-Objective Optimization ---
    # 1. Critical facilities priority (Tier 1 gets highest weight)
    # 2. Total demand restored
    # 3. Efficient backup power usage (slight penalty to prefer grid)
    # 4. Minimal switching actions
    objective = solver.Objective()
    for fid in facility_ids:
        node = nodes_map[fid]
        # Weighting
        if node.criticality == 1:
            weight = node.priority * (2.5 + request.objective_weight_critical * 2.0)
        elif node.criticality == 2:
            weight = node.priority * 1.5
        else:
            weight = node.priority * 1.0

        objective.SetCoefficient(x[fid], weight * node.demand_mw)
        # Penalize backup generation slightly so primary grid is favored
        objective.SetCoefficient(b[fid], -0.2 * node.demand_mw)

    for eid in candidate_tie_ids:
        # Slight penalty for each physical breaker switching action
        objective.SetCoefficient(y[eid], -2.0)

    objective.SetMaximization()

    # Solve
    status = solver.Solve()
    t_end = time.perf_counter()
    runtime_ms = round((t_end - t_start) * 1000, 2)

    is_optimal = status == pywraplp.Solver.OPTIMAL
    obj_val = round(solver.Objective().Value(), 2) if is_optimal or status == pywraplp.Solver.FEASIBLE else 0.0

    # Extract decisions
    restored_facilities: List[str] = []
    restored_demand = 0.0
    restored_critical_demand = 0.0
    backup_used = 0.0
    constraint_violations: List[str] = []

    for fid in facility_ids:
        node = nodes_map[fid]
        is_rest = bool(x[fid].solution_value() > 0.5) if (is_optimal or status == pywraplp.Solver.FEASIBLE) else False
        is_bkp = bool(b[fid].solution_value() > 0.5) if (is_optimal or status == pywraplp.Solver.FEASIBLE) else False

        if is_rest:
            restored_facilities.append(fid)
            restored_demand += node.demand_mw
            if node.criticality == 1:
                restored_critical_demand += node.demand_mw
            if is_bkp:
                backup_used += node.demand_mw
        else:
            if node.criticality == 1:
                constraint_violations.append(f"Unserved Critical Load: {node.name} ({node.demand_mw} MW blackout)")
            else:
                constraint_violations.append(f"Unserved Load: {node.name} ({node.demand_mw} MW blackout)")

    # Build sequence of actions
    actions: List[RestorationAction] = []
    step_num = 1

    # 1. Isolate faulted lines
    faulted_edges = [e for e in edges if e.status == "faulted" or e.failed]
    for fe in faulted_edges:
        actions.append(
            RestorationAction(
                id=f"act-{step_num}",
                step=step_num,
                type="isolate_line",
                targetId=fe.id,
                targetName=fe.name,
                description=f"Trip circuit breakers at terminal substations to isolate faulted {fe.name} and clear busbars.",
                estimatedTimeMin=4.0,
                mwRestored=0.0,
                criticalMwRestored=0.0,
                status="pending",
            )
        )
        step_num += 1

    # 2. Switch tie-lines
    for eid in candidate_tie_ids:
        if y[eid].solution_value() > 0.5:
            tie_line = edges_map[eid]
            actions.append(
                RestorationAction(
                    id=f"act-{step_num}",
                    step=step_num,
                    type="switch_tie",
                    targetId=tie_line.id,
                    targetName=tie_line.name,
                    description=f"Synchronize and close inter-substation switch on {tie_line.name} ({tie_line.voltage_kv} kV) to restore downstream corridor.",
                    estimatedTimeMin=8.0,
                    mwRestored=30.0 if eid == "line-692" else 14.0,
                    criticalMwRestored=30.0 if eid == "line-692" else 14.0,
                    status="pending",
                )
            )
            step_num += 1

    # 3. Dispatch backup generators
    for fid in facility_ids:
        if b[fid].solution_value() > 0.5:
            node = nodes_map[fid]
            actions.append(
                RestorationAction(
                    id=f"act-{step_num}",
                    step=step_num,
                    type="start_backup",
                    targetId=node.id,
                    targetName=node.name,
                    description=f"Black-start on-site emergency generator ({node.backup_capacity_mw} MW) for {node.name} and engage automatic transfer switch.",
                    estimatedTimeMin=3.0,
                    mwRestored=node.demand_mw,
                    criticalMwRestored=node.demand_mw if node.criticality == 1 else 0.0,
                    status="pending",
                )
            )
            step_num += 1

    # Total grid demand
    total_demand = sum(n.demand_mw for n in facility_nodes)
    total_crit_demand = sum(n.demand_mw for n in facility_nodes if n.criticality == 1)

    projected_metrics = SimulationMetrics(
        total_capacity_mw=sum(n.capacity_mw for n in nodes if n.type == "generation"),
        total_demand_mw=total_demand,
        demand_served_mw=round(restored_demand, 1),
        critical_demand_total_mw=total_crit_demand,
        critical_demand_served_mw=round(restored_critical_demand, 1),
        unserved_facilities_count=len(facility_ids) - len(restored_facilities),
        total_facilities_count=len(facility_ids),
        active_failures_count=len(faulted_edges),
        backup_power_in_use_mw=round(backup_used, 1),
        backup_power_remaining_mw=round(max(0.0, request.backup_capacity_mw - backup_used), 1),
        total_backup_capacity_mw=request.backup_capacity_mw,
        constraint_violations=constraint_violations,
        restoration_percentage=round((restored_demand / total_demand * 100), 1) if total_demand > 0 else 100.0,
        critical_restoration_percentage=(
            round((restored_critical_demand / total_crit_demand * 100), 1) if total_crit_demand > 0 else 100.0
        ),
    )

    plan = RestorationPlan(
        id=f"plan-mip-{uuid.uuid4().hex[:8]}",
        title="Classical MIP Restoration Sequence (OR-Tools)",
        method="classical_mip",
        generatedAt=time.strftime("%H:%M:%S"),
        actions=actions,
        projectedMetrics=projected_metrics,
        computationTimeMs=runtime_ms,
        notes=f"Solved with OR-Tools CBC/SCIP Branch-and-Cut. Optimal={is_optimal}, Objective={obj_val}.",
    )

    return ClassicalSolverResponse(
        planId=plan.id,
        method="classical_mip",
        solverName="OR-Tools CBC / SCIP Branch-and-Cut",
        optimal=is_optimal,
        objectiveValue=obj_val,
        runtimeMs=runtime_ms,
        restored_facilities=restored_facilities,
        restored_demand_mw=round(restored_demand, 1),
        restored_critical_demand_mw=round(restored_critical_demand, 1),
        backup_power_used_mw=round(backup_used, 1),
        constraint_violations=constraint_violations,
        plan=plan,
    )
