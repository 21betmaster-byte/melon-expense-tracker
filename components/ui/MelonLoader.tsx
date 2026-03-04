"use client";

interface MelonLoaderProps {
  message?: string;
}

export const MelonLoader = ({ message = "Loading your data..." }: MelonLoaderProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-950">
      {/* Melon logo + spinner */}
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-slate-800 border-t-blue-500 animate-spin" />
        <span className="absolute inset-0 flex items-center justify-center text-2xl">
          🍈
        </span>
      </div>

      {/* Brand name */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">Melon</h2>
        <p className="mt-1 text-sm text-slate-400 animate-pulse">{message}</p>
      </div>
    </div>
  );
};
