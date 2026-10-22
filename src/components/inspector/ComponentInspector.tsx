import React from 'react';
import { 
  Info, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Power, 
  ShieldCheck, 
  Activity, 
  X,
  Radio,
  ArrowUpRight,
  ArrowDownRight,
  Gauge
} from 'lucide-react';
import { useGridStore, gridStore } from '../../store/gridStore';

export const ComponentInspector: React.FC = () => {
  const { selectedComponent, topology, powerFlowMap } = useGridStore();

  if (!selectedComponent) {
    return (
      <div className="w-80 h-full border-l border-slate-800 bg-slate-950/95 flex flex-col p-5 text-slate-400 select-none">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-slate-300">
          <Info className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider">
            Component Telemetry
          </h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
            <Radio className="w-6 h-6 animate-pulse text-cyan-500/50" />
          </div>
          <div className="text-xs font-medium text-slate-300">
            No Grid Component Selected
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Click any 3D transmission tower, high-voltage substation, overhead conductor, or facility to inspect real-time electrical telemetry.
          </p>
        </div>
      </div>
    );
  }

  // Find corresponding record
  if (selectedComponent.type === 'node') {
    const node = topology.nodes.find((n) => n.id === selectedComponent.id);
    if (!node) return null;

    const isEnergized = node.isEnergized ?? true;
    const isFaulted = node.status === 'faulted';
    const isIslanded = node.status === 'islanded_backup';

    // Find incoming and outgoing edges
    const incomingEdges = topology.edges.filter((e) => e.targetNodeId === node.id);
    const outgoingEdges = topology.edges.filter((e) => e.sourceNodeId === node.id);

    return (
      <div className="w-80 h-full border-l border-slate-800 bg-slate-950/95 flex flex-col text-slate-200 select-none overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 truncate">
              {node.name}
            </h2>
          </div>
          <button
            onClick={() => gridStore.selectComponent(null)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-400 font-medium">Status</span>
            <div className="flex items-center gap-1.5 font-mono">
              {isFaulted ? (
                <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-500/50 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> FAULTED
                </span>
              ) : isIslanded ? (
                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/50 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> ISLANDED BACKUP
                </span>
              ) : isEnergized ? (
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/50 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> ENERGIZED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  BLACKOUT (UNSERVED)
                </span>
              )}
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Voltage Rating</div>
              <div className="font-mono text-sm font-bold text-cyan-300 mt-0.5">
                {node.voltageKv} kV
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Criticality Tier</div>
              <div className="font-mono text-sm font-bold text-purple-300 mt-0.5">
                Tier {node.criticality} {node.criticality === 1 ? '(Life Safety)' : ''}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">
                {node.demandMw > 0 ? 'Demand Load' : 'Gen Capacity'}
              </div>
              <div className="font-mono text-sm font-bold text-slate-200 mt-0.5">
                {node.demandMw > 0 ? `${node.demandMw} MW` : `${node.generationCapacityMw} MW`}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Power Served</div>
              <div className="font-mono text-sm font-bold text-emerald-400 mt-0.5">
                {node.powerServedMw ?? (isEnergized ? node.demandMw : 0)} MW
              </div>
            </div>
          </div>

          {/* Standby On-Site Generator */}
          {node.backupGenCapacityMw > 0 && (
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                <span>On-Site Emergency Standby Gen</span>
                <span className="font-mono text-amber-400">
                  {node.backupGenCapacityMw} MW
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                {node.backupGenActive ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3 h-3" /> Dispatched & Active
                  </span>
                ) : (
                  <span>Standby Ready (Auto-transfer switch available)</span>
                )}
              </div>
            </div>
          )}

          {/* Connected Feeders / Lines */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Electrical Connectivity
            </div>
            {incomingEdges.map((e) => (
              <div
                key={e.id}
                onClick={() => gridStore.selectComponent('edge', e.id)}
                className="p-2 rounded bg-slate-900 border border-slate-800/80 hover:border-slate-700 cursor-pointer flex items-center justify-between text-[11px]"
              >
                <span className="flex items-center gap-1 text-slate-300">
                  <ArrowDownRight className="w-3 h-3 text-cyan-400" />
                  {e.name}
                </span>
                <span className="font-mono text-slate-400">{powerFlowMap[e.id] ?? 0} MW</span>
              </div>
            ))}
            {outgoingEdges.map((e) => (
              <div
                key={e.id}
                onClick={() => gridStore.selectComponent('edge', e.id)}
                className="p-2 rounded bg-slate-900 border border-slate-800/80 hover:border-slate-700 cursor-pointer flex items-center justify-between text-[11px]"
              >
                <span className="flex items-center gap-1 text-slate-300">
                  <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                  {e.name}
                </span>
                <span className="font-mono text-slate-400">{powerFlowMap[e.id] ?? 0} MW</span>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/60 text-[11px] text-slate-400 leading-relaxed">
            {node.description}
          </div>

          {/* Manual Control Actions */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <button
              onClick={() => gridStore.toggleFaultNode(node.id)}
              className={`w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                isFaulted
                  ? 'bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-200'
                  : 'bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-200'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {isFaulted ? 'Clear Fault & Re-energize' : 'Trip / Force Outage'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Selected Edge (Transmission Line)
  if (selectedComponent.type === 'edge') {
    const edge = topology.edges.find((e) => e.id === selectedComponent.id);
    if (!edge) return null;

    const isFaulted = edge.status === 'faulted';
    const isIsolated = edge.status === 'isolated';
    const currentFlow = powerFlowMap[edge.id] ?? edge.currentFlowMw;
    const isOverloaded = currentFlow > edge.capacityMw;

    return (
      <div className="w-80 h-full border-l border-slate-800 bg-slate-950/95 flex flex-col text-slate-200 select-none overflow-y-auto">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 truncate">
              {edge.name}
            </h2>
          </div>
          <button
            onClick={() => gridStore.selectComponent(null)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-400 font-medium">Line Status</span>
            <span
              className={`px-2 py-0.5 rounded font-mono uppercase text-[10px] ${
                isFaulted
                  ? 'bg-red-950 text-red-400 border border-red-500/50'
                  : isIsolated
                  ? 'bg-slate-800 text-slate-400'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
              }`}
            >
              {edge.status}
            </span>
          </div>

          {/* Line Telemetry */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Voltage Class</div>
              <div className="font-mono text-sm font-bold text-cyan-300 mt-0.5">
                {edge.voltageKv} kV
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Thermal Capacity</div>
              <div className="font-mono text-sm font-bold text-slate-200 mt-0.5">
                {edge.capacityMw} MW
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Active Flow</div>
              <div
                className={`font-mono text-sm font-bold mt-0.5 ${
                  isOverloaded ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {currentFlow} MW
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Line Length</div>
              <div className="font-mono text-sm font-bold text-slate-300 mt-0.5">
                {edge.lengthKm} km
              </div>
            </div>
          </div>

          {/* Terminal Connections */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Terminal Substations & Waypoints
            </div>
            <div className="text-[11px] flex justify-between">
              <span className="text-slate-400">From Source:</span>
              <span className="text-slate-200 font-medium">{edge.sourceNodeId}</span>
            </div>
            <div className="text-[11px] flex justify-between">
              <span className="text-slate-400">To Target:</span>
              <span className="text-slate-200 font-medium">{edge.targetNodeId}</span>
            </div>
            {edge.towerIds.length > 0 && (
              <div className="text-[11px] flex justify-between">
                <span className="text-slate-400">Support Towers:</span>
                <span className="text-cyan-400 font-mono">
                  {edge.towerIds.join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Action */}
          <button
            onClick={() => gridStore.toggleFaultEdge(edge.id)}
            className={`w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
              isFaulted
                ? 'bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-200'
                : 'bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-200'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {isFaulted ? 'Clear Line Fault' : 'Trip Line (Breaker Open)'}
          </button>
        </div>
      </div>
    );
  }

  // Selected Tower
  if (selectedComponent.type === 'tower') {
    const tower = topology.towers.find((t) => t.id === selectedComponent.id);
    if (!tower) return null;

    const isFaulted = tower.status === 'faulted' || tower.status === 'damaged';

    return (
      <div className="w-80 h-full border-l border-slate-800 bg-slate-950/95 flex flex-col text-slate-200 select-none overflow-y-auto">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <Radio className="w-4 h-4 text-cyan-400 shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 truncate">
              {tower.name}
            </h2>
          </div>
          <button
            onClick={() => gridStore.selectComponent(null)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-400 font-medium">Structural Status</span>
            <span
              className={`px-2 py-0.5 rounded font-mono uppercase text-[10px] ${
                isFaulted
                  ? 'bg-red-950 text-red-400 border border-red-500/50'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
              }`}
            >
              {tower.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Tower Height</div>
              <div className="font-mono text-sm font-bold text-cyan-300 mt-0.5">
                {tower.height} meters
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Voltage Rating</div>
              <div className="font-mono text-sm font-bold text-slate-200 mt-0.5">
                {tower.voltageKv} kV
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Carried Overhead Circuits
            </div>
            <div className="font-mono text-cyan-400 text-xs">
              {tower.lineIds.join(', ')}
            </div>
            {tower.hasAviationMarkings && (
              <div className="text-[10px] text-amber-300 pt-1">
                * River Crossing Aviation Warning Beacons Active
              </div>
            )}
          </div>

          <button
            onClick={() => gridStore.toggleFaultTower(tower.id)}
            className={`w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
              isFaulted
                ? 'bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-200'
                : 'bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-200'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {isFaulted ? 'Repair Tower Structure' : 'Simulate Tower Collapse / Flashover'}
          </button>
        </div>
      </div>
    );
  }

  return null;
};
