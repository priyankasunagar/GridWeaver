import React, { useState } from 'react';
import { 
  Play, 
  RotateCcw, 
  ShieldAlert, 
  Wrench, 
  BatteryCharging, 
  Sliders, 
  AlertTriangle,
  ZapOff,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { useGridStore, gridStore } from '../../store/gridStore';
import { PRESET_SCENARIOS } from '../../data/initialGrid';

export const ScenarioControlPanel: React.FC = () => {
  const { 
    activeScenarioId, 
    topology, 
    backupCapacityMw, 
    criticalityWeight,
    currentPlan,
    selectedComponent 
  } = useGridStore();

  const [selectedInjectTarget, setSelectedInjectTarget] = useState<string>('line-691');

  const handleInjectFault = () => {
    // Check if edge, node, or tower
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
    <div className="w-80 h-full border-r border-slate-800 bg-slate-950/95 flex flex-col text-slate-200 select-none overflow-y-auto">
      {/* Panel Title */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Scenario & Failure Control
          </h2>
        </div>
        <button
          onClick={() => gridStore.resetGrid()}
          title="Reset grid to initial state"
          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Scenario Presets */}
        <div>
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Preset Outage Scenarios
          </label>
          <div className="space-y-1.5">
            {PRESET_SCENARIOS.map((preset) => {
              const isActive = activeScenarioId === preset.id;
              const severityColor = {
                low: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20',
                moderate: 'text-blue-400 border-blue-500/30 bg-blue-950/20',
                severe: 'text-amber-400 border-amber-500/30 bg-amber-950/20',
                critical: 'text-red-400 border-red-500/30 bg-red-950/20',
              }[preset.severity];

              return (
                <button
                  key={preset.id}
                  onClick={() => gridStore.loadPresetScenario(preset.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                    isActive
                      ? 'bg-slate-900 border-cyan-500 text-white shadow-sm'
                      : 'bg-slate-900/50 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold">{preset.name}</span>
                    <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded border font-mono ${severityColor}`}>
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

        {/* Manual Failure Injection */}
        <div className="pt-3 border-t border-slate-800/80">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <ZapOff className="w-3.5 h-3.5 text-red-400" />
            Manual Component Trip
          </label>
          <div className="space-y-2">
            <select
              value={selectedInjectTarget}
              onChange={(e) => setSelectedInjectTarget(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <optgroup label="Transmission Lines & Feeders">
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

            <button
              onClick={handleInjectFault}
              className="w-full py-2 px-3 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-500/50 text-red-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Toggle Fault / Outage on Target
            </button>
          </div>
        </div>

        {/* Available Standby Backup Power Slider */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              Emergency Standby Reserve
            </span>
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
            <span>0 MW (Zero Reserve)</span>
            <span>20 MW</span>
            <span>40 MW (Full)</span>
          </div>
        </div>

        {/* Criticality Weighting Slider */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">
              Critical Life-Safety Weight (w₁)
            </span>
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
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Balanced Load</span>
            <span>Strict Life-Safety</span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
          {/* Generate Restoration Plan */}
          <button
            onClick={() => gridStore.generateRestorationPlan()}
            className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Generate Restoration Plan
          </button>

          <div className="text-[10px] text-center text-slate-400 italic">
            * Frontend Heuristic Demo — Previews switching re-route prior to QAOA backend execution
          </div>

          {currentPlan && (
            <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-800/50 text-xs space-y-2">
              <div className="flex items-center justify-between font-semibold text-cyan-300">
                <span>{currentPlan.title}</span>
                <span className="text-[10px] font-mono text-cyan-400">
                  {currentPlan.actions.length} Actions
                </span>
              </div>
              <button
                onClick={() => gridStore.applyAllPlanActions()}
                className="w-full py-1.5 px-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                Apply Full Restoration Plan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
