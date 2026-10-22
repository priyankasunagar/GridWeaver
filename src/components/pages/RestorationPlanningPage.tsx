import React from 'react';
import { 
  Sparkles, 
  Play, 
  Check, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  TrendingUp, 
  Cpu, 
  RotateCcw,
  CheckCircle2,
  ListOrdered
} from 'lucide-react';
import { useGridStore, gridStore } from '../../store/gridStore';

export const RestorationPlanningPage: React.FC = () => {
  const { currentPlan, metrics, backupCapacityMw } = useGridStore();

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#090d16] p-6 lg:p-8 space-y-6 text-slate-100 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold tracking-tight text-white">
              Restoration Planning & Switching Sequences
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Evaluate proposed breaker switching sequences, tie-line closures, and microgrid dispatches to restore disconnected critical loads.
          </p>
        </div>

        {/* Generate / Re-evaluate button */}
        <button
          onClick={() => gridStore.generateRestorationPlan()}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-950/40 flex items-center gap-2 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>{currentPlan ? 'Recompute Restoration Plan' : 'Generate Proposed Plan'}</span>
        </button>
      </div>

      {/* Prominent Heuristic Demo Disclaimer Banner */}
      <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-600/40 flex items-start gap-3">
        <Cpu className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 leading-relaxed">
          <strong className="text-amber-300">Methodology Note (Frontend Heuristic Demo — Not QAOA):</strong> This restoration sequence is produced by a transparent graph switching heuristic for interactive digital twin demonstration. The true QUBO mathematical formulation and Qiskit QAOA quantum circuit solver will run on the Python FastAPI backend in the next phase.
        </div>
      </div>

      {!currentPlan ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
            <ListOrdered className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">No Restoration Plan Computed Yet</h3>
            <p className="text-xs text-slate-400 max-w-md">
              Simulate an outage scenario or click the button below to compute an optimal heuristic restoration plan for the current network.
            </p>
          </div>
          <button
            onClick={() => gridStore.generateRestorationPlan()}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Compute Restoration Plan
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Plan Projected Impact Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Projected Demand Restored</span>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {currentPlan.projectedMetrics.demandServedMw} / {currentPlan.projectedMetrics.totalDemandMw} MW
              </div>
              <div className="text-[10px] text-slate-500">
                ({currentPlan.projectedMetrics.restorationPercentage}% restored)
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Critical Tier-1 Restored</span>
              <div className="text-xl font-bold font-mono text-cyan-300">
                {currentPlan.projectedMetrics.criticalDemandServedMw} / {currentPlan.projectedMetrics.criticalDemandTotalMw} MW
              </div>
              <div className="text-[10px] text-slate-500">
                ({currentPlan.projectedMetrics.criticalRestorationPercentage}% life-safety rate)
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Remaining Unmet Demand</span>
              <div className="text-xl font-bold font-mono text-amber-300">
                {Math.round((currentPlan.projectedMetrics.totalDemandMw - currentPlan.projectedMetrics.demandServedMw) * 10) / 10} MW
              </div>
              <div className="text-[10px] text-slate-500">
                {currentPlan.projectedMetrics.unservedFacilitiesCount} unserved facilities
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Heuristic Runtime</span>
              <div className="text-xl font-bold font-mono text-purple-300">
                {currentPlan.computationTimeMs} ms
              </div>
              <div className="text-[10px] text-slate-500">
                {currentPlan.actions.length} switching actions proposed
              </div>
            </div>
          </div>

          {/* Action Sequence List & Execution */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Proposed Restoration Action Sequence
                </h2>
                <p className="text-xs text-slate-400">
                  Step-by-step circuit breaker isolations, tie-line synchronizations, and standby generator blackstarts.
                </p>
              </div>

              <button
                onClick={() => gridStore.applyAllPlanActions()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 transition-colors shadow-lg shadow-emerald-950/40 cursor-pointer self-start sm:self-auto"
              >
                <Play className="w-4 h-4" />
                <span>Execute All Actions</span>
              </button>
            </div>

            <div className="space-y-3">
              {currentPlan.actions.map((act) => {
                const isDone = act.status === 'completed';
                return (
                  <div
                    key={act.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isDone
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-300'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        isDone ? 'bg-emerald-900/60 text-emerald-300' : 'bg-slate-900 text-cyan-400 border border-slate-800'
                      }`}>
                        {isDone ? <Check className="w-4 h-4" /> : act.step}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">
                            {act.targetName}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                            {act.type.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                          {act.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 self-end md:self-center">
                      <div className="text-right font-mono text-xs">
                        <div className="text-emerald-400 font-bold">+{act.mwRestored} MW</div>
                        <div className="text-slate-500 text-[10px] flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {act.estimatedTimeMin} min
                        </div>
                      </div>

                      {isDone ? (
                        <div className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-medium flex items-center gap-1.5 font-mono">
                          <CheckCircle2 className="w-4 h-4" /> Completed
                        </div>
                      ) : (
                        <button
                          onClick={() => gridStore.applyRestorationAction(act.id)}
                          className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Execute Step
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
