import React, { useState, useEffect } from 'react';
import { 
  GitCompare, 
  History, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2,
  BarChart3,
  Layers,
  Cpu,
  RefreshCw,
  Zap,
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { useGridStore } from '../../store/gridStore';
import { PRESET_SCENARIOS } from '../../data/initialGrid';
import { gridWeaverApi, CompareScenariosResponse } from '../../services/apiClient';

export const ScenarioComparisonPage: React.FC = () => {
  const { scenarioHistory, activeScenarioId, metrics, backupCapacityMw } = useGridStore();
  const [selectedPresetId, setSelectedPresetId] = useState<string>('ice-storm-tower');
  const [isComparing, setIsComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<CompareScenariosResponse | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);

  const handleRunLiveComparison = async () => {
    setIsComparing(true);
    setCompareError(null);
    try {
      const res = await gridWeaverApi.compareScenarios({
        failed_components: ['line-691'],
        backup_power_mw: backupCapacityMw,
        objective_weight_critical: 0.85,
        ansatz_depth_p: 2,
      });
      if (res) {
        setCompareResult(res);
      } else {
        setCompareError('Failed to retrieve comparison from backend. Ensure FastAPI server is running on port 8000.');
      }
    } catch (e: any) {
      setCompareError(e?.message || 'Error executing comparison');
    } finally {
      setIsComparing(false);
    }
  };

  // Base comparison data, augmented with live backend comparison if available
  const comparisonData = compareResult?.metricsComparison?.length
    ? compareResult.metricsComparison.map((m) => ({
        scenario: m.scenarioName,
        demandServed: m.totalDemandServedMw,
        criticalRestored: m.criticalDemandServedMw,
        activeFailures: m.activeFailures,
        switchingActions: m.switchingSteps,
      }))
    : [
        {
          scenario: 'Baseline (Normal)',
          demandServed: 199,
          criticalRestored: 100,
          activeFailures: 0,
          switchingActions: 0,
        },
        {
          scenario: 'Active Run (Current)',
          demandServed: metrics.demandServedMw,
          criticalRestored: metrics.criticalRestorationPercentage,
          activeFailures: metrics.activeFailuresCount,
          switchingActions: metrics.activeFailuresCount > 0 ? 3 : 0,
        },
        {
          scenario: 'Ice Storm (T-06 Collapse)',
          demandServed: 154,
          criticalRestored: 66,
          activeFailures: 2,
          switchingActions: 4,
        },
        {
          scenario: 'Bulk Substation Flashover',
          demandServed: 84,
          criticalRestored: 33,
          activeFailures: 5,
          switchingActions: 6,
        },
      ];

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#090d16] p-6 lg:p-8 space-y-6 text-slate-100 select-none">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold tracking-tight text-white">
              Cross-Scenario Comparative Evaluation
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Benchmark restoration outcomes, unmet load profiles, life-safety protection, and switching complexity across diverse disaster contingencies.
          </p>
        </div>

        <button
          onClick={handleRunLiveComparison}
          disabled={isComparing}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-purple-950/40 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Cpu className={`w-4 h-4 ${isComparing ? 'animate-spin' : ''}`} />
          <span>{isComparing ? 'Running Benchmark...' : 'Run Live Classical vs QAOA (/api/compare)'}</span>
        </button>
      </div>

      {compareError && (
        <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/40 text-xs text-red-300 font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{compareError}</span>
        </div>
      )}

      {/* Live Backend Benchmark Metrics Summary */}
      {compareResult && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-purple-500/40 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Live Quantum vs Classical Benchmark Results (Port 8000)
            </h2>
            <span className="text-[10px] font-mono text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
              Verified Scientific Benchmark
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Classical MIP Runtime</span>
              <span className="text-emerald-400 font-bold text-base">{compareResult.classical.runtime_ms} ms</span>
              <span className="text-[10px] text-slate-500 block">OR-Tools CBC (Optimal: True)</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Qiskit QAOA Runtime</span>
              <span className="text-purple-300 font-bold text-base">{compareResult.quantum.runtime_ms} ms</span>
              <span className="text-[10px] text-slate-500 block">AerSimulator (12 Qubits)</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">QAOA Approximation Ratio</span>
              <span className="text-cyan-300 font-bold text-base">{(compareResult.comparison.qaoa_approximation_ratio * 100).toFixed(1)}%</span>
              <span className="text-[10px] text-slate-500 block">Solution Quality</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Quantum Advantage</span>
              <span className="text-amber-400 font-bold text-base">
                {compareResult.comparison.quantum_advantage_demonstrated ? 'Demonstrated' : 'NISQ Baseline'}
              </span>
              <span className="text-[10px] text-slate-500 block">Classical MIP optimal on N=12</span>
            </div>
          </div>

          <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800 leading-relaxed font-sans">
            {compareResult.comparison.analysis_notes}
          </div>
        </div>
      )}

      {/* Comparison Chart: Demand Served vs Critical Restored Across Scenarios */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          Restoration Performance Across Outage Contingencies
        </h2>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 15, right: 20, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="scenario" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="demandServed" name="Total Demand Served (MW)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="criticalRestored" name="Critical Tier-1 Restored (%)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="switchingActions" name="Required Switching Steps" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Execution History Table */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-purple-400" />
            Saved Simulation & Execution Log
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {scenarioHistory.length} Recorded Runs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="pb-2">Timestamp</th>
                <th className="pb-2">Scenario / Action Run</th>
                <th className="pb-2">Demand Served</th>
                <th className="pb-2">Critical Restored</th>
                <th className="pb-2">Failures</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {scenarioHistory.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-900/50">
                  <td className="py-2.5 text-slate-500">{row.timestamp}</td>
                  <td className="py-2.5 font-sans font-medium text-white">{row.scenarioName}</td>
                  <td className="py-2.5 text-emerald-400 font-bold">{row.demandServedMw} MW</td>
                  <td className="py-2.5 text-cyan-400 font-bold">{row.criticalPercent}%</td>
                  <td className="py-2.5">
                    {row.activeFailures > 0 ? (
                      <span className="text-red-400 font-bold">{row.activeFailures} faults</span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-800 text-slate-400">
                      Evaluated
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
