"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Cpu, ShieldAlert, CheckCircle2, XCircle, Lock, ExternalLink } from "lucide-react";
import { createPublicClient, http, formatUnits } from "viem";
import { baseSepolia } from "viem/chains";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http("https://sepolia.base.org")
});

const KERNEL = "0x8b6FB665ee47226e53C70be1E9d43DbD7b886d59";
const USDC_ADDR = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const WETH_ADDR = "0x4200000000000000000000000000000000000006";
const ERC20_ABI = [{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}];

type SimulationType = "IDLE" | "1USDC_RUNNING" | "1USDC_DONE" | "400USDC_RUNNING" | "400USDC_DONE" | "COMPROMISED_RUNNING" | "COMPROMISED_DONE" | "DEFI_ATTACK_RUNNING" | "DEFI_ATTACK_DONE";

export default function AegisMindDashboard() {
  const [usdcBal, setUsdcBal] = useState<string>("...");
  const [wethBal, setWethBal] = useState<string>("...");
  const [ethBal, setEthBal] = useState<string>("...");

  useEffect(() => {
    async function fetchBalances() {
      try {
        const eth = await publicClient.getBalance({ address: KERNEL });
        const usdc = await publicClient.readContract({ address: USDC_ADDR, abi: ERC20_ABI, functionName: "balanceOf", args: [KERNEL] }) as bigint;
        const weth = await publicClient.readContract({ address: WETH_ADDR, abi: ERC20_ABI, functionName: "balanceOf", args: [KERNEL] }) as bigint;
        
        setEthBal(Number(formatUnits(eth, 18)).toFixed(5));
        setUsdcBal(Number(formatUnits(usdc, 6)).toFixed(2));
        setWethBal(Number(formatUnits(weth, 18)).toFixed(6));
      } catch (e) {
        console.error("RPC Error", e);
      }
    }
    fetchBalances();
  }, []);

  const [simulationState, setSimulationState] = useState<SimulationType>("IDLE");
  const [stage, setStage] = useState(0);

  const runSimulation = (type: "1USDC" | "400USDC" | "COMPROMISED" | "DEFI_ATTACK") => {
    setSimulationState(type === "1USDC" ? "1USDC_RUNNING" : type === "400USDC" ? "400USDC_RUNNING" : type === "COMPROMISED" ? "COMPROMISED_RUNNING" : "DEFI_ATTACK_RUNNING");
    setStage(0);
    
    const steps = [600, 1600, 3200, 4400, 5600];
    
    if (type === "COMPROMISED" || type === "DEFI_ATTACK") {
      setTimeout(() => setStage(1), steps[0]);
      setTimeout(() => setStage(2), steps[1]);
      setTimeout(() => setSimulationState(type === "COMPROMISED" ? "COMPROMISED_DONE" : "DEFI_ATTACK_DONE"), steps[1] + 600);
    } else {
      steps.forEach((ms, index) => {
        setTimeout(() => setStage(index + 1), ms);
      });
      setTimeout(() => {
        setSimulationState(type === "1USDC" ? "1USDC_DONE" : "400USDC_DONE");
      }, steps[steps.length - 1] + 600);
    }
  };

  const isSimulating = simulationState.endsWith("_RUNNING");
  const isCompromised = simulationState.startsWith("COMPROMISED");
  const isDefiAttack = simulationState.startsWith("DEFI_ATTACK");
  const isAttack = isCompromised || isDefiAttack;
  const is400USDC = simulationState.startsWith("400USDC");
  const is1USDC = simulationState.startsWith("1USDC");

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1a1a1a] font-sans selection:bg-gray-900 selection:text-white flex flex-col items-center py-20 px-6">
      
      {/* ZONE 1: HERO / THESIS */}
      <header className="max-w-4xl w-full flex flex-col items-center text-center space-y-16">
        <div className="flex flex-col items-center gap-4">
          <ShieldCheck className="w-12 h-12 text-teal-700" strokeWidth={1.5} />
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
            AEGISMIND
          </h1>
          <p className="text-xs md:text-sm font-mono tracking-[0.25em] text-slate-500 uppercase">
            Bounded autonomy for on-chain AI agents
          </p>
        </div>

        <div className="max-w-3xl text-3xl md:text-5xl font-light leading-tight text-gray-800 border-l-[3px] border-gray-900 pl-8 py-2 text-left">
          <p>The AI chooses what it wants to do.</p>
          <p className="mt-5">It never gets to decide what it is allowed to do.</p>
        </div>
        
        <p className="text-sm font-medium text-slate-500 max-w-3xl text-left pl-8 mt-2 -ml-[2px] w-full">
          AI-generated intent is advisory; authorization is enforced deterministically on-chain.
        </p>

        <div className="flex items-center justify-center gap-6 text-xs font-mono tracking-widest text-slate-500 pt-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-600"></div>
            <span className="text-teal-700 font-bold">BASE SEPOLIA • LIVE</span>
          </div>
          <span>|</span>
          <span>KERNEL: {KERNEL.slice(0,6)}...{KERNEL.slice(-4)}</span>
        </div>
      </header>

      {/* ZONE 3: SCENARIO SWITCHER */}
      <div className="w-full max-w-5xl mt-24 mb-16 flex flex-col md:flex-row justify-center border-b border-gray-300">
        <button 
          onClick={() => runSimulation("1USDC")}
          disabled={isSimulating}
          className={`flex-1 pb-4 px-2 border-b-2 font-mono text-xs md:text-[11px] tracking-widest font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed
            ${is1USDC ? 'border-teal-700 text-teal-800 bg-teal-50/50' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
        >
          [ LIVE ] 1 USDC SWAP
        </button>
        <button 
          onClick={() => runSimulation("400USDC")}
          disabled={isSimulating}
          className={`flex-1 pb-4 px-2 border-b-2 font-mono text-xs md:text-[11px] tracking-widest font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed
            ${is400USDC ? 'border-amber-600 text-amber-800 bg-amber-50/50' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
        >
          [ DEMO ] 400 USDC SWAP
        </button>
        <button 
          onClick={() => runSimulation("COMPROMISED")}
          disabled={isSimulating}
          className={`flex-1 pb-4 px-2 border-b-2 font-mono text-xs md:text-[11px] tracking-widest font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed
            ${isCompromised ? 'border-red-700 text-red-800 bg-red-50/50' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
        >
          [ ATTACK ] 2,000 USDC SWAP
        </button>
        <button 
          onClick={() => runSimulation("DEFI_ATTACK")}
          disabled={isSimulating}
          className={`flex-1 pb-4 px-2 border-b-2 font-mono text-xs md:text-[11px] tracking-widest font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed
            ${isDefiAttack ? 'border-red-700 text-red-800 bg-red-50/50' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
        >
          [ SEMANTIC ATTACK ] 1 USDC → PEPE
        </button>
      </div>

      {/* ZONE 2: THE AUTHORIZATION BOUNDARY */}
      {simulationState !== "IDLE" && (
        <section className="w-full max-w-4xl flex flex-col items-center">
          
          {/* AI AGENT REQUEST */}
          <div className={`w-full max-w-md border border-gray-300 bg-white p-8 text-center relative z-10 shadow-sm transition-opacity duration-500 ${stage >= 1 ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex flex-col items-center justify-center mb-6 relative">
              <h3 className="text-xs font-mono font-bold tracking-widest text-slate-500 flex items-center gap-3 mb-1">
                <Cpu className="w-4 h-4"/> 01 AI PROPOSAL
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mb-2">decides WHAT</p>
              <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 border border-red-100 font-bold absolute top-0 right-0 rounded-sm">UNTRUSTED</span>
            </div>
            
            <div className="text-center mb-6">
              <p className={`text-2xl font-bold tracking-tight ${isAttack ? 'text-gray-900' : 'text-gray-900'}`}>
                {isCompromised ? 'SWAP 2,000 USDC' : isDefiAttack ? 'SWAP 1 USDC' : is1USDC ? 'SWAP 1 USDC' : 'SWAP 400 USDC'}
              </p>
              <p className="text-sm font-medium text-slate-500 mt-2">
                {isCompromised ? '→ WETH' : isDefiAttack ? '→ PEPE' : '→ WETH'}
              </p>
            </div>
            
            <div className="flex justify-center">
              <span className={`px-3 py-1 text-[10px] font-mono font-bold tracking-widest border
                ${isAttack ? 'bg-gray-100 border-gray-300 text-gray-600' : 'bg-gray-100 border-gray-300 text-gray-600'}`}>
                REQUESTED
              </span>
            </div>
          </div>

          <div className={`w-px h-12 bg-gray-400 transition-opacity duration-500 delay-300 ${stage >= 2 ? 'opacity-100' : 'opacity-0'}`}></div>

          {/* AEGISMIND CONSTITUTIONAL BOUNDARY */}
          <div className={`w-full border-t-[6px] border-gray-900 bg-white p-10 md:p-14 shadow-sm relative z-10 transition-opacity duration-500 delay-500 ${stage >= 2 ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex flex-col mb-12">
              <h3 className="text-sm font-mono font-bold tracking-widest text-gray-900 mb-2 flex items-center gap-3">
                <Lock className="w-4 h-4"/> AEGISMIND AUTHORIZATION BOUNDARY
              </h3>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-2">
                <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 text-[9px] font-bold rounded-sm border border-slate-200">DETERMINISTIC ENFORCEMENT</span>
                Trusted execution constraints
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-20">
              
              {/* Left: Limits */}
              <div className="border-l-2 border-gray-100 pl-8">
                <h4 className="text-xs font-mono font-bold text-slate-400 mb-2 tracking-widest">ENFORCED LIMITS</h4>
                <p className="text-[10px] text-slate-400 font-medium mb-8">Authorization constraints — enforced by protocol code</p>
                <div className="space-y-5 text-sm font-mono">
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-slate-500">MAX TX</span><span className="text-gray-900 font-bold">$500</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-slate-500">ASSETS</span><span className="text-gray-900 font-bold">USDC / WETH</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-slate-500">ROUTE</span><span className="text-gray-900 font-bold">UNISWAP</span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span className="text-slate-500">DAILY BUDGET</span><span className="text-gray-900 font-bold">$1,000</span>
                  </div>
                </div>
              </div>

              {/* Right: Pipeline Clauses */}
              <div className="border-l-2 border-gray-100 pl-8">
                <h4 className="text-xs font-mono font-bold text-slate-400 mb-8 tracking-widest">VERIFICATION CLAUSES</h4>
                <div className="space-y-8">
                  
                  {/* §1 Policy */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-mono font-bold ${stage >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>02 POLICY CHECK</span>
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded-sm border border-slate-200 font-bold">DETERMINISTIC</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mb-2">decides WHAT IS ALLOWED</p>
                      
                      {stage >= 2 && (
                        <div className={`text-[10px] font-mono mt-2 leading-relaxed ${isAttack ? 'text-red-600' : 'text-slate-500'}`}>
                          {isCompromised ? (
                            <div>
                              <div>Target ........ PASS</div>
                              <div>Selector ...... PASS</div>
                              <div>Amount ........ FAIL</div>
                              <div className="mt-1 font-bold">Reason: ExceedsMaxAmount()</div>
                            </div>
                          ) : isDefiAttack ? (
                            <div>
                              <div>Target ........ PASS</div>
                              <div>Selector ...... PASS</div>
                              <div>Command ....... PASS</div>
                              <div>Path .......... FAIL</div>
                              <div className="mt-1 font-bold">Reason: InvalidToken()</div>
                            </div>
                          ) : 'Target, token pair, and calldata are valid.'}
                        </div>
                      )}
                    </div>
                    {stage >= 2 && (
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 border ${isAttack ? 'bg-red-50 text-red-700 border-red-200' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                        {isAttack ? 'FAIL' : 'PASS'}
                      </span>
                    )}
                  </div>

                  {/* §2 Hook */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-mono font-bold ${stage >= 3 ? 'text-gray-900' : 'text-gray-400'}`}>03 HOOK</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mb-2">checks execution-time reality</p>
                      
                      {stage >= 3 && !isAttack && (
                        <p className={`text-[10px] font-mono mt-2 leading-relaxed ${is400USDC ? 'text-amber-600' : 'text-slate-500'}`}>
                          {is1USDC ? 'Oracle floor vs pool quote satisfied.' : 'Configured oracle floor is stricter than pool quote.'}
                        </p>
                      )}
                      {stage >= 2 && isAttack && <p className="text-[10px] font-mono text-slate-400 italic mt-2 font-bold">NOT REACHED</p>}
                    </div>
                    {stage >= 3 && !isAttack && (
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 border ${is1USDC ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {is1USDC ? 'PASS' : 'FAIL'}
                      </span>
                    )}
                  </div>

                  {/* §3 Kernel */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-mono font-bold ${stage >= 4 ? 'text-gray-900' : 'text-gray-400'}`}>04 KERNEL</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mb-2">enforces permissioned execution</p>
                      
                      {stage >= 4 && is1USDC && <p className="text-[10px] font-mono text-slate-500 mt-2">Permission 0x26fd4b3c active.</p>}
                      {((isAttack && stage >= 2) || (is400USDC && stage >= 3)) && <p className="text-[10px] font-mono text-slate-400 italic mt-2 font-bold">NOT REACHED</p>}
                    </div>
                    {stage >= 4 && is1USDC && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 border bg-teal-50 text-teal-700 border-teal-200">PASS</span>
                    )}
                  </div>

                </div>
              </div>

            </div>
          </div>

          <div className={`w-px h-12 bg-gray-400 transition-opacity duration-500 delay-300 ${simulationState.endsWith("_DONE") ? 'opacity-100' : 'opacity-0'}`}></div>

          {/* FINAL RESULT */}
          <div className={`w-full max-w-xl transition-opacity duration-700 delay-300 ${simulationState.endsWith("_DONE") ? 'opacity-100' : 'opacity-0'} relative z-10`}>
            
            {simulationState === "COMPROMISED_DONE" && (
              <div className="border border-gray-300 bg-white p-10 text-center shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                <h2 className="text-lg font-bold tracking-widest text-gray-900 mb-2 flex items-center justify-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-gray-500"/> 05 TREASURY: AUTHORITY VIOLATION
                </h2>
                <p className="text-[10px] text-slate-400 font-medium mb-8 text-center uppercase">assets remain under bounded authority</p>
                
                <div className="grid grid-cols-2 gap-y-4 max-w-sm mx-auto text-sm font-mono mb-6 border-b border-gray-200 pb-6">
                  <div className="text-slate-500 text-left">REQUESTED</div>
                  <div className="text-gray-900 text-right font-bold">SWAP 2,000 USDC</div>
                  
                  <div className="text-slate-500 text-left">VIOLATION</div>
                  <div className="text-red-700 text-right font-bold">Exceeds max transaction amount ($500)</div>
                </div>

                <div className="space-y-4">
                  <p className="text-red-700 font-bold tracking-widest flex items-center justify-center gap-2"><XCircle className="w-4 h-4"/> WOULD BE REJECTED</p>
                  <p className="text-teal-700 font-bold tracking-widest flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4"/> TREASURY UNCHANGED</p>
                  <p className="text-xs text-slate-500 italic pt-2 font-mono">SIMULATED — NO TRANSACTION SUBMITTED</p>
                </div>
              </div>
            )}

            {simulationState === "DEFI_ATTACK_DONE" && (
              <div className="border border-gray-300 bg-white p-10 text-center shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                <h2 className="text-lg font-bold tracking-widest text-gray-900 mb-2 flex items-center justify-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-gray-500"/> 05 TREASURY: AUTHORITY VIOLATION
                </h2>
                <p className="text-[10px] text-slate-400 font-medium mb-8 text-center uppercase">assets remain under bounded authority</p>
                
                <div className="grid grid-cols-2 gap-y-4 max-w-sm mx-auto text-sm font-mono mb-6 border-b border-gray-200 pb-6">
                  <div className="text-slate-500 text-left">REQUESTED</div>
                  <div className="text-gray-900 text-right font-bold">SWAP 1 USDC → PEPE</div>
                  
                  <div className="text-slate-500 text-left">VIOLATION</div>
                  <div className="text-red-700 text-right font-bold">Unauthorized token path</div>
                </div>

                <div className="bg-red-50 text-red-800 p-5 mb-8 text-sm text-left border border-red-100 rounded-sm">
                  <p className="font-bold mb-2 flex items-center gap-2"><ShieldAlert className="w-4 h-4"/> Allowlisted contract ≠ allowlisted behavior.</p>
                  <p className="text-xs leading-relaxed">A legitimate Universal Router target can still be rejected when its encoded swap semantics violate the policy.</p>
                </div>

                <div className="space-y-4">
                  <p className="text-red-700 font-bold tracking-widest flex items-center justify-center gap-2"><XCircle className="w-4 h-4"/> WOULD BE REJECTED</p>
                  <p className="text-teal-700 font-bold tracking-widest flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4"/> TREASURY UNCHANGED</p>
                  <p className="text-xs text-slate-500 italic pt-2 font-mono">SIMULATED — NO TRANSACTION SUBMITTED</p>
                </div>
              </div>
            )}

            {simulationState === "400USDC_DONE" && (
              <div className="border border-gray-300 bg-white p-10 text-center shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
                <h2 className="text-lg font-bold tracking-widest text-gray-900 mb-2 flex items-center justify-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-gray-500"/> 05 TREASURY: EXCEEDS SLIPPAGE
                </h2>
                <p className="text-[10px] text-slate-400 font-medium mb-8 text-center uppercase">assets remain under bounded authority</p>
                
                <div className="space-y-5 max-w-sm mx-auto">
                  <p className="text-slate-600 leading-relaxed text-sm">The configured oracle-derived execution floor is stricter than the current Base Sepolia pool quote.</p>
                  <p className="text-amber-700 font-bold tracking-widest flex items-center justify-center gap-2 pt-4"><XCircle className="w-4 h-4"/> WOULD REVERT AT HOOK</p>
                  <p className="text-teal-700 font-bold tracking-widest flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4"/> TREASURY UNCHANGED</p>
                  <p className="text-xs text-slate-500 italic pt-2 font-mono">DETERMINISTIC DEMO SCENARIO — NOT SUBMITTED</p>
                </div>
              </div>
            )}

            {simulationState === "1USDC_DONE" && (
              <div className="border border-gray-300 bg-white p-10 text-center shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-teal-600"></div>
                <h2 className="text-lg font-bold tracking-widest text-gray-900 mb-2 flex items-center justify-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600"/> 05 TREASURY: ALLOWED
                </h2>
                <p className="text-[10px] text-slate-400 font-medium mb-8 text-center uppercase">assets remain under bounded authority</p>
                
                <div className="space-y-6 max-w-sm mx-auto">
                  <p className="text-slate-600 leading-relaxed text-sm">The 1 USDC proposal aligns perfectly with the security configuration and dynamic pricing floor.</p>
                  
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-teal-700 font-bold tracking-widest flex items-center justify-center gap-2 mb-4 mt-2">LIVE • EXECUTED ON-CHAIN</p>
                    <a href="https://sepolia.basescan.org/tx/0xa3c88381804b7b5e0783cc8c0ae5028b8aaeadb2d211add92e9a8286d34f1c6b" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-mono px-4 py-3 hover:text-gray-900 hover:border-gray-400 transition-colors break-all mx-auto text-center w-full justify-center">
                      Tx: 0xa3c883...4f1c6b <ExternalLink className="w-3 h-3"/>
                    </a>
                  </div>
                </div>
              </div>
            )}

          </div>

        </section>
      )}

      {/* FINAL VISUAL MESSAGE */}
      {simulationState !== "IDLE" && (
        <div className="mt-20 mb-8 text-center max-w-2xl px-6 animate-in fade-in duration-1000 delay-700">
          <p className="text-lg md:text-xl font-bold text-gray-900 mb-2">Compromising the agent does not grant it new authority.</p>
          <p className="text-sm text-slate-500">The agent can choose an action. The protocol decides whether that action is permitted.</p>
        </div>
      )}

      {/* ZONE 4: PROOF / EVIDENCE */}
      <footer className="w-full max-w-5xl mt-auto pt-16 pb-8">
        <h3 className="text-xs font-mono font-bold tracking-widest text-slate-400 mb-12 text-center border-b border-gray-200 pb-4">ON-CHAIN ENFORCEMENT</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-gray-900 mb-6 tracking-wider">LIVE ON-CHAIN</h4>
            <div className="space-y-2 text-xs font-mono text-slate-500">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span>ETH Balance</span><span className="text-gray-900 font-medium">{ethBal}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span>USDC Balance</span><span className="text-gray-900 font-medium">{usdcBal}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span>WETH Balance</span><span className="text-gray-900 font-medium">{wethBal}</span>
              </div>
              <p className="mt-4 text-teal-700 flex items-center gap-2"><CheckCircle2 className="w-3 h-3"/> 1 USDC swap successfully executed</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-gray-900 mb-6 tracking-wider">ON-CHAIN COMPONENTS</h4>
            <div className="space-y-2 text-xs font-mono text-slate-500">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span>Policy</span>
                <a href="https://sepolia.basescan.org/address/0x681B33cEe32267d80Ad72f0B92660D902989009D" target="_blank" rel="noreferrer" className="text-slate-600 hover:text-gray-900 font-medium">0x681B...009D</a>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span>Hook</span>
                <a href="https://sepolia.basescan.org/address/0x8aC3a95Fe5410618b36cBbE054184B23521c421b" target="_blank" rel="noreferrer" className="text-slate-600 hover:text-gray-900 font-medium">0x8aC3...421b</a>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span>Signer</span>
                <a href="https://sepolia.basescan.org/address/0x2bedB827302B574fB3aE8907eAAB671e4CC84a9D" target="_blank" rel="noreferrer" className="text-slate-600 hover:text-gray-900 font-medium">0x2bed...4a9D</a>
              </div>
              <div className="flex justify-between pb-2">
                <span>Kernel</span>
                <a href="https://sepolia.basescan.org/address/0x8b6FB665ee47226e53C70be1E9d43DbD7b886d59" target="_blank" rel="noreferrer" className="text-slate-600 hover:text-gray-900 font-medium">0x8b6F...6d59</a>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-gray-900 mb-6 tracking-wider">ARCHITECTURAL / PROTOTYPE</h4>
            <div className="space-y-2 text-xs font-mono text-slate-500">
              <p className="leading-relaxed">Security and integration test suite passing locally, verifying boundary isolation across malicious inputs.</p>
              <p className="mt-4 text-slate-400 flex items-center gap-2 pt-2 border-t border-gray-200"><Cpu className="w-3 h-3"/> SP1 Architecture Implemented (Not Live)</p>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
