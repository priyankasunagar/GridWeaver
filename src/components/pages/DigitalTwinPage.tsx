import React from 'react';
import { PowerGridScene } from '../scene/PowerGridScene';
import { ComponentInspector } from '../inspector/ComponentInspector';
import { useGridStore, gridStore } from '../../store/gridStore';
import { 
  Zap, 
  RotateCcw, 
  Layers, 
  Sliders, 
  Play, 
  AlertTriangle, 
  Activity, 
  X,
  Compass,
  Maximize2
} from 'lucide-react';

export const DigitalTwinPage: React.FC = () => {
  const { selectedComponent, metrics, activeScenarioId, topology } = useGridStore();

  return (
    <div className="flex-1 h-full relative overflow-hidden flex select-none">
      {/* Central Large 3D Digital Twin World */}
      <div className="flex-1 h-full relative">
        <PowerGridScene />

        {/* Floating Quick Stats Ribbon (Top-Left) */}
        <div className="absolute top-4 left-4 z-20 hidden sm:flex items-center gap-2 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl px-3.5 py-2 shadow-2xl text-xs font-mono pointer-events-auto">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Activity className="w-3.5 h-3.5" />
            <span className="font-bold">{metrics.demandServedMw} MW</span>
            <span className="text-slate-500">({metrics.restorationPercentage}%)</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5 text-cyan-300">
            <span className="text-slate-400 font-sans">Crit:</span>
            <span className="font-bold">{metrics.criticalRestorationPercentage}%</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-sans">Faults:</span>
            <span className={`font-bold ${metrics.activeFailuresCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {metrics.activeFailuresCount}
            </span>
          </div>
        </div>

        {/* Floating Minimal Legend (Bottom-Left) */}
        <div className="absolute bottom-4 left-4 z-20 hidden md:flex items-center gap-3 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl px-3.5 py-2 text-[11px] font-mono shadow-2xl pointer-events-auto">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span>Normal Energized</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Islanded Backup</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Fault / Outage</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>Restored Circuit</span>
          </div>
        </div>
      </div>

      {/* Component Telemetry Inspector Sidebar (Visible when component is selected or toggleable) */}
      {selectedComponent && (
        <div className="relative z-30 h-full shadow-2xl animate-in slide-in-from-right duration-200">
          <ComponentInspector />
        </div>
      )}
    </div>
  );
};
