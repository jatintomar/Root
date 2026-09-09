import React from 'react';
import { Shield, ShieldAlert, Cpu, Terminal, Layers, FileText, Video, RefreshCw, Smartphone } from 'lucide-react';
import { DeviceProfile, PrivilegeLevel } from '../types';

interface HeaderProps {
  activeTab: 'console' | 'chain' | 'dirtyfrag' | 'terminal' | 'writeup' | 'video' | 'apk';
  setActiveTab: (tab: 'console' | 'chain' | 'dirtyfrag' | 'terminal' | 'writeup' | 'video' | 'apk') => void;
  selectedDevice: DeviceProfile;
  setSelectedDevice: (device: DeviceProfile) => void;
  devices: DeviceProfile[];
  privilegeLevel: PrivilegeLevel;
  selinuxPermissive: boolean;
  kernelsuActive: boolean;
  onReset: () => void;
  isExploiting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedDevice,
  setSelectedDevice,
  devices,
  privilegeLevel,
  selinuxPermissive,
  kernelsuActive,
  onReset,
  isExploiting,
}) => {
  const getPrivilegeBadge = () => {
    switch (privilegeLevel) {
      case 'root':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700/60 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            ROOT (UID 0)
          </span>
        );
      case 'init':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-700/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            init (PID 1)
          </span>
        );
      case 'network_stack':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-700/60">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            network_stack (UID 1073)
          </span>
        );
      case 'system_server':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-700/60">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            system_server (UID 1000)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/60">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
            Untrusted App (UID 10182)
          </span>
        );
    }
  };

  return (
    <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-40">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Repo Info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 font-mono font-bold text-lg shadow-inner">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">LSPromise</h1>
              <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                LSPosed Team
              </span>
              <span className="hidden sm:inline text-xs text-zinc-500 font-mono">
                canyie / CVE-2026-49881 + 43284
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden md:block">
              Android 17 Local Privilege Escalation &amp; KernelSU Injection Exploit Chain
            </p>
          </div>
        </div>

        {/* Status Indicators & Device Selector */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Device Profile Select */}
          <div className="flex items-center gap-1.5 bg-zinc-800/80 border border-zinc-700/80 rounded-md px-2.5 py-1">
            <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
            <select
              id="device-selector"
              value={selectedDevice.id}
              onChange={(e) => {
                const dev = devices.find((d) => d.id === e.target.value);
                if (dev) setSelectedDevice(dev);
              }}
              className="bg-transparent text-zinc-200 text-xs focus:outline-hidden font-medium cursor-pointer"
            >
              {devices.map((dev) => (
                <option key={dev.id} value={dev.id} className="bg-zinc-900 text-zinc-200">
                  {dev.name} {dev.isVulnerable ? '🔥' : '🛡️'}
                </option>
              ))}
            </select>
          </div>

          {/* Current Privilege Badge */}
          {getPrivilegeBadge()}

          {/* SELinux Badge */}
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono border ${
              selinuxPermissive
                ? 'bg-amber-950/80 text-amber-300 border-amber-700/50'
                : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50'
            }`}
            title={`SELinux state: ${selinuxPermissive ? 'Permissive' : 'Enforcing'}`}
          >
            {selinuxPermissive ? (
              <ShieldAlert className="w-3 h-3 text-amber-400" />
            ) : (
              <Shield className="w-3 h-3 text-emerald-400" />
            )}
            <span>SELinux: {selinuxPermissive ? 'Permissive' : 'Enforcing'}</span>
          </div>

          {/* KernelSU Badge */}
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono border ${
              kernelsuActive
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50'
                : 'bg-zinc-800/80 text-zinc-500 border-zinc-700/50'
            }`}
          >
            <Cpu className="w-3 h-3" />
            <span>KernelSU: {kernelsuActive ? 'Active (ksud)' : 'Standby'}</span>
          </div>

          {/* Reset / Reboot Device */}
          <button
            id="reboot-device-btn"
            onClick={onReset}
            disabled={isExploiting}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-colors cursor-pointer disabled:opacity-50 text-xs"
            title="Reboot test environment (Clears memory and restores patched libraries)"
          >
            <RefreshCw className={`w-3 h-3 ${isExploiting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reboot</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto border-t border-zinc-800/60 scrollbar-none py-1">
        <button
          id="tab-console"
          onClick={() => setActiveTab('console')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'console'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Smartphone className="w-4 h-4 text-red-400" />
          <span>App Console &amp; Terminal</span>
        </button>

        <button
          id="tab-chain"
          onClick={() => setActiveTab('chain')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'chain'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>Exploit Chain Visualizer</span>
        </button>

        <button
          id="tab-dirtyfrag"
          onClick={() => setActiveTab('dirtyfrag')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'dirtyfrag'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>DirtyFrag (CVE-2026-43284) Inspector</span>
        </button>

        <button
          id="tab-terminal"
          onClick={() => setActiveTab('terminal')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'terminal'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>Root Shell</span>
          {kernelsuActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          )}
        </button>

        <button
          id="tab-writeup"
          onClick={() => setActiveTab('writeup')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'writeup'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <FileText className="w-4 h-4 text-blue-400" />
          <span>Technical Write-up</span>
        </button>

        <button
          id="tab-video"
          onClick={() => setActiveTab('video')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'video'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Video className="w-4 h-4 text-purple-400" />
          <span>Screen Recording</span>
        </button>

        <button
          id="tab-apk"
          onClick={() => setActiveTab('apk')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'apk'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>APK &amp; Source Build</span>
        </button>
      </div>
    </header>
  );
};
