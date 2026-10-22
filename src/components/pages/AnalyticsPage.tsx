import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  BatteryCharging, 
  Zap,
  Activity
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
  Pie, 
  Legend,
  CartesianGrid
} from 'recharts';
import { useGridStore } from '../../store/gridStore';

export const AnalyticsPage: React.FC = () => {
  const { metrics, topology, currentPlan } = useGridStore();

  // Chart 1: Current vs Restored Load
  const demandComparisonData = [
    {
      name: 'Baseline Pre-Outage',
      served: metrics.totalDemandMw,
      unmet: 0,
    },
    {
      name: 'Current Outage State',
      served: metrics.demandServedMw,
      unmet: Math.max(0, metrics.totalDemandMw - metrics.demandServedMw),
    },
    {
      name: 'Plan Projected Post-Restoration',
      served: currentPlan ? currentPlan.projectedMetrics.demandServedMw : metrics.demandServedMw,
      unmet: currentPlan
        ? Math.max(0, currentPlan.projectedMetrics.totalDemandMw - currentPlan.projectedMetrics.demandServedMw)
        : Math.max(0, metrics.totalDemandMw - metrics.demandServedMw),
    },
  ];

  // Chart 2: Criticality Distribution
  const criticalityData = [
    {
      name: 'Tier 1: Life-Safety (Hospital, Water, EOC)',
      total: metrics.criticalDemandTotalMw,
      served: metrics.criticalDemandServedMw,
      fill: '#38bdf8',
    },
    {
      name: 'Tier 2: Infrastructure & Port',
      total: 69,
      served: topology.nodes
        .filter((n) => n.criticality === 2 && n.demandMw > 0 && n.isEnergized)
        .reduce((acc, n) => acc + (n.powerServedMw ?? n.demandMw), 0),
      fill: '#f59e0b',
    },
    {
      name: 'Tier 3: Commercial & Residential',
      total: 100,
      served: topology.nodes
        .filter((n) => n.criticality === 3 && n.demandMw > 0 && n.isEnergized)
        .reduce((acc, n) => acc + (n.powerServedMw ?? n.demandMw), 0),
      fill: '#10b981',
    },
  ];

  // Chart 3: Feeder Line Loading vs Capacity
  const feederData = topology.edges.map((e) => ({
    name: e.id,
    fullName: e.name,
    flow: e.currentFlowMw,
    capacity: e.capacityMw,
    utilization: Math.round((e.currentFlowMw / e.capacityMw) * 100),
  }));

  // Pie Chart: Backup utilization
  const backupPieData = [
    { name: 'Dispatched (In Use)', value: metrics.backupPowerInUseMw, fill: '#f59e0b' },
    { name: 'Remaining Reserve', value: metrics.backupPowerRemainingMw, fill: '#334155' },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#090d16] p-6 lg:p-8 space-y-8 text-slate-100 select-none">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          <h1 className="text-xl font-bold tracking-tight text-white">
            Analytical Metrics & Power Restoration Performance
          </h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Quantitative evaluations of demand served, critical life-safety restoration ratios, feeder line thermal capacity headroom, and standby fuel utilization.
        </p>
      </div>

      {/* Row 1: Demand Comparison & Criticality Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Served vs Unmet Load */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Regional Demand Served vs Unmet Outage (MW)
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Total Grid Demand: {metrics.totalDemandMw} MW
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demandComparisonData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} interval={0} />
                <YAxis stroke="#64748b" fontSize={11} unit=" MW" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="served" name="Power Served (MW)" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="unmet" name="Unserved Outage (MW)" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Criticality Breakdown */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Critical vs Non-Critical Demand Restored
            </h2>
            <span className="text-xs text-cyan-400 font-mono">
              Life-Safety Restored: {metrics.criticalRestorationPercentage}%
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={criticalityData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={11} unit=" MW" />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={130} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="served" name="Demand Restored (MW)" fill="#38bdf8" radius={[0, 4, 4, 0]} />
                <Bar dataKey="total" name="Total Required Demand (MW)" fill="#334155" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Feeder Utilization & Backup Reserves */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feeder Thermal Loading BarChart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Transmission Circuit Thermal Loading vs Limits (MW)
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              {topology.edges.length} Circuits Monitored
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feederData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={11} unit=" MW" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                />
                <Bar dataKey="flow" name="Active Power Flow (MW)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="capacity" name="Thermal Limit (MW)" fill="#1e293b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Standby Generator Reserve Pie Chart */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 flex flex-col justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
            Standby Fuel & Capacity
          </h2>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={backupPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={65}
                  paddingAngle={4}
                >
                  {backupPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xs font-mono pt-2 border-t border-slate-800">
            <div className="flex justify-between text-amber-300">
              <span>Dispatched Power:</span>
              <span className="font-bold">{metrics.backupPowerInUseMw} MW</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Available Reserve:</span>
              <span>{metrics.backupPowerRemainingMw} MW</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Total Standby Fleet:</span>
              <span>{metrics.totalBackupCapacityMw} MW</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
