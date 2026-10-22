import React from 'react';
import { X, Cpu, GitFork, ShieldAlert, Sparkles, Binary, CheckCircle2 } from 'lucide-react';

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MethodologyModal: React.FC<MethodologyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                GridWeaver Hybrid Quantum-Classical Framework
              </h2>
              <p className="text-xs text-slate-400">
                Mathematical QUBO Formulation, QAOA Architecture & Digital Twin Methodology
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-5 space-y-6 text-sm text-slate-300">
          {/* Problem Statement Box */}
          <div className="p-4 rounded-lg bg-slate-800/60 border border-slate-700">
            <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Core Mission & Scope
            </div>
            <p className="text-xs text-slate-300 leading-relaxed italic">
              “GridWeaver proposes a hybrid quantum-classical decision-support framework that models a simplified electricity distribution network and optimizes power restoration under simulated failure scenarios. The system formulates a constrained restoration and resource-allocation problem as a Quadratic Unconstrained Binary Optimization (QUBO) model and implements the Quantum Approximate Optimization Algorithm (QAOA) using Qiskit.”
            </p>
          </div>

          {/* QUBO Formulation */}
          <div>
            <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <Binary className="w-4 h-4 text-cyan-400" />
              1. Mathematical QUBO Formulation
            </h3>
            <p className="text-xs text-slate-300 mb-3">
              Power grid restoration is formulated as maximizing prioritized demand while enforcing line thermal ratings, voltage stability, and radial topology constraints. Binary decision variables x_i &isin; &#123;0, 1&#125; denote whether facility/line i is energized:
            </p>
            <div className="p-3 rounded bg-slate-950/90 font-mono text-xs text-cyan-300 border border-slate-800 overflow-x-auto space-y-1.5">
              <div>H(x) = - &sum; w_i &middot; P_i &middot; x_i  +  &lambda;_capacity &sum; max(0, &sum; F_ij - C_k)&sup2;  +  &lambda;_rad &sum; (x_i &middot; x_j - loop_penalty)</div>
              <div className="text-[11px] text-slate-400">
                where: w_i = priority weight (Hospital=100, Water=90, Residential=40), P_i = load demand (MW), C_k = line MVA capacity.
              </div>
            </div>
          </div>

          {/* QAOA Quantum Algorithm Architecture */}
          <div>
            <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <GitFork className="w-4 h-4 text-purple-400" />
              2. Quantum Approximate Optimization Algorithm (QAOA)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="font-semibold text-purple-300">Quantum Ansatz & Gates</div>
                <p className="text-slate-400">
                  Parameterizes cost Hamiltonian U(C, &gamma;) = exp(-i&gamma; H_C) and transverse mixer Hamiltonian U(B, &beta;) = exp(-i&beta; &sum; X_i) across p layers on Qiskit Aer statevector backend.
                </p>
                <div className="font-mono text-[11px] text-purple-400 bg-purple-950/40 p-2 rounded">
                  {'|ψ(γ, β)⟩ = ∏ [ exp(-iβ_l H_B) exp(-iγ_l H_C) ] |+⟩^⊗n'}
                </div>
              </div>
              <div className="p-3 rounded bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="font-semibold text-emerald-300">Classical Optimizer & Baseline</div>
                <p className="text-slate-400">
                  COBYLA / Nelder-Mead outer loop updates (&gamma;, &beta;) parameters. Compared against classical Mixed-Integer Linear Programming (MIP) solver baseline (COIN-OR CBC / HiGHS).
                </p>
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px]">
                  <CheckCircle2 className="w-4 h-4" /> Benchmarked for approximation ratio & runtime
                </div>
              </div>
            </div>
          </div>

          {/* Current Integration Stage Note */}
          <div className="p-4 rounded-lg bg-amber-950/40 border border-amber-600/40 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 leading-relaxed">
              <strong className="text-amber-300">Phase 1 Delivery (Frontend Digital Twin):</strong> This application provides the interactive 3D digital twin, graph connectivity simulation, scenario failure injection, and frontend heuristic demonstration. The Python backend (FastAPI, NetworkX, Qiskit QAOA) connects cleanly via the prepared API client without fabricating quantum solver results.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
};
