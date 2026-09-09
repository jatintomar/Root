import React, { useRef } from 'react';
import { Play, Pause, RotateCcw, CheckCircle2, Bookmark, Film } from 'lucide-react';

export const DemoVideoViewer: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const seekTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
    }
  };

  const bookmarks = [
    { time: 0, label: '0:00 - Launch LSPromise App on Pixel 10' },
    { time: 3, label: '0:03 - Tap "Run userspace exploit"' },
    { time: 7, label: '0:07 - Networkstack binder received' },
    { time: 12, label: '0:12 - Tap "Run kernel exploit and load KernelSU"' },
    { time: 17, label: '0:17 - DirtyFrag in-place memory patch' },
    { time: 24, label: '0:24 - Exploitation successful, KernelSU granted' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800 rounded">
                Official Proof-of-Concept Recording
              </span>
              <span className="text-xs text-zinc-500 font-mono">Pixel 10 / Android 17</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Original Execution Demo (VID_20260804_231937_915.mp4)
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Recorded directly by the LSPosed authors demonstrating the live privilege escalation and KernelSU activation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 text-xs font-mono border border-zinc-700">
              1080x2400 MP4
            </span>
          </div>
        </div>

        {/* Video Player & Bookmark Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Video Container */}
          <div className="lg:col-span-8 flex flex-col items-center justify-center bg-black rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl p-2">
            <video
              ref={videoRef}
              src="/lspromise_demo.mp4"
              controls
              playsInline
              className="w-full max-h-[540px] rounded-xl object-contain bg-zinc-950"
            />
          </div>

          {/* Chapters & Highlights */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-purple-400" /> Video Chapters
              </h3>

              <div className="space-y-1.5">
                {bookmarks.map((bm) => (
                  <button
                    key={bm.time}
                    onClick={() => seekTo(bm.time)}
                    className="w-full text-left px-2.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 hover:border-purple-500/50 text-xs font-mono text-zinc-300 hover:text-white transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate">{bm.label}</span>
                    <Play className="w-3 h-3 text-purple-400 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs text-zinc-400 space-y-2">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> What this confirms
              </h4>
              <p className="leading-relaxed text-[11px]">
                The video shows the physical Pixel 10 device starting in the unprivileged LSPromise app, obtaining the network stack binder, executing the kernel exploit in less than 2 seconds, and switching to KernelSU manager where superuser permissions are immediately functional.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
