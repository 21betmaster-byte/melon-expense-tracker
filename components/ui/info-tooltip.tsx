"use client";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InfoTooltipProps {
  text: string;
  className?: string;
}

export const InfoTooltip = ({ text, className }: InfoTooltipProps) => {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            tabIndex={-1}
            className={`inline-flex items-center text-slate-500 hover:text-slate-400 transition-colors ${className ?? ""}`}
            onClick={(e) => e.preventDefault()}
            aria-label="More info"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          avoidCollisions
          className="bg-slate-800 text-slate-200 text-xs rounded-lg p-3 max-w-[250px] shadow-lg border border-slate-700"
        >
          <p className="whitespace-pre-wrap">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
