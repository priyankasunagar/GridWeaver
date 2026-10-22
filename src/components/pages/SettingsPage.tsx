import React from 'react';
import { 
  Settings as SettingsIcon, 
  Layers, 
  Eye, 
  Cpu, 
  Sparkles, 
  Check, 
  RotateCcw,
  Monitor
} from 'lucide-react';
import { useGridStore, gridStore } from '../../store/gridStore';

export const SettingsPage: React.FC = () => {
  const { viewSettings } = useGridStore();

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#090d16] p-6 lg:p-8 space-y-6 text-slate-100 select-none">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-cyan-400" />
          <h1 className="text-xl font-bold tracking-tight text-white">
            Application Preferences & 3D Render Settings
          </h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Customize 3D viewport layers, frame pacing, particle flow density, and accessibility preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {/* Viewport Layer Visibility */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <Layers className="w-4 h-4 text-cyan-400" />
            3D Infrastructure Viewport Layers
          </h2>

          <div className="space-y-3">
            {[
              {
                key: 'showConductors',
                title: 'High-Voltage Overhead Conductors',
                desc: 'Multi-span 3-phase catenary sagging cables',
              },
              {
                key: 'showParticles',
                title: 'Animated Power Flow Particles',
                desc: 'Real-time velocity proportional to circuit MW flow',
              },
              {
                key: 'showTowers',
                title: 'Steel Lattice Transmission Towers',
                desc: '4-legged towers with crossarms, insulators and beacons',
              },
              {
                key: 'showTerrain',
                title: '3D Contoured Terrain & River/Reservoir',
                desc: 'Elevation contour, water surface and access roads',
              },
              {
                key: 'showLabels',
                title: '3D Facility & Substation Billboards',
                desc: 'Status, voltage rating and demand load callouts',
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white">{item.title}</div>
                  <div className="text-[11px] text-slate-400">{item.desc}</div>
                </div>
                <input
                  type="checkbox"
                  checked={viewSettings[item.key as keyof typeof viewSettings] as boolean}
                  onChange={(e) =>
                    gridStore.setViewSetting(item.key as any, e.target.checked)
                  }
                  className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Graphics Performance & Accessibility */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <Monitor className="w-4 h-4 text-purple-400" />
            Rendering Performance & Accessibility
          </h2>

          <div className="space-y-3">
            {/* Performance Mode */}
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-white">Performance / Low-Detail Mode</div>
                <div className="text-[11px] text-slate-400">
                  Disables dynamic shadow maps for older laptop GPUs
                </div>
              </div>
              <input
                type="checkbox"
                checked={viewSettings.performanceMode}
                onChange={(e) =>
                  gridStore.setViewSetting('performanceMode', e.target.checked)
                }
                className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 w-4 h-4 cursor-pointer"
              />
            </label>

            {/* Reduced Motion */}
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-white">Reduced Motion Preference</div>
                <div className="text-[11px] text-slate-400">
                  Slows camera transitions and particle velocities
                </div>
              </div>
              <input
                type="checkbox"
                checked={viewSettings.reducedMotion}
                onChange={(e) =>
                  gridStore.setViewSetting('reducedMotion', e.target.checked)
                }
                className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>

          {/* Reset All View Settings */}
          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={() => {
                gridStore.setViewSetting('showConductors', true);
                gridStore.setViewSetting('showParticles', true);
                gridStore.setViewSetting('showTowers', true);
                gridStore.setViewSetting('showTerrain', true);
                gridStore.setViewSetting('showLabels', true);
                gridStore.setViewSetting('performanceMode', false);
                gridStore.setViewSetting('reducedMotion', false);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Default Visual Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
