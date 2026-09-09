import React, { useState } from 'react';
import { ShieldAlert, Database, Cpu, ArrowRight, RefreshCw, FileText, CheckCircle2, Layers } from 'lucide-react';

export const DirtyFragInspector: React.FC = () => {
  const [activeTarget, setActiveTarget] = useState<'libc' | 'cxx' | 'vendor' | 'crashdump'>('vendor');
  const [decryptStep, setDecryptStep] = useState<number>(0);

  const targets = {
    vendor: {
      name: '/vendor/lib64/libstagefright_aidl_bufferpool2.so',
      domain: 'vendor_file',
      replacedWith: 'dirtyfrag.ko (Kernel Module)',
      purpose: 'Replaced with full kernel module. Loaded by vendor_modprobe to grant root and setenforce 0.',
      originalHex: '7F 45 4C 46 02 01 01 00 (ELF 64-bit shared object, stagefright bufferpool)',
      patchedHex: '7F 45 4C 46 02 01 01 00 (ELF 64-bit relocatable, Linux kernel module dirtyfrag.ko)',
    },
    libc: {
      name: '/system/lib64/libc.so',
      domain: 'system_file',
      replacedWith: 'Hooked modprobe payload',
      purpose: 'Patched in page cache to intercept execution when vendor_modprobe runs.',
      originalHex: 'E0 03 00 AA F3 03 01 AA (Standard bionic libc entry points)',
      patchedHex: '00 00 00 14 20 00 80 D2 (Branch to payload + modprobe module loader)',
    },
    cxx: {
      name: '/system/lib64/libc++.so',
      domain: 'system_file',
      replacedWith: 'Init destructor hook',
      purpose: 'Triggers inside init (PID 1, UID 0) when orphan process is reaped, launching modprobe.',
      originalHex: 'FD 7B BE A9 FD 03 00 91 (Standard LLVM libc++ destructor epilogue)',
      patchedHex: 'E0 03 1E 32 01 00 00 14 (Hijack init context -> execve vendor modprobe)',
    },
    crashdump: {
      name: '/apex/com.android.runtime/bin/crash_dump64',
      domain: 'crash_dump',
      replacedWith: 'Domain transition stub',
      purpose: 'Network stack cannot open vendor_file. Patching crash_dump64 allows transitioning to crash_dump domain.',
      originalHex: '2A 00 00 39 41 00 00 B9 (Android runtime crash_dump binary)',
      patchedHex: '80 00 00 58 00 00 1F D6 (Transitions SELinux domain to open vendor files)',
    },
  };

  const target = targets[activeTarget];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Overview Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800/80 rounded">
                CVE-2026-43284
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                DirtyFrag: Linux Kernel xfrm-ESP Zero-Copy Page Cache Write
              </h2>
            </div>
            <p className="text-xs text-zinc-400 max-w-3xl leading-relaxed">
              Discovered by V4bel and weaponized on Android by LSPosed. It exploits a logic flaw in the Linux kernel&apos;s IPsec ESP subsystem to write attacker-controlled bytes directly into read-only page cache pages via <code className="text-amber-300 font-mono">splice()</code> zero-copy buffers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs font-mono text-emerald-400">
              Deterministic (No Spraying)
            </span>
          </div>
        </div>

        {/* Mechanism Flow Chart */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
              <span>STEP 1</span>
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <h3 className="text-xs font-bold text-white">Target File Ingestion</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Target read-only shared library (<code className="text-zinc-300">libc.so</code>) is opened with <code className="text-zinc-300">O_RDONLY</code> and spliced into a kernel pipe buffer.
            </p>
            <div className="text-[10px] font-mono text-zinc-500 bg-zinc-900 p-1.5 rounded">
              splice(fd, offset, pipefd[1], 4096)
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
              <span>STEP 2</span>
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <h3 className="text-xs font-bold text-white">ESP Socket Splicing</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              The pipe buffer is spliced into an XFRM IPsec ESP socket. The kernel embeds the target page reference into an <code className="text-zinc-300">sk_buff</code> fragment.
            </p>
            <div className="text-[10px] font-mono text-zinc-500 bg-zinc-900 p-1.5 rounded">
              splice(pipefd[0], esp_sock, 4096)
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
              <span>STEP 3</span>
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <h3 className="text-xs font-bold text-white">In-Place Decryption</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Specially encrypted IPsec ESP packet is received. Kernel crypto routine executes <code className="text-amber-300">in-place decryption</code> directly into the fragment.
            </p>
            <div className="text-[10px] font-mono text-zinc-500 bg-zinc-900 p-1.5 rounded">
              crypto_aead_decrypt(esp_req)
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2 border-emerald-900/60 bg-emerald-950/10">
            <div className="flex items-center justify-between text-[11px] font-mono text-emerald-500">
              <span>STEP 4</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <h3 className="text-xs font-bold text-emerald-300">Page Cache Overwrite</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Because the fragment pointed directly to the page cache of the read-only file, the decrypted payload overwrites the in-memory binary without Copy-on-Write!
            </p>
            <div className="text-[10px] font-mono text-emerald-400/90 bg-emerald-950/80 p-1.5 rounded border border-emerald-800/60">
              COW Bypassed: File Modified
            </div>
          </div>
        </div>
      </div>

      {/* Target File Selector & Hex Dump Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Target selector */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Page Cache Target Libraries
            </h3>
            
            <div className="space-y-2">
              {(['vendor', 'libc', 'cxx', 'crashdump'] as const).map((key) => {
                const item = targets[key];
                const isActive = activeTarget === key;

                return (
                  <button
                    key={key}
                    onClick={() => setActiveTarget(key)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-zinc-800 border-amber-500/80 shadow-md ring-1 ring-amber-500/40'
                        : 'bg-zinc-950 hover:bg-zinc-800/60 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white font-mono truncate max-w-[200px]">
                        {item.name.split('/').pop()}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                        {item.domain}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">{item.purpose}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vulnerability Comparison Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-xs">
            <h4 className="font-bold text-white mb-2">Flaw Family Comparison</h4>
            <div className="space-y-2 text-[11px] font-mono text-zinc-300">
              <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                <span className="text-amber-400 font-bold">Dirty COW (2016)</span>:
                <p className="text-zinc-400 font-sans mt-0.5">Race condition on get_user_pages + madvise MADV_DONTNEED.</p>
              </div>
              <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                <span className="text-amber-400 font-bold">Dirty Pipe (2022)</span>:
                <p className="text-zinc-400 font-sans mt-0.5">Uninitialized pipe_buffer flags in anonymous splice.</p>
              </div>
              <div className="p-2 bg-emerald-950/60 rounded border border-emerald-800/80">
                <span className="text-emerald-300 font-bold">Dirty Frag (2026)</span>:
                <p className="text-zinc-300 font-sans mt-0.5">Deterministic zero-copy IPsec ESP in-place decryption write.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Hex Dump & Modification Visualizer */}
        <div className="lg:col-span-8 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-xl">
          <div className="bg-zinc-900 px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white font-mono">{target.name}</h3>
              <p className="text-[11px] text-zinc-400">{target.purpose}</p>
            </div>
            <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-amber-300">
              Domain: {target.domain}
            </span>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1.5">
                <span>Original Read-Only Page Cache (Before Decryption)</span>
                <span className="text-zinc-600">Offset: 0x00000000</span>
              </div>
              <div className="p-3 bg-black rounded-xl border border-zinc-800 font-mono text-xs text-zinc-400 leading-relaxed overflow-x-auto">
                <code>{target.originalHex}</code>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-mono text-emerald-400 mb-1.5">
                <span>Decrypted ESP In-Place Payload (After DirtyFrag Exploit)</span>
                <span className="text-emerald-500 font-bold">In-Place Overwrite Active</span>
              </div>
              <div className="p-3 bg-emerald-950/20 rounded-xl border border-emerald-800/60 font-mono text-xs text-emerald-300 leading-relaxed overflow-x-auto shadow-inner">
                <code>{target.patchedHex}</code>
              </div>
            </div>

            <div className="bg-zinc-900/60 rounded-xl p-4 border border-zinc-800 text-xs text-zinc-300 space-y-2">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-400" /> Weaponization Result
              </h4>
              <p className="text-zinc-400 leading-relaxed">
                {target.replacedWith}. The Linux kernel treats the modified page as clean cached content. Any subsequent process loading or executing <code className="text-zinc-200 font-mono">{target.name}</code> executes our arbitrary shellcode without touching the physical flash partition!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
