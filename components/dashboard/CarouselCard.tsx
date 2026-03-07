"use client";
import { Smartphone, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CarouselCard as CardConfig } from "@/lib/carousel/cards";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Smartphone,
  Users,
  Zap,
};

interface CarouselCardProps {
  card: CardConfig;
  onAction?: () => void;
  onDismiss?: () => void;
}

export const CarouselCard = ({ card, onAction, onDismiss }: CarouselCardProps) => {
  const Icon = iconMap[card.icon];

  return (
    <div
      className={`min-w-[280px] w-[85vw] max-w-[320px] h-[140px] rounded-xl bg-gradient-to-br ${card.gradient} border border-slate-800 p-4 flex flex-col justify-between snap-start shrink-0`}
      data-testid={`carousel-card-${card.id}`}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-slate-800/60 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-blue-400" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-100 leading-tight">{card.title}</h3>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{card.subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {card.ctaLabel && onAction && (
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs px-3"
            onClick={onAction}
          >
            {card.ctaLabel}
          </Button>
        )}
        {card.dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};
