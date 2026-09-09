import React, { useState } from 'react';
import { BookOpen, Copy, Check, ExternalLink, ShieldCheck, FileText, AlertTriangle } from 'lucide-react';
import { TECHNICAL_WRITEUP } from '../data/lspromiseData';

export const WriteupViewer: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(TECHNICAL_WRITEUP);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Article Header Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-red-950 text-red-300 border border-red-800">
                CVE-2026-49881 + CVE-2026-43284
              </span>
              <span className="text-xs text-zinc-500 font-mono">By canyie &amp; LSPosed Team</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              LSPromise: Unconstrained Android 17 Privilege Escalation
            </h1>
            <p className="text-sm text-zinc-400 mt-2 max-w-2xl leading-relaxed">
              Technical research write-up analyzing the complete deterministic exploit chain from local untrusted application to full root &amp; kernel code execution.
            </p>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Write-up' : 'Copy Markdown'}</span>
          </button>
        </div>

        {/* Quick Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase font-semibold">Zero Probabilistic Spraying</span>
            <h4 className="text-sm font-bold text-white">100% Deterministic</h4>
            <p className="text-xs text-zinc-400">
              Operates completely without race conditions, heap massaging, or relying on memory corruption leaks.
            </p>
          </div>

          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase font-semibold">Bypass Mitigations</span>
            <h4 className="text-sm font-bold text-white">MTE &amp; CFI Immune</h4>
            <p className="text-xs text-zinc-400">
              Because both bugs are pure logic flaws, hardware Memory Tagging Extension (MTE) and Control Flow Integrity are bypassed.
            </p>
          </div>

          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase font-semibold">Superuser Payload</span>
            <h4 className="text-sm font-bold text-white">KernelSU Integration</h4>
            <p className="text-xs text-zinc-400">
              Installs and executes the KernelSU daemon <code className="text-zinc-200 font-mono text-[11px]">ksud</code> with permissive SELinux.
            </p>
          </div>
        </div>
      </div>

      {/* Structured Sections */}
      <div className="space-y-6">
        {/* Section 1 */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-red-900/60 text-red-300 flex items-center justify-center text-xs font-mono font-bold">
              1
            </span>
            <span>The Telecom 0-Day: CVE-2026-49881 in InCallController</span>
          </h2>
          
          <p className="text-xs text-zinc-300 leading-relaxed">
            The exploit chain begins with an unprecedented logic flaw in the Telecom subsystem (<code className="text-zinc-200 font-mono">com.android.server.telecom.InCallController</code>). When handling incoming calls, the system invokes <code className="text-zinc-200 font-mono">serviceClassExists()</code> to verify whether a declared <code className="text-zinc-200 font-mono">InCallService</code> exists within the target package.
          </p>

          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
            <div className="text-zinc-500 pb-2 border-b border-zinc-800 text-[11px]">
              AOSP InCallController.java Vulnerable Pattern:
            </div>
            <pre className="pt-2 text-emerald-300">
{`private boolean serviceClassExists(ServiceInfo serviceInfo, UserHandle userHandle) {
    Log.i(this, "serviceClassExists check");
    try {
        Context packageContext = mContext.createPackageContextAsUser(
                serviceInfo.packageName,
                Context.CONTEXT_INCLUDE_CODE | Context.CONTEXT_IGNORE_SECURITY, userHandle);
        ClassLoader classLoader = packageContext.getClassLoader();
        Class.forName(serviceInfo.name, false, classLoader);
        return true;
    } catch (NameNotFoundException | ClassNotFoundException e) {
        return false;
    }
}`}
            </pre>
          </div>

          <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-4 text-xs text-amber-200 space-y-1">
            <p className="font-semibold text-amber-100 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Architectural Flaw Explanation:
            </p>
            <p className="leading-relaxed">
              While passing <code className="text-amber-300 font-mono">false</code> to <code className="text-amber-300 font-mono">Class.forName()</code> prevents static initializers from triggering, calling <code className="text-amber-300 font-mono">getClassLoader()</code> immediately invokes the app&apos;s custom <code className="text-amber-300 font-mono">AppComponentFactory</code> declared in <code className="text-amber-300 font-mono">AndroidManifest.xml</code>. Since Telecom runs with <code className="text-amber-300 font-mono">android:sharedUserId=&quot;android.uid.system&quot;</code> and <code className="text-amber-300 font-mono">android:process=&quot;system&quot;</code>, our arbitrary Java payload executes with system privileges inside <code className="text-amber-300 font-mono">system_server</code>!
            </p>
          </div>
        </div>

        {/* Section 2 */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-900/60 text-indigo-300 flex items-center justify-center text-xs font-mono font-bold">
              2
            </span>
            <span>Bypassing system_server SELinux via com.android.networkstack</span>
          </h2>

          <p className="text-xs text-zinc-300 leading-relaxed">
            Although we are inside <code className="text-zinc-200 font-mono">system_server</code>, SELinux policy strictly forbids <code className="text-zinc-200 font-mono">system_server</code> from loading native libraries from <code className="text-zinc-200 font-mono">/data</code> or creating anonymous executable memory (<code className="text-zinc-200 font-mono">execmem</code>).
          </p>

          <p className="text-xs text-zinc-300 leading-relaxed">
            Fortunately, <code className="text-zinc-200 font-mono">ActivityManagerService</code> runs in the same process and maintains a process map storing the <code className="text-zinc-200 font-mono">IApplicationThread</code> binder handles for all active processes. Using reflection, LSPromise accesses <code className="text-zinc-200 font-mono">com.android.networkstack.process</code> (UID 1073), which is both permitted to load our native <code className="text-zinc-200 font-mono">libexp.so</code> and allowlisted in SEPolicy for <code className="text-zinc-200 font-mono">netlink_xfrm_socket</code> access.
          </p>
        </div>

        {/* Section 3 */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-900/60 text-emerald-300 flex items-center justify-center text-xs font-mono font-bold">
              3
            </span>
            <span>DirtyFrag Kernel 1-Day (CVE-2026-43284) &amp; Root Escalation</span>
          </h2>

          <p className="text-xs text-zinc-300 leading-relaxed">
            DirtyFrag is a zero-copy page cache write vulnerability in Linux IPsec ESP. Using <code className="text-zinc-200 font-mono">splice()</code>, a target read-only system file is attached to an ESP encapsulation socket. When decrypting the incoming ciphertext in-place, the kernel directly overwrites the read-only page cache without Copy-on-Write.
          </p>

          <div className="bg-zinc-900/60 rounded-xl p-4 border border-zinc-800 space-y-2 text-xs font-mono text-zinc-300">
            <div className="text-indigo-400 font-bold">Five-Step Root Execution Chain:</div>
            <ol className="list-decimal pl-5 space-y-1.5 text-zinc-400">
              <li>Patch <code className="text-zinc-200">/apex/com.android.runtime/bin/crash_dump64</code> to cross into the <code className="text-zinc-200">vendor_file</code> domain.</li>
              <li>Replace <code className="text-zinc-200">/vendor/lib64/libstagefright_aidl_bufferpool2.so</code> with our kernel module <code className="text-zinc-200">dirtyfrag.ko</code>.</li>
              <li>Patch <code className="text-zinc-200">/system/lib64/libc.so</code> and <code className="text-zinc-200">/system/lib64/libc++.so</code>.</li>
              <li>Spawn and destroy an orphan child process, causing <code className="text-zinc-200">init (PID 1, UID 0)</code> to trigger destructors in patched <code className="text-zinc-200">libc++.so</code>.</li>
              <li><code className="text-zinc-200">init</code> invokes <code className="text-zinc-200">/vendor/bin/modprobe</code>, loading <code className="text-zinc-200">dirtyfrag.ko</code>, disabling SELinux, and spawning KernelSU&apos;s <code className="text-zinc-200">ksud</code> daemon.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
