/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AppConsole } from './components/AppConsole';
import { ExploitChainVisualizer } from './components/ExploitChainVisualizer';
import { DirtyFragInspector } from './components/DirtyFragInspector';
import { RootTerminal } from './components/RootTerminal';
import { WriteupViewer } from './components/WriteupViewer';
import { DemoVideoViewer } from './components/DemoVideoViewer';
import { ApkBuildViewer } from './components/ApkBuildViewer';
import { DEVICE_PROFILES } from './data/lspromiseData';
import { LogEntry, ExploitPhase, PrivilegeLevel, DeviceProfile } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'console' | 'chain' | 'dirtyfrag' | 'terminal' | 'writeup' | 'video' | 'apk'>('console');
  const [selectedDevice, setSelectedDevice] = useState<DeviceProfile>(DEVICE_PROFILES[0]);
  const [phase, setPhase] = useState<ExploitPhase>('idle');
  const [privilegeLevel, setPrivilegeLevel] = useState<PrivilegeLevel>('untrusted_app');
  const [hasControllerBinder, setHasControllerBinder] = useState(false);
  const [selinuxPermissive, setSelinuxPermissive] = useState(false);
  const [kernelsuActive, setKernelsuActive] = useState(false);
  const [isExploiting, setIsExploiting] = useState(false);

  // Initial startup logs matching real LSPromise initialization
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init-1',
      timestamp: '23:19:35.102',
      level: 'info',
      tag: 'LSPromise',
      message: 'copy /data/app/~~tXm==/me.weishu.kernelsu-==/lib/arm64/libksud.so -> /data/user/0/org.lsposed.lspromise/ksud',
    },
    {
      id: 'init-2',
      timestamp: '23:19:35.105',
      level: 'info',
      tag: 'LSPromise',
      message: 'registered PhoneAccount "LSPromise account" (CAPABILITY_SELF_MANAGED)',
    },
    {
      id: 'init-3',
      timestamp: '23:19:35.108',
      level: 'debug',
      tag: 'LSPromise',
      message: 'registered EVIL broadcast receiver with Context.RECEIVER_EXPORTED',
    },
  ]);

  const addLog = (tag: string, message: string, level: LogEntry['level'] = 'info') => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now
      .getMilliseconds()
      .toString()
      .padStart(3, '0')}`;

    setLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: timeStr,
        level,
        tag,
        message,
      },
    ]);
  };

  // Run Userspace Exploit (Telecom 0-day -> system_server -> com.android.networkstack)
  const handleRunUserspace = async () => {
    if (isExploiting) return;
    setIsExploiting(true);
    setPhase('userspace_telecom');

    addLog('LSPromise', 'sendStickyBroadcast(Intent("android"))', 'exploit');
    addLog('Telecom', 'addNewIncomingCall(phoneAccount=LSPromise)', 'info');

    // If patched device
    if (selectedDevice.id === 'pixel-10-patched') {
      setTimeout(() => {
        addLog('InCallController', 'serviceClassExists check has been removed in Sep 2026 patch (AOSP 668eb072).', 'warn');
        addLog('LSPromise', 'userspace exploit blocked: no reflection into system_server possible.', 'error');
        setIsExploiting(false);
        setPhase('idle');
      }, 700);
      return;
    }

    // Normal vulnerable flow
    setTimeout(() => {
      addLog('InCallController', 'serviceClassExists check triggered on org.lsposed.lspromise', 'exploit');
      addLog('InCallController', 'Context.CONTEXT_INCLUDE_CODE | Context.CONTEXT_IGNORE_SECURITY set', 'warn');
      addLog('AppComponentFactory', 'MyAppComponentFactory instantiated inside system_server (PID 1420, UID 1000)', 'exploit');
      setPrivilegeLevel('system_server');
      setPhase('system_server_injection');

      setTimeout(() => {
        addLog('Shellcode', 'in system server, stage 1', 'exploit');
        addLog('Shellcode', 'retrieved ActivityManagerService.getProcessRecordLocked("com.android.networkstack.process", 1073)', 'debug');
        addLog('Shellcode', 'IApplicationThread.scheduleReceiver() dispatched into network stack', 'info');

        setTimeout(() => {
          addLog('Shellcode', 'in network stack, stage 2', 'exploit');
          addLog('Shellcode', 'System.loadLibrary("exp") loaded libexp.so', 'info');
          addLog('Shellcode', 'controller binder created and EVIL broadcast dispatched', 'debug');
          addLog('LSPromise', 'networkstack binder received', 'exploit');
          
          setHasControllerBinder(true);
          setPrivilegeLevel('network_stack');
          setPhase('network_stack_binder');
          setIsExploiting(false);
        }, 600);
      }, 600);
    }, 600);
  };

  // Run Kernel Exploit and Load KernelSU (DirtyFrag + Orphan init hook + vendor_modprobe)
  const handleRunKernelSU = async () => {
    if (isExploiting) return;
    setIsExploiting(true);
    setPhase('patching_vendor_mod');

    addLog('LSPromise', 'transact code 5 (run all)', 'exploit');

    // If Pixel 6a (6.1 kernel bug)
    if (selectedDevice.id === 'pixel-6a') {
      setTimeout(() => {
        addLog('DirtyFrag', 'executing patchMod', 'exploit');
        addLog('DirtyFrag', 'splice() IPsec ESP encapsulation failed with EINVAL (6.1.xxx-android14 upstream kernel bug)', 'error');
        addLog('LSPromise', 'runall failed: Unsupported kernel tree 6.1.xxx', 'error');
        setIsExploiting(false);
        setPhase('network_stack_binder');
      }, 800);
      return;
    }

    setTimeout(() => {
      addLog('DirtyFrag', 'executing patchMod', 'exploit');
      addLog('DirtyFrag', 'patched /apex/com.android.runtime/bin/crash_dump64 to transition to crash_dump domain', 'info');
      addLog('DirtyFrag', 'spliced /vendor/lib64/libstagefright_aidl_bufferpool2.so with dirtyfrag.ko in page cache (res=0)', 'exploit');
      setPhase('patching_libc');

      setTimeout(() => {
        addLog('DirtyFrag', 'executing patchLibc', 'exploit');
        addLog('DirtyFrag', 'spliced /system/lib64/libc.so modprobe redirection hook in page cache (res=0)', 'info');
        setPhase('patching_cxx');

        setTimeout(() => {
          addLog('DirtyFrag', 'executing patchCxx', 'exploit');
          addLog('DirtyFrag', 'spliced /system/lib64/libc++.so init destructor payload in page cache (res=0)', 'info');
          setPhase('triggering_orphan');

          setTimeout(() => {
            addLog('DirtyFrag', 'executing forkProcess', 'exploit');
            addLog('DirtyFrag', 'spawned orphan child process (PID 3140), adopted by init (PID 1, UID 0)', 'info');
            addLog('init', 'orphan reaped by init, triggering patched libc++.so destructor', 'exploit');
            addLog('init', 'executing /vendor/bin/modprobe under vendor_modprobe domain', 'info');
            setPrivilegeLevel('init');
            setPhase('loading_kernel_module');

            setTimeout(() => {
              addLog('vendor_modprobe', 'loading libstagefright_aidl_bufferpool2.so (disguised dirtyfrag.ko)', 'exploit');
              addLog('dirtyfrag.ko', 'dirtyfrag_init(): kernel module loaded into Linux 6.6.21', 'exploit');
              addLog('dirtyfrag.ko', 'selinux_enforcing set to 0 (Permissive)', 'warn');
              setSelinuxPermissive(true);
              setPhase('selinux_permissive');

              setTimeout(() => {
                addLog('dirtyfrag.ko', 'call_usermodehelper("/data/user/0/org.lsposed.lspromise/ksud")', 'exploit');
                addLog('ksud', 'KernelSU daemon started successfully with UID 0 (root)', 'exploit');
                addLog('LSPromise', 'runall done res=1', 'exploit');
                
                setPrivilegeLevel('root');
                setKernelsuActive(true);
                setPhase('kernelsu_active');
                setIsExploiting(false);
              }, 600);
            }, 600);
          }, 600);
        }, 500);
      }, 500);
    }, 600);
  };

  // Granular patch actions
  const handlePatchAction = (code: number, name: string) => {
    if (isExploiting) return;
    setIsExploiting(true);

    addLog('LSPromise', `doAction(${code}, "${name}")`, 'exploit');

    setTimeout(() => {
      if (code === 1) {
        addLog('DirtyFrag', 'patchMod: patched /vendor/lib64/libstagefright_aidl_bufferpool2.so', 'info');
      } else if (code === 2) {
        addLog('DirtyFrag', 'patchLibc: patched /system/lib64/libc.so', 'info');
      } else if (code === 3) {
        addLog('DirtyFrag', 'patchCxx: patched /system/lib64/libc++.so', 'info');
      } else if (code === 4) {
        addLog('DirtyFrag', 'forkProcess: created orphan process for init', 'info');
      }
      addLog('LSPromise', `${name} res=0`, 'exploit');
      setIsExploiting(false);
    }, 400);
  };

  // Reboot / Reset environment
  const handleReset = () => {
    setIsExploiting(false);
    setPhase('idle');
    setPrivilegeLevel('untrusted_app');
    setHasControllerBinder(false);
    setSelinuxPermissive(false);
    setKernelsuActive(false);

    setLogs([
      {
        id: `reset-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        level: 'warn',
        tag: 'System',
        message: `Device rebooted (${selectedDevice.name}). Page cache flushed and restored.`,
      },
      {
        id: `reset-ksu-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        level: 'info',
        tag: 'LSPromise',
        message: 'copy /data/app/me.weishu.kernelsu/lib/arm64/libksud.so -> /data/user/0/org.lsposed.lspromise/ksud',
      },
      {
        id: `reset-phone-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        level: 'info',
        tag: 'LSPromise',
        message: 'registered PhoneAccount "LSPromise account" (CAPABILITY_SELF_MANAGED)',
      },
    ]);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-red-500/30 selection:text-red-200">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedDevice={selectedDevice}
        setSelectedDevice={(dev) => {
          setSelectedDevice(dev);
          handleReset();
        }}
        devices={DEVICE_PROFILES}
        privilegeLevel={privilegeLevel}
        selinuxPermissive={selinuxPermissive}
        kernelsuActive={kernelsuActive}
        onReset={handleReset}
        isExploiting={isExploiting}
      />

      <main className="flex-1">
        {activeTab === 'console' && (
          <AppConsole
            logs={logs}
            phase={phase}
            hasControllerBinder={hasControllerBinder}
            selectedDevice={selectedDevice}
            onRunUserspace={handleRunUserspace}
            onRunKernelSU={handleRunKernelSU}
            onPatchAction={handlePatchAction}
            onClearLogs={() => setLogs([])}
            isExploiting={isExploiting}
            selinuxPermissive={selinuxPermissive}
            kernelsuActive={kernelsuActive}
          />
        )}

        {activeTab === 'chain' && (
          <ExploitChainVisualizer
            currentPhase={phase}
            hasControllerBinder={hasControllerBinder}
            kernelsuActive={kernelsuActive}
          />
        )}

        {activeTab === 'dirtyfrag' && <DirtyFragInspector />}

        {activeTab === 'terminal' && (
          <RootTerminal
            privilegeLevel={privilegeLevel}
            selinuxPermissive={selinuxPermissive}
            kernelsuActive={kernelsuActive}
            deviceModel={selectedDevice.model}
          />
        )}

        {activeTab === 'writeup' && <WriteupViewer />}

        {activeTab === 'video' && <DemoVideoViewer />}

        {activeTab === 'apk' && <ApkBuildViewer />}
      </main>

      {/* Footer */}
      <footer className="bg-zinc-950 border-t border-zinc-900 py-4 px-6 text-xs text-zinc-500 flex flex-wrap items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 font-bold">LSPromise</span>
          <span>&copy; 2026 LSPosed / canyie. Open-source Android vulnerability research.</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>CVE-2026-49881 (Telecom)</span>
          <span>&bull;</span>
          <span>CVE-2026-43284 (DirtyFrag)</span>
          <span>&bull;</span>
          <span>KernelSU v0.9.5</span>
        </div>
      </footer>
    </div>
  );
}
