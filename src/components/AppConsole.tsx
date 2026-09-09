import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal as TerminalIcon, 
  Copy, 
  Check, 
  Trash2, 
  Play, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Maximize2, 
  Minimize2,
  Lock,
  Unlock,
  Radio,
  Wifi,
  BatteryMedium,
  Download
} from 'lucide-react';
import { LogEntry, ExploitPhase, DeviceProfile } from '../types';

interface AppConsoleProps {
  logs: LogEntry[];
  phase: ExploitPhase;
  hasControllerBinder: boolean;
  selectedDevice: DeviceProfile;
  onRunUserspace: () => void;
  onRunKernelSU: () => void;
  onPatchAction: (actionCode: number, actionName: string) => void;
  onClearLogs: () => void;
  isExploiting: boolean;
  selinuxPermissive: boolean;
  kernelsuActive: boolean;
}

export const AppConsole: React.FC<AppConsoleProps> = ({
  logs,
  phase,
  hasControllerBinder,
  selectedDevice,
  onRunUserspace,
  onRunKernelSU,
  onPatchAction,
  onClearLogs,
  isExploiting,
  selinuxPermissive,
  kernelsuActive,
}) => {
  const [copied, setCopied] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'exploit' | 'system' | 'kernel'>('all');
  const [expandedView, setExpandedView] = useState(false);
  const [currentTime, setCurrentTime] = useState('23:19');
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = () => {
    const fullText = logs.map((l) => `[${l.timestamp}] [${l.tag}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    const fullText = logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.tag}] ${l.message}`).join('\n');
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lspromise-logcat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter((log) => {
    if (logFilter === 'all') return true;
    if (logFilter === 'exploit') return log.level === 'exploit' || log.tag === 'LSPromise';
    if (logFilter === 'system') return log.tag.includes('system_server') || log.tag.includes('Telecom');
    if (logFilter === 'kernel') return log.tag.includes('DirtyFrag') || log.tag.includes('ksud') || log.tag.includes('Kernel');
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Device Target Advisory */}
      {!selectedDevice.isVulnerable && (
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-4 flex items-start gap-3 text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-amber-100">
              Notice: {selectedDevice.name} is marked as unsupported/patched
            </p>
            <p className="text-amber-300/90">{selectedDevice.notes}</p>
            <p className="text-amber-400/80 font-mono">
              Switch to &quot;Google Pixel 10 (Target)&quot; in the header to observe the 100% deterministic escalation.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Left Phone Mockup, Right Live Terminal */}
      <div className={`grid gap-6 ${expandedView ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
        
        {/* LEFT COLUMN: Android Phone Screen (Exact Replica of LSPromise UI) */}
        <div className={expandedView ? 'hidden' : 'lg:col-span-5 flex flex-col items-center'}>
          <div className="w-full max-w-[360px] bg-zinc-950 rounded-[40px] border-4 border-zinc-700 shadow-2xl p-4 flex flex-col relative overflow-hidden">
            
            {/* Phone Camera Hole & Ear Speaker */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <div className="w-12 h-1 bg-zinc-800 rounded-full"></div>
              <div className="w-3 h-3 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-950"></div>
              </div>
            </div>

            {/* Android Status Bar */}
            <div className="pt-3 pb-2 px-2 flex items-center justify-between text-[11px] font-medium text-zinc-400 select-none">
              <span>{currentTime}</span>
              <div className="flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-zinc-400" />
                <Wifi className="w-3 h-3 text-zinc-400" />
                <div className="flex items-center">
                  <BatteryMedium className="w-3.5 h-3.5 text-zinc-300" />
                  <span className="text-[9px] font-mono ml-0.5">85%</span>
                </div>
              </div>
            </div>

            {/* Android App Bar */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-t-xl px-3 py-2.5 flex items-center justify-between mb-3 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-red-600/90 text-white flex items-center justify-center text-xs font-bold">
                  ⚡
                </span>
                <div>
                  <h2 className="text-xs font-bold text-white tracking-wide">LSPromise</h2>
                  <p className="text-[10px] text-zinc-400 font-mono">org.lsposed.lspromise</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                v1.0.0
              </span>
            </div>

            {/* Phone Content Screen (matches main.xml) */}
            <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-b-xl p-3 flex-1 flex flex-col space-y-2.5 min-h-[460px]">
              
              {/* Button: Run userspace exploit */}
              <button
                id="btn-run-userspace"
                onClick={onRunUserspace}
                disabled={isExploiting}
                className="w-full py-3 px-4 rounded-lg bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-semibold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run userspace exploit</span>
              </button>

              {/* Dynamic Buttons (revealed when networkstack binder is received) */}
              {hasControllerBinder && (
                <div className="space-y-2 pt-1 border-t border-zinc-800/80 animate-fadeIn">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] uppercase font-mono text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Binder Received
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">UID 1073</span>
                  </div>

                  {/* Button: Run kernel exploit and load KernelSU (patchAll) */}
                  <button
                    id="btn-run-kernelsu"
                    onClick={onRunKernelSU}
                    disabled={isExploiting || kernelsuActive}
                    className="w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>
                      {kernelsuActive
                        ? 'KernelSU Active (Rooted)'
                        : 'Run kernel exploit and load KernelSU'}
                    </span>
                  </button>

                  {/* Granular Exploit Buttons */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      id="btn-patch-mod"
                      onClick={() => onPatchAction(1, 'patchMod')}
                      disabled={isExploiting}
                      className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded border border-zinc-700 text-[11px] font-mono text-center transition-colors cursor-pointer"
                    >
                      patchMod
                    </button>
                    <button
                      id="btn-patch-libc"
                      onClick={() => onPatchAction(2, 'patchLibc')}
                      disabled={isExploiting}
                      className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded border border-zinc-700 text-[11px] font-mono text-center transition-colors cursor-pointer"
                    >
                      patchLibc
                    </button>
                    <button
                      id="btn-patch-cxx"
                      onClick={() => onPatchAction(3, 'patchCxx')}
                      disabled={isExploiting}
                      className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded border border-zinc-700 text-[11px] font-mono text-center transition-colors cursor-pointer"
                    >
                      patchCxx
                    </button>
                    <button
                      id="btn-fork-process"
                      onClick={() => onPatchAction(4, 'forkProcess')}
                      disabled={isExploiting}
                      className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded border border-zinc-700 text-[11px] font-mono text-center transition-colors cursor-pointer"
                    >
                      forkProcess
                    </button>
                  </div>
                </div>
              )}

              {/* Button: copy text */}
              <button
                id="btn-copy-text"
                onClick={handleCopy}
                className="w-full py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard' : 'copy text'}</span>
              </button>

              {/* Status View Area inside Phone (android:id="@+id/status") */}
              <div className="mt-2 flex-1 bg-black/70 rounded-lg p-2.5 border border-zinc-800 text-[10px] font-mono text-zinc-300 overflow-y-auto max-h-[190px] space-y-1 select-text">
                <div className="text-zinc-500 pb-1 border-b border-zinc-800 flex items-center justify-between">
                  <span>TextView: status</span>
                  <span>{logs.length} lines</span>
                </div>
                {logs.length === 0 ? (
                  <p className="text-zinc-600 italic py-2">No activity logged yet. Tap &quot;Run userspace exploit&quot; to begin.</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="leading-tight break-all">
                      <span className="text-zinc-500">[{log.tag}]</span> {log.message}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Android Home Bar */}
            <div className="py-2 flex justify-center">
              <div className="w-32 h-1 bg-zinc-600 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Full Logcat & Kernel Terminal Console */}
        <div className={expandedView ? 'col-span-1' : 'lg:col-span-7 flex flex-col'}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-full shadow-xl">
            
            {/* Terminal Header */}
            <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TerminalIcon className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white font-mono">
                  Android Logcat &amp; JNI Debug Terminal
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  {filteredLogs.length} events
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Filter Selector */}
                <div className="flex items-center bg-zinc-800 rounded border border-zinc-700 p-0.5 text-[11px] font-mono">
                  <button
                    onClick={() => setLogFilter('all')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      logFilter === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setLogFilter('exploit')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      logFilter === 'exploit' ? 'bg-red-900/60 text-red-200' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Exploit
                  </button>
                  <button
                    onClick={() => setLogFilter('system')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      logFilter === 'system' ? 'bg-indigo-900/60 text-indigo-200' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    System
                  </button>
                  <button
                    onClick={() => setLogFilter('kernel')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      logFilter === 'kernel' ? 'bg-emerald-900/60 text-emerald-200' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Kernel
                  </button>
                </div>

                {/* Copy logs */}
                <button
                  id="terminal-copy-btn"
                  onClick={handleCopy}
                  title="Copy logcat output"
                  className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {/* Download logs */}
                <button
                  id="terminal-download-btn"
                  onClick={handleDownloadLogs}
                  title="Download logcat file"
                  className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {/* Clear logs */}
                <button
                  id="terminal-clear-btn"
                  onClick={onClearLogs}
                  title="Clear terminal"
                  className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Toggle Expand */}
                <button
                  id="terminal-expand-btn"
                  onClick={() => setExpandedView(!expandedView)}
                  title={expandedView ? 'Split View' : 'Full Screen Terminal'}
                  className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
                >
                  {expandedView ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Terminal Output Body */}
            <div
              ref={logContainerRef}
              className="p-4 flex-1 bg-black font-mono text-xs overflow-y-auto space-y-1.5 min-h-[420px] max-h-[560px] scrollbar-thin select-text"
            >
              <div className="text-zinc-600 pb-2 border-b border-zinc-900 flex items-center justify-between text-[11px]">
                <span>Kernel: {selectedDevice.kernelVersion}</span>
                <span>Security Patch: {selectedDevice.securityPatch}</span>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="text-zinc-600 py-8 text-center">
                  <TerminalIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>Terminal ready. Waiting for exploit trigger...</p>
                  <p className="text-[11px] mt-1 text-zinc-500">
                    Click &quot;Run userspace exploit&quot; in the phone interface to begin.
                  </p>
                </div>
              ) : (
                filteredLogs.map((log) => {
                  let colorClass = 'text-zinc-300';
                  let badgeBg = 'bg-zinc-800 text-zinc-400';

                  if (log.level === 'exploit') {
                    colorClass = 'text-red-400 font-medium';
                    badgeBg = 'bg-red-950 text-red-300 border border-red-800/60';
                  } else if (log.level === 'warn') {
                    colorClass = 'text-amber-300';
                    badgeBg = 'bg-amber-950 text-amber-300 border border-amber-800/60';
                  } else if (log.level === 'error') {
                    colorClass = 'text-rose-400 font-semibold';
                    badgeBg = 'bg-rose-950 text-rose-300 border border-rose-800/60';
                  } else if (log.tag.includes('DirtyFrag') || log.tag.includes('ksud')) {
                    colorClass = 'text-emerald-300';
                    badgeBg = 'bg-emerald-950 text-emerald-300 border border-emerald-800/60';
                  } else if (log.tag.includes('system_server')) {
                    colorClass = 'text-indigo-300';
                    badgeBg = 'bg-indigo-950 text-indigo-300 border border-indigo-800/60';
                  }

                  return (
                    <div key={log.id} className="flex items-start gap-2.5 leading-relaxed hover:bg-zinc-900/50 px-1 py-0.5 rounded">
                      <span className="text-zinc-600 shrink-0 select-none text-[11px]">{log.timestamp}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono shrink-0 ${badgeBg}`}>
                        {log.tag}
                      </span>
                      <span className={`flex-1 break-all ${colorClass}`}>{log.message}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Terminal Footer Status Bar */}
            <div className="bg-zinc-900/80 px-4 py-2 border-t border-zinc-800 text-xs font-mono flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-zinc-400">
                  <span className="text-zinc-500">Phase:</span>
                  <span className="text-zinc-200 font-semibold">{phase}</span>
                </span>
                <span className="text-zinc-600">|</span>
                <span className="flex items-center gap-1">
                  <span className="text-zinc-500">SELinux:</span>
                  <span className={selinuxPermissive ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                    {selinuxPermissive ? 'Permissive (setenforce 0)' : 'Enforcing'}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="text-zinc-500">Superuser:</span>
                  <span className={kernelsuActive ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                    {kernelsuActive ? 'KernelSU Granted' : 'Disabled'}
                  </span>
                </span>
                {isExploiting && (
                  <span className="inline-flex items-center gap-1 text-red-400 text-xs font-medium animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-400"></span> Executing...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
