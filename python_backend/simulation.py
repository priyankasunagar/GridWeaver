import copy
from typing import List, Dict, Set, Optional, Tuple, Any
import networkx as nx

from models import (
    GridNode,
    TransmissionLine,
    TransmissionTower,
    GridTopologyResponse,
    SimulationMetrics,
    SimulationResponse,
    FailureSimulationRequest,
)
from grid_model import get_default_nodes, get_default_edges, get_default_towers, build_networkx_graph


def normalize_component_id(comp_id: str, edges: List[TransmissionLine], nodes: List[GridNode], towers: List[TransmissionTower]) -> Optional[str]:
    """Helper to match human-readable or alias IDs like 'transmission_line_1' to real IDs."""
    comp_lower = comp_id.lower().strip()
    
    # Exact match check
    for e in edges:
        if e.id.lower() == comp_lower or e.name.lower() == comp_lower:
            return e.id
    for n in nodes:
        if n.id.lower() == comp_lower or n.name.lower() == comp_lower:
            return n.id
    for t in towers:
        if t.id.lower() == comp_lower or t.name.lower() == comp_lower:
            return t.id

    # Common aliases
    aliases = {
        "transmission_line_1": "line-691",
        "transmission_line_2": "line-201",
        "transmission_line_3": "line-501",
        "line_1": "line-691",
        "line_2": "line-201",
        "line_3": "line-501",
        "hospital": "fac-hospital",
        "water": "fac-water",
        "water_treatment": "fac-water",
        "water_treatment_plant": "fac-water",
        "eoc": "fac-eoc",
        "emergency_dispatch": "fac-eoc",
        "north_substation": "sub-dist-north",
        "south_substation": "sub-dist-south",
        "main_substation": "sub-main",
        "main_power_plant": "gen-hydro",
        "hydro": "gen-hydro",
        "backup_generator": "gen-peaker",
        "peaker": "gen-peaker",
        "tower_1": "tow-01",
        "tower_6": "tow-06",
        "tower_4": "tow-04",
    }
    return aliases.get(comp_lower, comp_id)


def simulate_grid_state(
    request: FailureSimulationRequest,
    base_nodes: Optional[List[GridNode]] = None,
    base_edges: Optional[List[TransmissionLine]] = None,
    base_towers: Optional[List[TransmissionTower]] = None,
) -> SimulationResponse:
    """Dynamically simulates grid power flow, reachability, failures, and backup power dispatch."""
    nodes = copy.deepcopy(base_nodes or get_default_nodes())
    edges = copy.deepcopy(base_edges or get_default_edges())
    towers = copy.deepcopy(base_towers or get_default_towers())

    # Map of all IDs for validation
    valid_ids: Set[str] = {n.id for n in nodes} | {e.id for e in edges} | {t.id for t in towers}

    # Aggregate all requested failed IDs
    failed_target_ids: Set[str] = set()
    if request.failed_components:
        for cid in request.failed_components:
            normalized = normalize_component_id(cid, edges, nodes, towers)
            if normalized:
                failed_target_ids.add(normalized)
    if request.failed_node_ids:
        for nid in request.failed_node_ids:
            normalized = normalize_component_id(nid, edges, nodes, towers)
            if normalized:
                failed_target_ids.add(normalized)
    if request.failed_edge_ids:
        for eid in request.failed_edge_ids:
            normalized = normalize_component_id(eid, edges, nodes, towers)
            if normalized:
                failed_target_ids.add(normalized)
    if request.failed_tower_ids:
        for tid in request.failed_tower_ids:
            normalized = normalize_component_id(tid, edges, nodes, towers)
            if normalized:
                failed_target_ids.add(normalized)

    # 1. Update towers: if a tower is faulted, any transmission line it carries also faults!
    towers_map = {t.id: t for t in towers}
    edges_map = {e.id: e for e in edges}
    nodes_map = {n.id: n for n in nodes}

    for tower in towers:
        if tower.id in failed_target_ids:
            tower.status = "faulted"
            # Sever lines supported by this tower
            for line_id in tower.line_ids:
                if line_id in edges_map:
                    edges_map[line_id].status = "faulted"
                    edges_map[line_id].failed = True

    # 2. Update transmission lines
    for edge in edges:
        if edge.id in failed_target_ids:
            edge.status = "faulted"
            edge.failed = True
        elif edge.status != "faulted" and edge.status != "isolated":
            edge.failed = False

    # 3. Update nodes
    for node in nodes:
        if node.id in failed_target_ids:
            node.status = "faulted"
            node.is_energized = False
            node.power_served_mw = 0.0

    # 4. Construct NetworkX graph with operational transmission lines
    G = nx.Graph()
    for n in nodes:
        G.add_node(n.id)

    # Only operational and restored lines transmit power, and neither terminal node can be faulted
    for edge in edges:
        src_node = nodes_map.get(edge.source)
        tgt_node = nodes_map.get(edge.target)
        src_ok = src_node is not None and src_node.status != "faulted"
        tgt_ok = tgt_node is not None and tgt_node.status != "faulted"

        if edge.status in ("operational", "restored") and not edge.failed and src_ok and tgt_ok:
            G.add_edge(edge.source, edge.target, id=edge.id, capacity=edge.capacity_mw)

    # 5. BFS Reachability from active operational generation sources
    active_generators = [
        n.id for n in nodes if n.type == "generation" and n.status == "operational"
    ]

    reachable_from_gen: Set[str] = set()
    for gen_id in active_generators:
        if gen_id in G:
            reachable_from_gen.add(gen_id)
            # Find all reachable nodes in this connected component
            subgraph_nodes = nx.node_connected_component(G, gen_id)
            for target_id in subgraph_nodes:
                target_node = nodes_map.get(target_id)
                if target_node and target_node.status != "faulted":
                    reachable_from_gen.add(target_id)

    # 6. Evaluate load service, backup power, and constraint violations
    total_demand_mw = 0.0
    demand_served_mw = 0.0
    critical_demand_total_mw = 0.0
    critical_demand_served_mw = 0.0
    unserved_count = 0
    total_facilities_count = 0
    backup_used_mw = 0.0
    available_backup = float(request.backup_power_mw)
    constraint_violations: List[str] = []
    disconnected_facilities: List[str] = []
    reachable_facilities: List[str] = []

    # Sort load facilities for dispatch (criticality tier 1 first, then priority)
    load_nodes = [n for n in nodes if n.demand_mw > 0]
    if request.priority_mode == "critical_first":
        load_nodes.sort(key=lambda n: (n.criticality, -n.priority))
    else:
        load_nodes.sort(key=lambda n: -n.priority)

    reachability_map: Dict[str, bool] = {}
    for node in nodes:
        is_reachable = node.id in reachable_from_gen
        reachability_map[node.id] = is_reachable

        if node.demand_mw > 0:
            total_facilities_count += 1
            total_demand_mw += node.demand_mw
            if node.criticality == 1:
                critical_demand_total_mw += node.demand_mw

            if is_reachable and node.status != "faulted":
                # Energized from primary grid
                reachable_facilities.append(node.id)
                node.is_energized = True
                node.power_served_mw = node.demand_mw
                node.backup_active = False
                node.status = "operational"
                demand_served_mw += node.demand_mw
                if node.criticality == 1:
                    critical_demand_served_mw += node.demand_mw
            else:
                # Disconnected from primary grid
                disconnected_facilities.append(node.id)
                # Check emergency on-site generator dispatch
                potential_backup = min(node.backup_capacity_mw, available_backup)
                if potential_backup >= node.demand_mw and node.status != "faulted":
                    # Fully energized by standby generator (Islanded)
                    node.is_energized = True
                    node.power_served_mw = node.demand_mw
                    node.backup_active = True
                    node.status = "islanded_backup"
                    demand_served_mw += node.demand_mw
                    backup_used_mw += node.demand_mw
                    available_backup -= node.demand_mw
                    if node.criticality == 1:
                        critical_demand_served_mw += node.demand_mw
                elif potential_backup > 0 and node.status != "faulted":
                    # Partial backup power
                    node.is_energized = True
                    node.power_served_mw = potential_backup
                    node.backup_active = True
                    node.status = "islanded_backup"
                    demand_served_mw += potential_backup
                    backup_used_mw += potential_backup
                    available_backup -= potential_backup
                    if node.criticality == 1:
                        critical_demand_served_mw += potential_backup
                    unserved_count += 1
                    constraint_violations.append(
                        f"{node.name}: Partial backup only ({potential_backup:.1f} / {node.demand_mw:.1f} MW served)"
                    )
                else:
                    # Complete Blackout
                    node.is_energized = False
                    node.power_served_mw = 0.0
                    node.backup_active = False
                    if node.status != "faulted":
                        node.status = "isolated"
                    unserved_count += 1
                    tier_str = "Critical Tier-1" if node.criticality == 1 else "Non-critical"
                    constraint_violations.append(
                        f"{node.name}: Unserved {tier_str} load ({node.demand_mw:.1f} MW blackout)"
                    )
        else:
            # Generation or substation
            node.is_energized = is_reachable
            node.power_served_mw = 0.0

    # 7. Calculate realistic power flow through lines
    power_flow_map: Dict[str, float] = {}
    for edge in edges:
        is_active = (
            edge.status in ("operational", "restored")
            and not edge.failed
            and (edge.source in reachable_from_gen or edge.target in reachable_from_gen)
        )
        if is_active:
            target_node = nodes_map.get(edge.target)
            if target_node and target_node.demand_mw > 0 and target_node.is_energized and not target_node.backup_active:
                flow = target_node.demand_mw
            else:
                flow = min(edge.capacity_mw * 0.65, 120.0)
            edge.current_flow_mw = round(flow, 1)
            power_flow_map[edge.id] = edge.current_flow_mw

            if edge.current_flow_mw > edge.capacity_mw:
                constraint_violations.append(
                    f"Line Overload: {edge.name} flow {edge.current_flow_mw} MW exceeds thermal capacity {edge.capacity_mw} MW"
                )
        else:
            edge.current_flow_mw = 0.0
            power_flow_map[edge.id] = 0.0

    # 8. Compute summary metrics
    total_capacity_mw = sum(
        n.capacity_mw for n in nodes if n.type == "generation" and n.status == "operational"
    )
    available_gen_mw = sum(
        n.capacity_mw for n in nodes if n.type == "generation" and n.status == "operational" and n.id in reachable_from_gen
    )

    failed_nodes_count = sum(1 for n in nodes if n.status == "faulted")
    failed_edges_count = sum(1 for e in edges if e.status == "faulted" or e.failed)
    failed_towers_count = sum(1 for t in towers if t.status in ("faulted", "damaged"))
    active_failures_count = failed_nodes_count + failed_edges_count + failed_towers_count

    restoration_pct = round((demand_served_mw / total_demand_mw * 100.0), 1) if total_demand_mw > 0 else 100.0
    critical_restoration_pct = (
        round((critical_demand_served_mw / critical_demand_total_mw * 100.0), 1)
        if critical_demand_total_mw > 0
        else 100.0
    )

    affected_demand = sum(nodes_map[fid].demand_mw for fid in disconnected_facilities if fid in nodes_map)
    affected_crit_demand = sum(
        nodes_map[fid].demand_mw for fid in disconnected_facilities if fid in nodes_map and nodes_map[fid].criticality == 1
    )

    metrics = SimulationMetrics(
        total_capacity_mw=total_capacity_mw,
        total_demand_mw=total_demand_mw,
        demand_served_mw=round(demand_served_mw, 1),
        critical_demand_total_mw=critical_demand_total_mw,
        critical_demand_served_mw=round(critical_demand_served_mw, 1),
        unserved_facilities_count=unserved_count,
        total_facilities_count=total_facilities_count,
        active_failures_count=active_failures_count,
        backup_power_in_use_mw=round(backup_used_mw, 1),
        backup_power_remaining_mw=round(available_backup, 1),
        total_backup_capacity_mw=float(request.backup_power_mw),
        constraint_violations=constraint_violations,
        restoration_percentage=restoration_pct,
        critical_restoration_percentage=critical_restoration_pct,
    )

    # Sync camelCase fields for frontend
    for n in nodes:
        n.voltageKv = n.voltage_kv
        n.demandMw = n.demand_mw
        n.generationCapacityMw = n.generation_mw
        n.priorityScore = n.priority
        n.backupGenCapacityMw = n.backup_capacity_mw
        n.backupGenActive = n.backup_active
        n.powerServedMw = n.power_served_mw
        n.isEnergized = n.is_energized

    for e in edges:
        e.sourceNodeId = e.source
        e.targetNodeId = e.target
        e.voltageKv = e.voltage_kv
        e.capacityMw = e.capacity_mw
        e.currentFlowMw = e.current_flow_mw
        e.lengthKm = e.distance_km
        e.towerIds = e.tower_ids

    for t in towers:
        t.voltageKv = t.voltage_kv
        t.lineIds = t.line_ids
        t.hasAviationMarkings = t.has_aviation_markings

    return SimulationResponse(
        topology=GridTopologyResponse(nodes=nodes, edges=edges, towers=towers, metrics=metrics),
        metrics=metrics,
        reachability_map=reachability_map,
        reachabilityMap=reachability_map,
        power_flow_map=power_flow_map,
        powerFlowMap=power_flow_map,
        failed_components=list(failed_target_ids),
        disconnected_facilities=disconnected_facilities,
        affected_demand_mw=round(affected_demand, 1),
        affected_critical_demand_mw=round(affected_crit_demand, 1),
        available_generation_mw=round(available_gen_mw, 1),
        available_backup_mw=round(available_backup, 1),
        reachable_facilities=reachable_facilities,
        constraint_violations=constraint_violations,
    )
