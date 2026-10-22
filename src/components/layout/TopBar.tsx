import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  RotateCcw, 
  Layers, 
  Maximize2, 
  Info, 
  Activity, 
  Server,
  Menu,
  Sparkles
} from 'lucide-react';
import { useGridStore, gridStore } from '../../store/gridStore';
import { MethodologyModal } from '../modals/MethodologyModal';
import { PageId } from './AppSidebar';
import { gridWeaverApi } from '../../services/apiClient';

interface TopBarProps {
  activePage: PageId;
  onToggleMobile: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ activePage, onToggleMobile }) => {
  const { viewSettings, activeScenarioId } = useGridStore();
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);
  const [layersMenuOpen, setLayersMenuOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState(gridWeaverApi.isBackendOnline());

  useEffect(() => {
    const unsub = gridWeaverApi.subscribeStatus((online) => {
      setBackendOnline(online);
    });
    return unsub;
  }, []);

  const activeScenarioName = {
    baseline: 'Normal Baseline (All Energized)',
    'ice-storm-tower': 'Severe Ice Storm: Tower T-06 Structural Failure',
    'bulk-sub-trip': 'Bulk Substation Transformer Overload',
    'river-crossing-strike': 'River Crossing Tower T-04 Fault',
    'cascading-compound': 'Compound Wildfire & Wind Outage',
  }[activeScenarioId] || 'Custom Outage Simulation';

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <>
      <header className="h-14 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md px-4 flex items-center justify-between z-30 select-none">
        {/* Left: Mobile Toggle & Brand Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition-colors"
            title="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 shadow-sm shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base tracking-wider font-mono">
                GRIDWEAVER
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                DIGITAL TWIN
              </span>
            </div>
            <div className="text-[11px] text-slate-400 truncate max-w-[280px] sm:max-w-md hidden md:block">
              Hybrid Quantum-Classical Framework for Power Grid Restoration
            </div>
          </div>
        </div>

        {/* Center: Scenario & Backend Status Badges */}
        <div className="hidden lg:flex items-center gap-2">
          {/* Active Scenario Indicator */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-400">Scenario:</span>
            <span className="font-medium text-slate-200 truncate max-w-[220px]">
              {activeScenarioName}
            </span>
          </div>

          {/* Backend Status Badge */}
          <div
            title={backendOnline ? "Python FastAPI backend connected with Qiskit Aer & OR-Tools." : "Frontend running in standalone demo simulation mode."}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] ${
              backendOnline
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <Server className={`w-3.5 h-3.5 shrink-0 ${backendOnline ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className={`font-mono font-medium ${backendOnline ? 'text-emerald-300' : 'text-amber-300'}`}>
              {backendOnline ? 'Python Backend Online' : 'Frontend Demo Mode'}
            </span>
            <span className="text-[10px] text-slate-400 hidden xl:inline">
              {backendOnline ? '(FastAPI + Qiskit)' : '(Qiskit QAOA offline)'}
            </span>
          </div>
        </div>

        {/* Right: Camera Presets, Layer Controls, and Actions */}
        <div className="flex items-center gap-2">
          {/* Camera Preset Selector */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'substation', label: '500kV Sub' },
              { id: 'hospital', label: 'Hospital' },
              { id: 'hydro', label: 'Hydro Dam' },
              { id: 'topdown', label: 'Top-Down' },
            ].map((cam) => (
              <button
                key={cam.id}
                onClick={() => gridStore.setCameraPreset(cam.id as any)}
                className={`px-2 py-1 rounded text-xs transition-colors font-medium ${
                  viewSettings.cameraPreset === cam.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cam.label}
              </button>
            ))}
          </div>

          {/* Layers Popover Toggle */}
          <div className="relative">
            <button
              onClick={() => setLayersMenuOpen(!layersMenuOpen)}
              title="Toggle View Layers"
              className={`p-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1 ${
                layersMenuOpen
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
            </button>

            {layersMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 p-3 rounded-lg bg-slate-900 border border-slate-700 shadow-xl z-50 text-xs space-y-2">
                <div className="font-semibold text-white pb-1 border-b border-slate-800">
                  Viewport Layers
                </div>
                {[
                  { key: 'showParticles', label: 'Animated Power Flow' },
                  { key: 'showConductors', label: 'Overhead Conductors' },
                  { key: 'showTowers', label: 'Steel Lattice Towers' },
                  { key: 'showTerrain', label: 'Terrain & River' },
                  { key: 'showLabels', label: 'Facility Labels' },
                  { key: 'performanceMode', label: 'Performance Mode' },
                ].map((l) => (
                  <label
                    key={l.key}
                    className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white"
                  >
                    <span>{l.label}</span>
                    <input
                      type="checkbox"
                      checked={viewSettings[l.key as keyof typeof viewSettings] as boolean}
                      onChange={(e) =>
                        gridStore.setViewSetting(l.key as any, e.target.checked)
                      }
                      className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Reset Camera */}
          <button
            onClick={() => {
              gridStore.setCameraPreset('overview');
              gridStore.selectComponent(null);
            }}
            title="Reset Camera View"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors hidden sm:flex"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Methodology & QUBO Modal Button */}
          <button
            onClick={() => setIsMethodologyOpen(true)}
            title="View QUBO Formulation & QAOA Architecture"
            className="px-2.5 py-1.5 rounded-lg bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/80 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
          >
            <Info className="w-4 h-4" />
            <span className="hidden sm:inline">QUBO & QAOA</span>
          </button>
        </div>
      </header>

      {/* Methodology Modal */}
      <MethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
      />
    </>
  );
};
