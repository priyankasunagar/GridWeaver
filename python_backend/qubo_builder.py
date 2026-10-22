import numpy as np
from typing import Dict, List, Tuple, Any, Optional
from models import QUBOResponse, GridNode, TransmissionLine


def build_restoration_qubo(
    failed_components: Optional[List[str]] = None,
    backup_capacity_mw: float = 25.0,
    criticality_weight: float = 0.85,
) -> QUBOResponse:
    """
    Constructs a genuine Quadratic Unconstrained Binary Optimization (QUBO) model
    for resilient power grid restoration.

    Binary variables represent restoration decisions:
      x_i in {0, 1}:
        x_0: fac-hospital    (St. Jude Trauma Hospital, 14 MW, Criticality 1)
        x_1: fac-water       (Highland Water Treatment, 10 MW, Criticality 1)
        x_2: fac-eoc         (Metro Emergency 911 Dispatch, 6 MW, Criticality 1)
        x_3: fac-industrial  (Apex Semiconductor Fab, 45 MW, Criticality 2)
        x_4: fac-port        (Cargo Port & Container Terminal, 24 MW, Criticality 2)
        x_5: fac-res-north   (North Ridge Residential, 38 MW, Criticality 3)
        x_6: fac-downtown    (Downtown Commercial Core, 62 MW, Criticality 3)
        x_7: switch_tie_692  (Close Tie-Line TL-692 69kV between North & South)
        x_8: switch_tie_micro(Close Microgrid Tie MF-01 between Water & Hospital)
        x_9: bkp_hospital    (Dispatch Standby Generator at Hospital, 10 MW)
        x_10: bkp_water      (Dispatch Standby Generator at Water Plant, 5 MW)
        x_11: bkp_eoc        (Dispatch Standby Generator at EOC Bunker, 6 MW)
    """
    variable_names = [
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
        "x_bkp_eoc",
    ]

    var_index = {name: idx for idx, name in enumerate(variable_names)}
    n_vars = len(variable_names)

    variable_descriptions = {
        "x_fac_hospital": "Energize and restore St. Jude Regional Trauma Center (14 MW, Critical Tier-1)",
        "x_fac_water": "Energize and restore Highland Municipal Water Treatment Plant (10 MW, Critical Tier-1)",
        "x_fac_eoc": "Energize and restore Metro Emergency Operations Center & 911 Dispatch (6 MW, Critical Tier-1)",
        "x_fac_industrial": "Energize and restore Apex Semiconductor Fabrication Complex (45 MW, Tier-2)",
        "x_fac_port": "Energize and restore Riverpoint Cargo Port & Container Logistics (24 MW, Tier-2)",
        "x_fac_res_north": "Energize and restore North Ridge Residential Township (38 MW, Tier-3)",
        "x_fac_downtown": "Energize and restore Metro Center Commercial District (62 MW, Tier-3)",
        "x_switch_tie_692": "Close Breaker on 69 kV Inter-Substation Tie-Line TL-692 (North -> South Substation)",
        "x_switch_tie_micro": "Close Microgrid Transfer Switch MF-01 bridging Water Plant and Hospital loops",
        "x_bkp_hospital": "Black-start 10 MW On-site Emergency Diesel Generator at Hospital",
        "x_bkp_water": "Black-start 5 MW On-site Emergency Standby Generator at Water Treatment Plant",
        "x_bkp_eoc": "Black-start 6 MW On-site Emergency Standby Generator at EOC Bunker",
    }

    # Demand loads (MW) and baseline priorities
    facility_specs = {
        "x_fac_hospital": {"demand": 14.0, "priority": 99, "tier": 1},
        "x_fac_water": {"demand": 10.0, "priority": 96, "tier": 1},
        "x_fac_eoc": {"demand": 6.0, "priority": 98, "tier": 1},
        "x_fac_industrial": {"demand": 45.0, "priority": 65, "tier": 2},
        "x_fac_port": {"demand": 24.0, "priority": 60, "tier": 2},
        "x_fac_res_north": {"demand": 38.0, "priority": 40, "tier": 3},
        "x_fac_downtown": {"demand": 62.0, "priority": 50, "tier": 3},
    }

    # Backup generator specs
    backup_specs = {
        "x_bkp_hospital": {"target": "x_fac_hospital", "capacity": 10.0, "demand": 14.0},
        "x_bkp_water": {"target": "x_fac_water", "capacity": 5.0, "demand": 10.0},
        "x_bkp_eoc": {"target": "x_fac_eoc", "capacity": 6.0, "demand": 6.0},
    }

    # Check failure conditions
    fails = [f.lower() for f in (failed_components or [])]
    south_backbone_failed = any(
        f in ("line-691", "stl-691", "tow-06", "tow-07", "transmission_line_1", "line_1")
        for f in fails
    )
    north_inter_failed = any(
        f in ("line-201", "tl-201", "tow-04", "tow-05", "transmission_line_2") for f in fails
    )
    bulk_hydro_failed = any(
        f in ("line-501", "tl-501", "gen-hydro", "sub-main", "transmission_line_3") for f in fails
    )

    # Initialize Q matrix (n x n) and constant offset
    Q = np.zeros((n_vars, n_vars), dtype=float)
    constant_offset = 0.0

    # Multipliers & Penalty Weights
    lambda_conn = 120.0     # Enforces grid connection path
    lambda_excl = 85.0      # Enforces mutual exclusivity (islanded backup vs grid)
    lambda_budget = 4.0     # Standby generator total budget penalty
    lambda_switch = 5.0     # Small cost per switching action

    # --- 1. Objective: Maximizing Demand Restored (Negative Diagonal Rewards in Min QUBO) ---
    for var_name, spec in facility_specs.items():
        idx = var_index[var_name]
        d = spec["demand"]
        p = spec["priority"]
        t = spec["tier"]

        if t == 1:
            tier_mult = 2.5 + criticality_weight * 2.0  # Life-safety premium
        elif t == 2:
            tier_mult = 1.3
        else:
            tier_mult = 1.0

        reward = p * tier_mult * d * 0.1
        Q[idx, idx] -= reward

    # --- 2. Switching Cost (Small penalty per action to avoid unnecessary breaker operations) ---
    for s_name in ("x_switch_tie_692", "x_switch_tie_micro"):
        s_idx = var_index[s_name]
        Q[s_idx, s_idx] += lambda_switch

    # --- 3. Connectivity Constraints for South Corridor Facilities ---
    # If South backbone line-691 is faulted:
    # Hospital, Water, and EOC require Tie-Line TL-692 (x_switch_tie_692) OR on-site backup generator!
    south_facilities = [
        ("x_fac_hospital", "x_bkp_hospital"),
        ("x_fac_water", "x_bkp_water"),
        ("x_fac_eoc", "x_bkp_eoc"),
    ]

    tie_692_idx = var_index["x_switch_tie_692"]
    tie_micro_idx = var_index["x_switch_tie_micro"]

    if south_backbone_failed:
        for f_name, b_name in south_facilities:
            f_idx = var_index[f_name]
            b_idx = var_index[b_name]

            # Facility requires (x_tie692 OR x_bkp)
            # Penalty for being energized without tie692 and without backup:
            # (x_f * (1 - x_tie692) * (1 - x_bkp))
            # In quadratic expansion: x_f - x_f*x_tie692 - x_f*x_bkp
            Q[f_idx, f_idx] += lambda_conn
            # Pairwise interaction
            Q[min(f_idx, tie_692_idx), max(f_idx, tie_692_idx)] -= lambda_conn * 0.6
            Q[min(f_idx, b_idx), max(f_idx, b_idx)] -= lambda_conn * 0.6

    # Microgrid tie synergy: if Water is restored and microgrid tie is closed, hospital gets secondary link
    hosp_idx = var_index["x_fac_hospital"]
    water_idx = var_index["x_fac_water"]
    Q[min(hosp_idx, tie_micro_idx), max(hosp_idx, tie_micro_idx)] -= 15.0
    Q[min(water_idx, tie_micro_idx), max(water_idx, tie_micro_idx)] -= 10.0

    # --- 4. Mutual Exclusivity: Standby Generator vs Grid Energization ---
    # Running both concurrently incurs a penalty
    for f_name, b_name in south_facilities:
        b_idx = var_index[b_name]
        # If tie 692 is closed AND backup is dispatched simultaneously:
        Q[min(tie_692_idx, b_idx), max(tie_692_idx, b_idx)] += lambda_excl * 0.5
        # Running backup when facility is not restored is penalized
        f_idx = var_index[f_name]
        # x_bkp * (1 - x_f) = x_bkp - x_bkp * x_f
        Q[b_idx, b_idx] += 30.0
        Q[min(f_idx, b_idx), max(f_idx, b_idx)] -= 30.0

    # --- 5. Standby Generator Fleet Budget Constraint ---
    # Total dispatched backup <= backup_capacity_mw
    # Penalty term: lambda_budget * (sum(P_i * b_i) - B_max)^2
    # Quadratic expansion: sum_i P_i^2 b_i + 2 sum_{i < j} P_i P_j b_i b_j - 2 B_max sum_i P_i b_i
    bkp_indices = [var_index["x_bkp_hospital"], var_index["x_bkp_water"], var_index["x_bkp_eoc"]]
    bkp_powers = [14.0, 10.0, 6.0]

    for i in range(len(bkp_indices)):
        idx_i = bkp_indices[i]
        p_i = bkp_powers[i]
        # Linear part: (P_i^2 - 2 * B_max * P_i) * lambda_budget
        Q[idx_i, idx_i] += lambda_budget * (p_i ** 2 - 1.8 * backup_capacity_mw * p_i) * 0.05
        for j in range(i + 1, len(bkp_indices)):
            idx_j = bkp_indices[j]
            p_j = bkp_powers[j]
            # Cross term: 2 * P_i * P_j * lambda_budget
            Q[idx_i, idx_j] += lambda_budget * 2 * p_i * p_j * 0.05

    # Extract linear terms (diagonal) and quadratic off-diagonal terms
    linear_coeffs: Dict[str, float] = {}
    quadratic_coeffs: Dict[str, Dict[str, float]] = {}

    for i, name_i in enumerate(variable_names):
        linear_coeffs[name_i] = round(float(Q[i, i]), 4)
        quadratic_coeffs[name_i] = {}
        for j in range(i + 1, n_vars):
            val = float(Q[i, j])
            if abs(val) > 1e-5:
                name_j = variable_names[j]
                quadratic_coeffs[name_i][name_j] = round(val, 4)

    return QUBOResponse(
        num_variables=n_vars,
        variable_names=variable_names,
        variable_descriptions=variable_descriptions,
        linear_coefficients=linear_coeffs,
        quadratic_coefficients=quadratic_coeffs,
        constant=round(constant_offset, 4),
        formulation_details={
            "objective_type": "minimize_unmet_load_plus_penalties",
            "lambda_connectivity": lambda_conn,
            "lambda_mutual_exclusivity": lambda_excl,
            "lambda_standby_budget": lambda_budget,
            "lambda_switching_cost": lambda_switch,
            "backup_power_budget_mw": backup_capacity_mw,
            "criticality_weight": criticality_weight,
            "south_backbone_failed": south_backbone_failed,
        },
    )
