import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Server, 
  Binary, 
  GitFork, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert, 
  Sparkles,
  Play,
  Activity,
  Zap,
  Clock,
  Check
} from 'lucide-react';
import { gridWeaverApi, QAOASolverResponse } from '../../services/apiClient';
import { useGridStore, gridStore } from '../../store/gridStore';

export const QuantumSolverPage: React.FC = () => {
  const { topology, backupCapacityMw, criticalityWeight, activeScenarioId } = useGridStore();
  const [isChecking, setIsChecking] = useState(false);
  const [isRunningQAOA, setIsRunningQAOA] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'offline' | 'online' | 'untested'>('untested');
  const [backendUrl, setBackendUrl] = useState('http://localhost:8000');
  const [ansatzDepth, setAnsatzDepth] = useState<number>(2);
  const [qaoaResult, setQaoaResult] = useState<QAOASolverResponse | null>(null);
  const [qaoaError, setQaoaError] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setIsChecking(true);
    gridWeaverApi.setBaseUrl(backendUrl);
    const health = await gridWeaverApi.checkHealth();
    setIsChecking(false);
    if (health && health.status === 'healthy') {
      setBackendStatus('online');
    } else {
      setBackendStatus('offline');
    }
  };

  const handleRunQAOA = async () => {
    setIsRunningQAOA(true);
    setQaoaError(null);
    try {
      const faultedEdges = topology.edges.filter((e) => e.status === 'faulted').map((e) => e.id);
      const faultedNodes = topology.nodes.filter((n) => n.status === 'faulted').map((n) => n.id);
      const failedComps = [...faultedEdges, ...faultedNodes];
      if (failedComps.length === 0) {
        failedComps.push('line-691'); // Default test failure if baseline
      }

      const res = await gridWeaverApi.solveQuantumQAOA({
        failed_components: failedComps,
        backup_capacity_mw: backupCapacityMw,
        objective_weight_critical: criticalityWeight,
        ansatz_depth_p: ansatzDepth,
        shots: 1024,
      });

      if (res) {
        setQaoaResult(res);
        setBackendStatus('online');
      } else {
        setQaoaError('QAOA solver request failed. Verify that FastAPI backend is running on port 8000.');
      }
    } catch (err: any) {
      setQaoaError(err?.message || 'Error executing QAOA solver');
    } finally {
      setIsRunningQAOA(false);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#090d16] p-6 lg:p-8 space-y-6 text-slate-100 select-none">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl font-bold tracking-tight text-white">
              Hybrid Quantum-Classical Optimization Integration
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            FastAPI, NetworkX, and Qiskit QAOA backend bridge for combinatorial grid restoration.
          </p>
        </div>

        {/* Backend Status Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono ${
          backendStatus === 'online'
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            : 'bg-slate-900 border-slate-800 text-slate-300'
        }`}>
          <Server className={`w-4 h-4 ${backendStatus === 'online' ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className="text-slate-400">Status:</span>
          <span className={backendStatus === 'online' ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>
            {backendStatus === 'online' ? 'FastAPI Backend Online' : 'Backend Offline (Demo Mode)'}
          </span>
        </div>
      </div>

      {/* Prominent Truth-in-Science Disclosure */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-white">Scientific Scope & Integrity:</strong> Real QUBO Hamiltonian mapping and Qiskit Aer quantum statevector simulation execute directly on the Python FastAPI service. In accordance with quantum computing standards, no artificial quantum speedup is fabricated over mature classical branch-and-cut for NISQ formulations.
        </div>
      </div>

      {/* Backend Connection Diagnostics Box */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          Python FastAPI Backend Service Connection
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[11px] text-slate-400 block mb-1">
              Backend Service Endpoint URL
            </label>
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="http://localhost:8000"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={checkConnection}
              disabled={isChecking}
              className="w-full py-2 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Pinging Service...' : 'Ping /health Endpoint'}</span>
            </button>
          </div>
        </div>

        {backendStatus === 'offline' && (
          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-600/30 text-xs text-amber-200 flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Backend offline. Run <code className="text-amber-300 font-bold">uvicorn main:app --port 8000</code> in your Python backend environment to activate live QAOA solving.</span>
          </div>
        )}
      </div>

      {/* QAOA Execution Trigger Box */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/80 to-slate-900 border border-purple-500/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              Run Quantum Approximate Optimization Algorithm (QAOA)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Builds QUBO, maps to Ising Hamiltonian, and executes parameterized statevector ansatz on Qiskit Aer.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Depth (p):</span>
              <select
                value={ansatzDepth}
                onChange={(e) => setAnsatzDepth(Number(e.target.value))}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none"
              >
                <option value={1}>p = 1 layer</option>
                <option value={2}>p = 2 layers</option>
                <option value={3}>p = 3 layers</option>
              </select>
            </div>

            <button
              onClick={handleRunQAOA}
              disabled={isRunningQAOA}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-purple-950/50 transition-all cursor-pointer"
            >
              <Cpu className={`w-4 h-4 ${isRunningQAOA ? 'animate-spin' : ''}`} />
              <span>{isRunningQAOA ? 'Synthesizing Circuit & Solving...' : 'Execute QAOA on Qiskit Aer'}</span>
            </button>
          </div>
        </div>

        {qaoaError && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-300 flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{qaoaError}</span>
          </div>
        )}

        {qaoaResult && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-purple-500/50 space-y-4">
            <div className="flex flex-wrap items-center justify-between pb-2 border-b border-slate-800 gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-white">{qaoaResult.plan.title}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                  {qaoaResult.quantumSimulator}
                </span>
              </div>
              <div className="text-xs font-mono text-slate-400">
                Runtime: <span className="text-purple-300 font-bold">{qaoaResult.runtimeMs} ms</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Restored Demand</span>
                <span className="text-emerald-400 font-bold text-base">{qaoaResult.restored_demand_mw} MW</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Critical Restored</span>
                <span className="text-cyan-300 font-bold text-base">{qaoaResult.restored_critical_demand_mw} MW</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Approximation Ratio</span>
                <span className="text-purple-300 font-bold text-base">{(qaoaResult.approximationRatio * 100).toFixed(1)}%</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Best Bitstring</span>
                <span className="text-amber-300 font-bold text-xs truncate block">{qaoaResult.best_bitstring}</span>
              </div>
            </div>

            <div className="text-xs font-mono text-slate-400 space-y-1">
              <div>Quantum Circuit: {qaoaResult.circuitSummary.numQubits} Qubits | Depth: {qaoaResult.circuitSummary.depth} | {qaoaResult.circuitSummary.numGates} Quantum Gates</div>
              <div>Restored Facilities: <span className="text-slate-200">{qaoaResult.restored_facilities.join(', ')}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* QUBO Mathematical Formulation Card */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white font-sans flex items-center gap-2">
            <Binary className="w-4 h-4 text-purple-400" />
            QUBO Formulation Matrix & Decision Variables
          </h2>
          <span className="text-[11px] text-purple-400 font-mono">
            12 Binary Decision Variables [x₀ ... x₁₁]
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 text-slate-300">
          <div className="text-cyan-300 font-bold">
            Objective Hamiltonian: H(x) = - &sum; w_i &middot; P_i &middot; x_i + &lambda;_cap &sum; (Violations)&sup2; + &lambda;_rad &sum; (Cycles)
          </div>
          <div className="text-[11px] text-slate-400 font-sans leading-relaxed">
            Where each binary variable represents circuit breaker, tie switch, and standby generator states:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2 text-[11px]">
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-cyan-400 font-bold">x₀:</span> St. Jude Trauma Hospital (14 MW)
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-cyan-400 font-bold">x₁:</span> Highland Water Treatment (10 MW)
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-cyan-400 font-bold">x₂:</span> Metro Emergency EOC (6 MW)
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-cyan-400 font-bold">x₃:</span> Apex Semiconductor Fab (45 MW)
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-cyan-400 font-bold">x₄:</span> Riverpoint Cargo Port (24 MW)
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-cyan-400 font-bold">x₅:</span> North Ridge Township (38 MW)
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-cyan-400 font-bold">x₆:</span> Downtown Commercial (62 MW)
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-purple-400 font-bold">x₇:</span> Close Tie-Line TL-692 (69 kV)
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-purple-400 font-bold">x₈:</span> Close Microgrid Tie MF-01
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-amber-400 font-bold">x₉:</span> Hospital Diesel Generator (10 MW)
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-amber-400 font-bold">x₁₀:</span> Water Standby Generator (5 MW)
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-amber-400 font-bold">x₁₁:</span> EOC Standby Generator (6 MW)
            </div>
          </div>
        </div>
      </div>

      {/* QAOA Quantum Circuit Architecture */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <GitFork className="w-4 h-4 text-purple-400" />
          QAOA Quantum Ansatz Specification
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-slate-400">Ansatz Depth (p-layers)</span>
            <div className="text-lg font-bold text-purple-300">p = {ansatzDepth} layers</div>
            <div className="text-[10px] text-slate-500">Alternating cost & mixer gates</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-slate-400">Target Quantum Simulator</span>
            <div className="text-lg font-bold text-cyan-300">Qiskit Aer</div>
            <div className="text-[10px] text-slate-500">AerSimulator(method='statevector')</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-slate-400">Classical Solver Baseline</span>
            <div className="text-lg font-bold text-emerald-400">OR-Tools CBC / SCIP</div>
            <div className="text-[10px] text-slate-500">Branch-and-Cut benchmark</div>
          </div>
        </div>
      </div>
    </div>
  );
};
