import React from "react";

const Loader = ({
  title = "LIFE LEDGER",
  subtitle = "Loading your finance dashboard...",
  fullScreen = true,
}) => {
  const shellClass = fullScreen
    ? "flex min-h-screen flex-col items-center justify-center bg-[#0B1120] text-white"
    : "flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm";

  return (
    <div className={shellClass}>
      <div className="relative flex items-center justify-center">
        <div className="h-20 w-20 rounded-full border-[5px] border-violet-200 border-t-violet-600 border-r-indigo-500 animate-spin shadow-lg shadow-violet-500/20" />
        <div className="absolute inset-4 rounded-full border border-white/10 bg-gradient-to-br from-violet-500/20 via-indigo-500/20 to-cyan-400/20" />
      </div>

      <div className="mt-8 text-center">
        <h1 className="text-xl font-black uppercase tracking-[0.35em] text-violet-200 sm:text-2xl">
          {title}
        </h1>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.25em] text-violet-300/70 sm:text-sm">
          {subtitle}
        </p>
      </div>

      <div className="mt-6 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-violet-400/80 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
};

export default Loader;