import React from 'react';
import { 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  BatteryCharging, 
  ArrowRight, 
  Activity, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  Server,
  Layers,
  Radio
} from 'lucide-react';
import { useGridStore, gridStore } from '../../store/gridStore';
import { PageId } from '../layout/AppSidebar';

interface OverviewPageProps {
  onNavigate: (page: PageId) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const { metrics, activeScenarioId, scenarioHistory, topology } = useGridStore();

  const activeScenarioName = {
    baseline: 'Normal Operating Baseline',
    'ice-storm-tower': 'Severe Ice Storm: Tower T-06 Structural Failure',
    'bulk-sub-trip': 'Bulk Substation Transformer Thermal Overload & Trip',
    'river-crossing-strike': 'River Crossing Line Fault (Tower T-04 Strike)',
    'cascading-compound': 'Compound Wildfire & Wind Outage (Multiple Lines)',
  }[activeScenarioId] || 'Custom Scenario';

  const criticalFacilities = topology.nodes.filter(
    (n) => n.criticality === 1 && n.demandMw > 0
  );

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#090d16] p-6 lg:p-8 space-y-6 text-slate-100 select-none">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-slate-800 p-6 lg:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            GridWeaver Digital Twin • Operational
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white font-sans">
            Power Grid Resilience & Health Summary
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Simplified regional distribution network modeled for hybrid quantum-classical restoration decision support. Inspect live reachability, simulate component failures, and evaluate heuristic switching sequences.
          </p>
        </div>

        {/* Primary Action Button to Launch 3D Scene */}
        <button
          onClick={() => onNavigate('twin')}
          className="shrink-0 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm shadow-xl shadow-cyan-950/50 flex items-center gap-2.5 transition-all cursor-pointer group"
        >
          <Zap className="w-4 h-4 text-cyan-200" />
          <span>Launch 3D Digital Twin</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Exactly 4 Essential KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Demand Served */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Total Demand Served</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {metrics.restorationPercentage}%
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({metrics.demandServedMw} / {metrics.totalDemandMw} MW)
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${metrics.restorationPercentage}%` }}
            />
          </div>
        </div>

        {/* KPI 2: Critical Tier-1 Restored */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Critical Life-Safety Load</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-cyan-300">
              {metrics.criticalRestorationPercentage}%
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({metrics.criticalDemandServedMw} / {metrics.criticalDemandTotalMw} MW)
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${metrics.criticalRestorationPercentage}%` }}
            />
          </div>
        </div>

        {/* KPI 3: Active Faults */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Active Network Failures</span>
            <AlertTriangle className={`w-4 h-4 ${metrics.activeFailuresCount > 0 ? 'text-red-400' : 'text-slate-500'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono ${metrics.activeFailuresCount > 0 ? 'text-red-400' : 'text-slate-200'}`}>
              {metrics.activeFailuresCount}
            </span>
            <span className="text-xs text-slate-500 font-sans">
              {metrics.activeFailuresCount === 0 ? 'Normal Operation' : 'Components Isolated'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-sans">
            {metrics.unservedFacilitiesCount > 0 ? `${metrics.unservedFacilitiesCount} facilities unserved` : 'Zero customer outages'}
          </div>
        </div>

        {/* KPI 4: Standby Backup Reserve */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Emergency Standby Power</span>
            <BatteryCharging className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-300">
              {metrics.backupPowerInUseMw} MW
            </span>
            <span className="text-xs text-slate-500 font-mono">
              / {metrics.totalBackupCapacityMw} MW
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-sans">
            {metrics.backupPowerRemainingMw} MW reserve capacity ready
          </div>
        </div>
      </div>

      {/* Network Status Summary & Critical Life-Safety Facilities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Network Health & Critical Tier-1 Facilities */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">
                Critical Life-Safety Facilities (Tier-1)
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {criticalFacilities.filter((n) => n.isEnergized).length} / {criticalFacilities.length} Energized
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {criticalFacilities.map((fac) => {
              const isEnergized = fac.isEnergized ?? true;
              const isIslanded = fac.status === 'islanded_backup';

              return (
                <div
                  key={fac.id}
                  onClick={() => {
                    gridStore.selectComponent('node', fac.id);
                    onNavigate('twin');
                  }}
                  className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">
                      {fac.name.split(' ')[0]}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isIslanded
                          ? 'bg-amber-400'
                          : isEnergized
                          ? 'bg-emerald-400'
                          : 'bg-red-500 animate-pulse'
                      }`}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono flex justify-between">
                    <span>Demand:</span>
                    <span className="text-slate-200">{fac.demandMw} MW</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">
                    {isIslanded ? '⚡ Islanded on Backup' : isEnergized ? '✓ Primary Grid' : '✖ Unserved (Blackout)'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Active Scenario Overview */}
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-600/40 text-amber-400">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-400">Active Disaster Scenario: </span>
                <span className="font-semibold text-slate-200">{activeScenarioName}</span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('scenarios')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
            >
              <span>Manage Scenarios</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right 1 Col: Recent Scenario Activity Log */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">
                Recent Activity
              </h2>
            </div>
            <button
              onClick={() => onNavigate('compare')}
              className="text-xs text-cyan-400 hover:underline"
            >
              History
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            {scenarioHistory.slice(0, 4).map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 space-y-1"
              >
                <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono">
                  <span>{item.timestamp}</span>
                  <span className="text-emerald-400 font-semibold">{item.demandServedMw} MW Served</span>
                </div>
                <div className="font-medium text-slate-200 text-xs truncate">
                  {item.scenarioName}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Critical Restored: {item.criticalPercent}% • {item.activeFailures} faults
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
