import React, { useState } from 'react';
import { 
  Sliders, 
  ShieldAlert, 
  AlertTriangle, 
  ZapOff, 
  BatteryCharging, 
  RotateCcw, 
  Play, 
  CheckCircle2, 
  Activity, 
  History,
  Layers,
  Power
} from 'lucide-react';
import { useGridStore, gridStore } from '../../store/gridStore';
import { PRESET_SCENARIOS } from '../../data/initialGrid';

export const ScenarioSimulationPage: React.FC = () => {
  const { 
    activeScenarioId, 
    topology, 
    backupCapacityMw, 
    criticalityWeight, 
    metrics, 
    scenarioHistory 
  } = useGridStore();

  const [selectedInjectTarget, setSelectedInjectTarget] = useState<string>('line-691');

  const handleInjectFault = () => {
    const edge = topology.edges.find((e) => e.id === selectedInjectTarget);
    if (edge) {
      gridStore.toggleFaultEdge(edge.id);
      return;
    }
    const node = topology.nodes.find((n) => n.id === selectedInjectTarget);
    if (node) {
      gridStore.toggleFaultNode(node.id);
      return;
    }
    const tower = topology.towers.find((t) => t.id === selectedInjectTarget);
    if (tower) {
      gridStore.toggleFaultTower(tower.id);
      return;
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#090d16] p-6 lg:p-8 space-y-6 text-slate-100 select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold tracking-tight text-white">
              Scenario Simulation & Failure Injection
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulate transmission outages, tower collapses, and substation failures to stress-test grid resilience.
          </p>
        </div>

        <button
          onClick={() => gridStore.resetGrid()}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Network to Baseline</span>
        </button>
      </div>

      {/* Main Simulation Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Preset Scenarios & Custom Outage Injector */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preset Disaster Scenarios */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Standard Disaster & Failure Scenarios
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESET_SCENARIOS.map((preset) => {
                const isActive = activeScenarioId === preset.id;
                const severityBadge = {
                  low: 'bg-emerald-950 text-emerald-400 border-emerald-500/30',
                  moderate: 'bg-blue-950 text-blue-400 border-blue-500/30',
                  severe: 'bg-amber-950 text-amber-400 border-amber-500/30',
                  critical: 'bg-red-950 text-red-400 border-red-500/30',
                }[preset.severity];

                return (
                  <button
                    key={preset.id}
                    onClick={() => gridStore.loadPresetScenario(preset.id)}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-slate-900 border-cyan-500 text-white shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold">{preset.name}</span>
                      <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded border font-mono ${severityBadge}`}>
                        {preset.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Granular Component Failure Trip Control */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <ZapOff className="w-4 h-4 text-red-400" />
              Granular Component Fault Injection
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] text-slate-400 block mb-1.5">
                  Select Network Component (Lines, Towers, Substations, Facilities)
                </label>
                <select
                  value={selectedInjectTarget}
                  onChange={(e) => setSelectedInjectTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <optgroup label="Overhead Transmission Lines & Feeders">
                    {topology.edges.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.status})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Steel Lattice Towers">
                    {topology.towers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.status})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Substations & Facilities">
                    {topology.nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name} ({n.status})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleInjectFault}
                  className="w-full py-2.5 px-3 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Power className="w-4 h-4" />
                  Toggle Outage
                </button>
              </div>
            </div>
          </div>

          {/* Active Network Failures Table */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h2 className="text-sm font-semibold text-white flex items-center justify-between">
              <span>Active Outage Components ({metrics.activeFailuresCount})</span>
              <span className="text-xs text-slate-400 font-mono">
                {metrics.unservedFacilitiesCount} facilities unserved
              </span>
            </h2>
            {metrics.activeFailuresCount === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs text-emerald-400 font-mono flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> All network circuits, towers, and substations operational
              </div>
            ) : (
              <div className="space-y-2">
                {topology.edges
                  .filter((e) => e.status === 'faulted')
                  .map((e) => (
                    <div
                      key={e.id}
                      className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-red-200">{e.name}</span>
                        <div className="text-[10px] text-red-400/80 font-mono">
                          {e.voltageKv} kV Transmission Circuit Severed
                        </div>
                      </div>
                      <button
                        onClick={() => gridStore.toggleFaultEdge(e.id)}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px]"
                      >
                        Restore Line
                      </button>
                    </div>
                  ))}

                {topology.towers
                  .filter((t) => t.status === 'faulted')
                  .map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-red-200">{t.name}</span>
                        <div className="text-[10px] text-red-400/80 font-mono">
                          Structural Collapse / Phase Flashover
                        </div>
                      </div>
                      <button
                        onClick={() => gridStore.toggleFaultTower(t.id)}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px]"
                      >
                        Repair Tower
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 span): Resource Adjustments & Simulation Metrics */}
        <div className="space-y-6">
          {/* Resource & Priority Sliders */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
              Resource Allocation Controls
            </h2>

            {/* Backup Power Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300">Standby Reserve</span>
                <span className="font-mono text-cyan-400 font-bold">{backupCapacityMw} MW</span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                step={2}
                value={backupCapacityMw}
                onChange={(e) => gridStore.setBackupCapacity(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0 MW</span>
                <span>20 MW</span>
                <span>40 MW</span>
              </div>
            </div>

            {/* Criticality Weight Slider */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300">Life-Safety Weight (w₁)</span>
                <span className="font-mono text-purple-400 font-bold">
                  {Math.round(criticalityWeight * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={1.0}
                step={0.05}
                value={criticalityWeight}
                onChange={(e) => gridStore.setCriticalityWeight(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 text-[10px]">
                <span>Balanced</span>
                <span>Life-Safety First</span>
              </div>
            </div>
          </div>

          {/* Current Simulation Metrics Card */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 font-mono text-xs">
            <h2 className="text-sm font-semibold text-white font-sans flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Simulation Results
            </h2>
            <div className="space-y-2 divide-y divide-slate-800/60">
              <div className="flex justify-between pt-1">
                <span className="text-slate-400">Total Demand:</span>
                <span className="text-slate-200">{metrics.totalDemandMw} MW</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Demand Served:</span>
                <span className="text-emerald-400 font-bold">{metrics.demandServedMw} MW</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Critical Restored:</span>
                <span className="text-cyan-300 font-bold">{metrics.criticalRestorationPercentage}%</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Standby Dispatched:</span>
                <span className="text-amber-400">{metrics.backupPowerInUseMw} MW</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Constraint Violations:</span>
                <span className={metrics.constraintViolations.length > 0 ? 'text-red-400 font-bold' : 'text-slate-500'}>
                  {metrics.constraintViolations.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
