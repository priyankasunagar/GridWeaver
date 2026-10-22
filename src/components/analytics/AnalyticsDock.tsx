import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  BarChart3, 
  ListOrdered, 
  History, 
  AlertCircle, 
  CheckCircle, 
  Zap, 
  ShieldCheck, 
  Play, 
  Check,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { useGridStore, gridStore } from '../../store/gridStore';

export const AnalyticsDock: React.FC = () => {
  const { metrics, currentPlan, scenarioHistory, topology } = useGridStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'metrics' | 'plan' | 'comparison' | 'qubo'>('metrics');

  // Chart data for served vs unserved
  const loadChartData = [
    {
      category: 'Critical Tier-1',
      served: metrics.criticalDemandServedMw,
      unserved: Math.max(0, metrics.criticalDemandTotalMw - metrics.criticalDemandServedMw),
      color: '#38bdf8',
    },
    {
      category: 'Total Regional',
      served: metrics.demandServedMw,
      unserved: Math.max(0, metrics.totalDemandMw - metrics.demandServedMw),
      color: '#10b981',
    },
    {
      category: 'Standby Backup',
      served: metrics.backupPowerInUseMw,
      unserved: metrics.backupPowerRemainingMw,
      color: '#f59e0b',
    },
  ];

  // Criticality Tier distribution
  const tierDistributionData = [
    {
      name: 'Tier 1 (Life-Safety)',
      value: topology.nodes.filter((n) => n.criticality === 1 && n.demandMw > 0).reduce((acc, n) => acc + n.demandMw, 0),
      color: '#ef4444',
    },
    {
      name: 'Tier 2 (Essential)',
      value: topology.nodes.filter((n) => n.criticality === 2 && n.demandMw > 0).reduce((acc, n) => acc + n.demandMw, 0),
      color: '#f59e0b',
    },
    {
      name: 'Tier 3 (Standard)',
      value: topology.nodes.filter((n) => n.criticality === 3 && n.demandMw > 0).reduce((acc, n) => acc + n.demandMw, 0),
      color: '#38bdf8',
    },
  ];

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-20 transition-all duration-300 ease-in-out select-none ${
        isCollapsed ? 'translate-y-[calc(100%-36px)]' : 'translate-y-0'
      }`}
    >
      {/* Collapse / Expand Handle Bar */}
      <div className="flex justify-center">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="px-4 py-1.5 rounded-t-lg bg-slate-900/95 border-t border-x border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 shadow-lg backdrop-blur-md cursor-pointer transition-colors"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>Expand Analytics & Restoration Dock</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
              <span>Collapse Dock (Zen Viewport Mode)</span>
            </>
          )}
        </button>
      </div>

      {/* Main Dock Container */}
      <div className="h-64 border-t border-slate-800 bg-slate-950/95 backdrop-blur-md px-4 py-3 flex flex-col text-slate-200 shadow-2xl">
        {/* KPI Strip & Tabs Header */}
        <div className="flex flex-wrap items-center justify-between pb-2 border-b border-slate-800 gap-3">
          {/* High-Level Metrics Badges */}
          <div className="flex items-center gap-3 overflow-x-auto text-xs font-mono">
            <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-2">
              <span className="text-slate-400 font-sans">Demand Served:</span>
              <span className="font-bold text-emerald-400">
                {metrics.demandServedMw} / {metrics.totalDemandMw} MW ({metrics.restorationPercentage}%)
              </span>
            </div>

            <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-2">
              <span className="text-slate-400 font-sans">Critical Restored:</span>
              <span className="font-bold text-cyan-300">
                {metrics.criticalDemandServedMw} / {metrics.criticalDemandTotalMw} MW ({metrics.criticalRestorationPercentage}%)
              </span>
            </div>

            <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-2">
              <span className="text-slate-400 font-sans">Active Faults:</span>
              <span
                className={`font-bold ${
                  metrics.activeFailuresCount > 0 ? 'text-red-400' : 'text-slate-300'
                }`}
              >
                {metrics.activeFailuresCount}
              </span>
            </div>

            <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-2">
              <span className="text-slate-400 font-sans">Unserved Loads:</span>
              <span
                className={`font-bold ${
                  metrics.unservedFacilitiesCount > 0 ? 'text-amber-400' : 'text-slate-300'
                }`}
              >
                {metrics.unservedFacilitiesCount} facilities
              </span>
            </div>

            <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-2">
              <span className="text-slate-400 font-sans">Standby Dispatched:</span>
              <span className="font-bold text-amber-300 font-mono">
                {metrics.backupPowerInUseMw} MW ({metrics.backupPowerRemainingMw} MW reserve)
              </span>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'metrics'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Load Analytics
            </button>
            <button
              onClick={() => setActiveTab('plan')}
              className={`px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'plan'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              Restoration Sequence
              {currentPlan && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'comparison'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Scenario History
            </button>
            <button
              onClick={() => setActiveTab('qubo')}
              className={`px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'qubo'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              QUBO Matrix
            </button>
          </div>
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 pt-2 overflow-y-auto">
          {activeTab === 'metrics' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
              {/* Load Restored Bar Chart */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 flex flex-col">
                <div className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                  Demand Restoration vs Unmet Load (MW)
                </div>
                <div className="flex-1 w-full min-h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={loadChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="category" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                      />
                      <Bar dataKey="served" name="Served (MW)" stackId="a" fill="#10b981" />
                      <Bar dataKey="unserved" name="Unserved (MW)" stackId="a" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Criticality Distribution */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 flex flex-col">
                <div className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  Regional Demand by Criticality Tier
                </div>
                <div className="flex-1 w-full min-h-[120px] flex items-center justify-around">
                  <div className="w-28 h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={tierDistributionData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={25}
                          outerRadius={45}
                          paddingAngle={3}
                        >
                          {tierDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1 text-[10px] font-mono">
                    <div className="flex items-center gap-1.5 text-red-300">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Tier 1: 30 MW (Hospital, Water, EOC)
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-300">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Tier 2: 69 MW (Fab, Cargo Port)
                    </div>
                    <div className="flex items-center gap-1.5 text-cyan-300">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      Tier 3: 100 MW (Downtown, Res)
                    </div>
                  </div>
                </div>
              </div>

              {/* Constraint Warnings & Alarms */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 flex flex-col overflow-y-auto">
                <div className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  Operational Constraints & Alarms ({metrics.constraintViolations.length})
                </div>
                {metrics.constraintViolations.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-[11px] text-emerald-400 font-mono">
                    <CheckCircle className="w-4 h-4 mr-1.5" /> All network voltage & thermal limits normal
                  </div>
                ) : (
                  <div className="space-y-1.5 text-[10px] font-mono">
                    {metrics.constraintViolations.map((v, i) => (
                      <div
                        key={i}
                        className="p-1.5 rounded bg-red-950/40 border border-red-500/30 text-red-300 leading-snug"
                      >
                        ⚠️ {v}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'plan' && (
            <div className="h-full flex flex-col">
              {!currentPlan ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <p className="text-xs text-slate-400 mb-2">
                    No active restoration plan generated yet.
                  </p>
                  <button
                    onClick={() => gridStore.generateRestorationPlan()}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-1.5"
                  >
                    Generate Restoration Plan (Heuristic Demo)
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{currentPlan.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {currentPlan.method === 'frontend_heuristic' ? 'Frontend Heuristic Demo' : 'QAOA'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => gridStore.applyAllPlanActions()}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" /> Execute All Steps
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {currentPlan.actions.map((act) => {
                      const isDone = act.status === 'completed';
                      return (
                        <div
                          key={act.id}
                          className={`p-2 rounded-lg border text-xs transition-colors flex flex-col justify-between ${
                            isDone
                              ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-300'
                              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                              <span className="text-cyan-400 font-bold">Step {act.step}</span>
                              <span className="text-slate-400">{act.estimatedTimeMin} min</span>
                            </div>
                            <p className="text-[11px] text-slate-300 line-clamp-2 mb-2">
                              {act.description}
                            </p>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                            <span className="text-[10px] text-emerald-400 font-mono">
                              +{act.mwRestored} MW
                            </span>
                            {isDone ? (
                              <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                                <Check className="w-3 h-3" /> Executed
                              </span>
                            ) : (
                              <button
                                onClick={() => gridStore.applyRestorationAction(act.id)}
                                className="px-2 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 text-[10px] font-medium"
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
              )}
            </div>
          )}

          {activeTab === 'comparison' && (
            <div className="h-full overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="pb-1">Timestamp</th>
                    <th className="pb-1">Scenario / Event</th>
                    <th className="pb-1">Demand Served</th>
                    <th className="pb-1">Critical Tier-1 %</th>
                    <th className="pb-1">Active Failures</th>
                    <th className="pb-1">Backend State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {scenarioHistory.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/50">
                      <td className="py-1.5 text-slate-500">{row.timestamp}</td>
                      <td className="py-1.5 font-sans font-medium text-white">{row.scenarioName}</td>
                      <td className="py-1.5 text-emerald-400">{row.demandServedMw} MW</td>
                      <td className="py-1.5 text-cyan-400">{row.criticalPercent}%</td>
                      <td className="py-1.5">
                        {row.activeFailures > 0 ? (
                          <span className="text-red-400">{row.activeFailures}</span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-1.5 text-slate-400 text-[10px]">Frontend Demo (QAOA offline)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'qubo' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="font-bold text-purple-300 font-sans flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  QUBO Decision Vector Mapping (x)
                </div>
                <div className="text-[11px] text-slate-400 font-sans mb-2">
                  Distribution network decision variables for circuit breakers, tie-switches, and standby gensets:
                </div>
                <div className="space-y-1 text-[11px] text-slate-300">
                  <div>x₀: TL-501 500kV Bulk Trunk Line (Hydro)</div>
                  <div>x₁: TL-201 230kV River Inter-Substation Line</div>
                  <div>x₂: STL-691 69kV South Backbone Line</div>
                  <div>x₃: TL-692 69kV Emergency Cross-Tie Switch (Normally Open)</div>
                  <div>x₄: MF-01 Microgrid Transfer Switch (Water-Hospital)</div>
                  <div>x₅: Standby Genset Dispatch (St. Jude Trauma Hospital)</div>
                  <div>x₆: Standby Genset Dispatch (Water Treatment)</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="font-bold text-cyan-300 font-sans">
                  Quadratic Interaction Matrix Q [N x N]
                </div>
                <div className="p-2 rounded bg-slate-950 text-[10px] text-slate-400 overflow-x-auto leading-relaxed">
                  <div>Q_diag = [-100·w₁, -80·w₂, -60·w₃, +λ_pen, -95·w₁ ...]</div>
                  <div>Q_offdiag = [+2λ_cap for overlapping line thermal constraints]</div>
                  <div>Radiality: ∏(cycle_edges) = 0 enforce tree topology</div>
                  <div className="text-amber-400 pt-1">
                    * Ready for Qiskit QAOA quadratic_program_to_qubo() ingestion.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
