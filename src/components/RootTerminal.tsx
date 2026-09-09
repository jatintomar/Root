import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Send, ShieldCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { PrivilegeLevel } from '../types';

interface RootTerminalProps {
  privilegeLevel: PrivilegeLevel;
  selinuxPermissive: boolean;
  kernelsuActive: boolean;
  deviceModel: string;
}

export const RootTerminal: React.FC<RootTerminalProps> = ({
  privilegeLevel,
  selinuxPermissive,
  kernelsuActive,
  deviceModel,
}) => {
  const isRoot = privilegeLevel === 'root' || kernelsuActive;

  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<Array<{ command: string; output: string; isRootCmd: boolean }>>([
    {
      command: 'id',
      output: isRoot
        ? 'uid=0(root) gid=0(root) groups=0(root),1004(input),1007(log),1011(adb),1015(sdcard_rw),1028(sdcard_r),3001(net_bt_admin),3002(net_bt),3003(inet),3006(net_bw_stats) context=u:r:su:s0'
        : 'uid=10182(u0_a182) gid=10182(u0_a182) groups=10182(u0_a182),3003(inet),9997(everybody) context=u:r:untrusted_app_32:s0:c182,c256,c512,c768',
      isRootCmd: isRoot,
    },
    {
      command: 'getenforce',
      output: selinuxPermissive ? 'Permissive' : 'Enforcing',
      isRootCmd: isRoot,
    },
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleExecute = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = inputVal.trim();
    if (!cmd) return;

    let output = '';
    const cleanCmd = cmd.toLowerCase();

    if (cleanCmd === 'clear') {
      setHistory([]);
      setInputVal('');
      return;
    } else if (cleanCmd === 'help') {
      output = `Available Shell Commands:
- id: Display current real and effective UID, GID, and SELinux context
- whoami: Print current effective user ID
- getenforce: Print current SELinux enforcement status
- su: Switch to superuser root shell (KernelSU)
- ksud status: Inspect KernelSU daemon and module states
- uname -a: Print system kernel and architecture information
- cat /proc/version: Print kernel compilation version
- ls -la: List files in current working directory
- dmesg | tail: Inspect kernel ring buffer messages
- clear: Clear terminal output`;
    } else if (cleanCmd === 'id') {
      output = isRoot
        ? 'uid=0(root) gid=0(root) groups=0(root),1004(input),1007(log),1011(adb),1015(sdcard_rw),1028(sdcard_r),3001(net_bt_admin),3002(net_bt),3003(inet),3006(net_bw_stats) context=u:r:su:s0'
        : 'uid=10182(u0_a182) gid=10182(u0_a182) groups=10182(u0_a182),3003(inet) context=u:r:untrusted_app:s0:c182,c256';
    } else if (cleanCmd === 'whoami') {
      output = isRoot ? 'root' : 'u0_a182';
    } else if (cleanCmd === 'getenforce') {
      output = selinuxPermissive ? 'Permissive' : 'Enforcing';
    } else if (cleanCmd === 'su' || cleanCmd.startsWith('su ')) {
      if (isRoot) {
        output = 'Root privilege already acquired. Operating under KernelSU su context.';
      } else {
        output = 'su: Permission denied (Superuser binary not yet reachable. Run exploit chain first).';
      }
    } else if (cleanCmd.startsWith('ksud')) {
      if (isRoot) {
        output = `KernelSU Daemon (ksud) v0.9.5
Status: ACTIVE
Kernel Mode: LKM (dirtyfrag.ko)
SELinux: Permissive
Superuser Apps Allowed: 1
Root Grant Strategy: Direct UID 0 via /data/data/org.lsposed.lspromise/ksud`;
      } else {
        output = 'ksud: daemon inactive or unprivileged';
      }
    } else if (cleanCmd.startsWith('uname')) {
      output = 'Linux franklin 6.6.21-android17-0-ge9d28a1c #1 SMP PREEMPT Fri Aug 1 12:00:00 UTC 2026 aarch64 Android';
    } else if (cleanCmd.includes('/proc/version')) {
      output = 'Linux version 6.6.21-android17-0-ge9d28a1c (android-build@google.com) (Android (10700886, based on r487747c) clang version 17.0.2) #1 SMP PREEMPT 2026';
    } else if (cleanCmd.startsWith('ls')) {
      output = isRoot
        ? `drwxr-xr-x  14 root root 4096 Aug  4 23:19 .
drwxr-xr-x  14 root root 4096 Aug  4 23:19 ..
-rwxr-xr-x   1 root root 28416 Aug  4 23:19 ksud
-rw-r--r--   1 root root 51200 Aug  4 23:19 dirtyfrag.ko
drwx------   3 u0_a182 u0_a182 4096 Aug  4 23:19 files`
        : `drwxr-x--x   3 u0_a182 u0_a182 4096 Aug  4 23:19 .
drwxr-x--x   4 system  system  4096 Aug  4 23:19 ..
drwx------   2 u0_a182 u0_a182 4096 Aug  4 23:19 files`;
    } else if (cleanCmd.includes('dmesg')) {
      output = `[ 124.509812] [dirtyfrag] esp_in_place_decrypt: spliced buffer matched xfrm sa
[ 124.510103] [dirtyfrag] overwrote page cache for /vendor/lib64/libstagefright_aidl_bufferpool2.so
[ 125.102914] [vendor_modprobe] loading kernel module libstagefright_aidl_bufferpool2.so (dirtyfrag.ko)
[ 125.103521] [dirtyfrag] dirtyfrag_init: root module loaded!
[ 125.103602] [dirtyfrag] selinux_enforcing set to 0 (Permissive)
[ 125.105120] [dirtyfrag] starting KernelSU daemon /data/data/org.lsposed.lspromise/ksud`;
    } else {
      output = `/system/bin/sh: ${cmd}: command not found. Type 'help' for available commands.`;
    }

    setHistory((prev) => [...prev, { command: cmd, output, isRootCmd: isRoot }]);
    setInputVal('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Root Status Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
              isRoot
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/80 shadow-xs'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            {isRoot ? '#' : '$'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Interactive Superuser Shell</h3>
              {isRoot ? (
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700">
                  ROOT PRIVILEGES ACTIVE
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                  RESTRICTED APPDOMAIN
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              {isRoot
                ? 'Arbitrary root commands executing via KernelSU with Permissive SELinux.'
                : 'Run the exploit in the App Console tab to escalate to UID 0.'}
            </p>
          </div>
        </div>

        {/* Quick Command Suggestions */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
          <button
            onClick={() => setInputVal('id')}
            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 cursor-pointer"
          >
            id
          </button>
          <button
            onClick={() => setInputVal('whoami')}
            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 cursor-pointer"
          >
            whoami
          </button>
          <button
            onClick={() => setInputVal('getenforce')}
            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 cursor-pointer"
          >
            getenforce
          </button>
          <button
            onClick={() => setInputVal('ksud status')}
            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 cursor-pointer"
          >
            ksud status
          </button>
        </div>
      </div>

      {/* Terminal Display */}
      <div className="bg-black border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-[480px]">
        <div className="bg-zinc-900 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>sh / Android Shell Emulator</span>
          </div>
          <span className="text-[11px] text-zinc-500">
            {isRoot ? 'franklin:/ # (root)' : 'franklin:/ $ (untrusted)'}
          </span>
        </div>

        <div className="p-4 flex-1 font-mono text-xs overflow-y-auto space-y-3 select-text">
          <div className="text-zinc-500 border-b border-zinc-900 pb-2 text-[11px]">
            LSPromise Research Terminal. Type <span className="text-zinc-300 font-bold">help</span> to view supported commands.
          </div>

          {history.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center gap-2 text-zinc-300">
                <span className={item.isRootCmd ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                  {item.isRootCmd ? 'franklin:/ #' : 'franklin:/ $'}
                </span>
                <span className="text-white font-semibold">{item.command}</span>
              </div>
              <pre className="text-zinc-400 pl-4 whitespace-pre-wrap leading-relaxed text-[11px]">
                {item.output}
              </pre>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input Prompt Form */}
        <form
          onSubmit={handleExecute}
          className="bg-zinc-900/90 border-t border-zinc-800 p-2.5 flex items-center gap-2"
        >
          <span className={`font-mono text-xs font-bold pl-2 ${isRoot ? 'text-emerald-400' : 'text-zinc-500'}`}>
            {isRoot ? '#' : '$'}
          </span>
          <input
            id="terminal-input"
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={isRoot ? "Type root command (e.g. id, whoami, ksud status)..." : "Type command (e.g. id, getenforce, help)..."}
            className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-hidden px-2 py-1 placeholder-zinc-600"
          />
          <button
            type="submit"
            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
