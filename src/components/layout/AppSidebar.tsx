import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Zap, 
  Sliders, 
  Sparkles, 
  BarChart3, 
  GitCompare, 
  Cpu, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  Server,
  Info
} from 'lucide-react';
import { useGridStore } from '../../store/gridStore';
import { gridWeaverApi } from '../../services/apiClient';

export type PageId = 
  | 'overview' 
  | 'twin' 
  | 'scenarios' 
  | 'restoration' 
  | 'analytics' 
  | 'compare' 
  | 'quantum' 
  | 'settings';

interface AppSidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const NAV_ITEMS: Array<{
  id: PageId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description: string;
}> = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    description: 'Clean high-level network summary & health',
  },
  {
    id: 'twin',
    label: 'Grid Digital Twin',
    icon: Zap,
    description: 'Interactive 3D physical infrastructure world',
  },
  {
    id: 'scenarios',
    label: 'Scenario Simulation',
    icon: Sliders,
    description: 'Failure injection, tower & line outages',
  },
  {
    id: 'restoration',
    label: 'Restoration Planning',
    icon: Sparkles,
    badge: 'Heuristic',
    description: 'Proposed switching steps & re-routing',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'Deep load, critical demand & constraint charts',
  },
  {
    id: 'compare',
    label: 'Scenario Comparison',
    icon: GitCompare,
    description: 'Side-by-side run evaluations & metrics',
  },
  {
    id: 'quantum',
    label: 'Quantum Solver',
    icon: Cpu,
    badge: 'Qiskit',
    description: 'QUBO formulation & QAOA architecture',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    description: '3D viewport layers, quality & visual controls',
  },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activePage,
  onNavigate,
  isMobileOpen,
  onCloseMobile,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [backendOnline, setBackendOnline] = useState(gridWeaverApi.isBackendOnline());
  const { metrics } = useGridStore();

  useEffect(() => {
    const unsub = gridWeaverApi.subscribeStatus((online) => {
      setBackendOnline(online);
    });
    return unsub;
  }, []);

  const handleSelect = (id: PageId) => {
    onNavigate(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Main Persistent Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out flex flex-col bg-slate-950 border-r border-slate-850 shadow-2xl ${
          isCollapsed ? 'w-18' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ borderColor: '#1e293b' }}
      >
        {/* Brand Header */}
        <div className="h-16 border-b border-slate-800/80 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400 shrink-0 shadow-lg shadow-cyan-950/50">
              <Zap className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <div className="flex items-center gap-1.5 font-mono font-bold text-sm tracking-wider text-white">
                  GRIDWEAVER
                </div>
                <div className="text-[10px] text-cyan-400/80 font-mono tracking-tight">
                  RESILIENCE TWIN
                </div>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/60 transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-2.5 py-4 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                title={isCollapsed ? `${item.label} — ${item.description}` : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-cyan-950/70 border border-cyan-500/50 text-cyan-200 shadow-md shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {!isCollapsed && (
                  <div className="flex-1 flex items-center justify-between overflow-hidden text-left">
                    <span className="truncate font-sans font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 space-y-2">
          {!isCollapsed ? (
            <>
              {/* Network Status Quick Summary */}
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Network Health</span>
                  <span
                    className={`font-mono font-bold ${
                      metrics.activeFailuresCount > 0
                        ? 'text-red-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {metrics.restorationPercentage}% Restored
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[10px] font-mono">
                  <span>Active Faults</span>
                  <span className={metrics.activeFailuresCount > 0 ? 'text-red-400' : 'text-slate-400'}>
                    {metrics.activeFailuresCount} components
                  </span>
                </div>
              </div>

              {/* Backend State Indicator */}
              <div className="flex items-center gap-1.5 px-2 py-1 text-[10px]">
                <Server className={`w-3 h-3 shrink-0 ${backendOnline ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span className={`truncate font-mono ${backendOnline ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                  {backendOnline ? 'FastAPI + Qiskit Online' : 'Frontend Demo (QAOA offline)'}
                </span>
              </div>
            </>
          ) : (
            <div className="flex justify-center py-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  metrics.activeFailuresCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'
                }`}
                title={`Network Health: ${metrics.restorationPercentage}%`}
              />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
