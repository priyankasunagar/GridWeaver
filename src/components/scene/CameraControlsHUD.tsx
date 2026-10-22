import React, { useState } from 'react';
import { 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  ArrowDown, 
  RotateCw, 
  HelpCircle, 
  Compass,
  Maximize2
} from 'lucide-react';
import { gridStore } from '../../store/gridStore';

// Global camera action dispatcher
type CameraActionType = 
  | 'rotate_left' 
  | 'rotate_right' 
  | 'pan_left' 
  | 'pan_right' 
  | 'pan_up' 
  | 'pan_down' 
  | 'zoom_in' 
  | 'zoom_out' 
  | 'reset';

type CameraActionListener = (action: CameraActionType) => void;
const listeners = new Set<CameraActionListener>();

export const cameraActions = {
  dispatch: (action: CameraActionType) => {
    listeners.forEach((fn) => fn(action));
  },
  subscribe: (fn: CameraActionListener) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};

export const CameraControlsHUD: React.FC = () => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2 pointer-events-auto select-none">
      {/* On-Screen Camera Navigation Cluster */}
      <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl p-2 shadow-2xl flex flex-col items-center gap-1.5 text-slate-300">
        <div className="flex items-center justify-between w-full px-1 pb-1 border-b border-slate-800/80 text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1 font-semibold text-cyan-400">
            <Compass className="w-3 h-3" /> 3D NAV
          </span>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="hover:text-cyan-300 transition-colors"
            title="Gesture & Navigation Controls Guide"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Directional Pan Pad */}
        <div className="grid grid-cols-3 gap-1 my-0.5">
          <div />
          <button
            onClick={() => cameraActions.dispatch('pan_up')}
            title="Pan Camera Up"
            className="w-7 h-7 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white flex items-center justify-center transition-colors text-slate-400 hover:border-slate-700"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <div />

          <button
            onClick={() => cameraActions.dispatch('pan_left')}
            title="Pan Camera Left"
            className="w-7 h-7 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white flex items-center justify-center transition-colors text-slate-400 hover:border-slate-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              gridStore.setCameraPreset('overview');
              gridStore.selectComponent(null);
              cameraActions.dispatch('reset');
            }}
            title="Reset Camera to Overview"
            className="w-7 h-7 rounded bg-cyan-950/80 border border-cyan-800 hover:bg-cyan-900 text-cyan-300 flex items-center justify-center transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => cameraActions.dispatch('pan_right')}
            title="Pan Camera Right"
            className="w-7 h-7 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white flex items-center justify-center transition-colors text-slate-400 hover:border-slate-700"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <div />
          <button
            onClick={() => cameraActions.dispatch('pan_down')}
            title="Pan Camera Down"
            className="w-7 h-7 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white flex items-center justify-center transition-colors text-slate-400 hover:border-slate-700"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <div />
        </div>

        {/* Orbit & Zoom Controls Strip */}
        <div className="flex items-center gap-1 pt-1 border-t border-slate-800/80 w-full justify-center">
          <button
            onClick={() => cameraActions.dispatch('rotate_left')}
            title="Orbit View Left"
            className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white text-slate-400"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={() => cameraActions.dispatch('zoom_in')}
            title="Zoom In"
            className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white text-slate-400"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => cameraActions.dispatch('zoom_out')}
            title="Zoom Out"
            className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white text-slate-400"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => cameraActions.dispatch('rotate_right')}
            title="Orbit View Right"
            className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white text-slate-400"
          >
            <RotateCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Gesture Help Card Popover */}
      {showHelp && (
        <div className="bg-slate-900/95 border border-slate-700 rounded-xl p-3.5 shadow-2xl text-xs w-64 space-y-2 text-slate-300">
          <div className="font-semibold text-white flex items-center justify-between pb-1 border-b border-slate-800">
            <span>3D Camera Controls</span>
            <button
              onClick={() => setShowHelp(false)}
              className="text-slate-500 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1.5 text-[11px] font-mono">
            <div className="flex items-center justify-between">
              <span className="text-cyan-400">Left Click + Drag</span>
              <span className="text-slate-300">Orbit / Rotate</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-cyan-400">Right Click + Drag</span>
              <span className="text-slate-300">Pan Left/Right/Up</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-cyan-400">Scroll Wheel</span>
              <span className="text-slate-300">Zoom In / Out</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-purple-400">Touch 1-Finger</span>
              <span className="text-slate-300">Rotate View</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-purple-400">Touch 2-Finger</span>
              <span className="text-slate-300">Pan & Pinch Zoom</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 font-sans leading-tight">
            * You can also use the on-screen arrows above or preset camera buttons in the top bar.
          </p>
        </div>
      )}
    </div>
  );
};
