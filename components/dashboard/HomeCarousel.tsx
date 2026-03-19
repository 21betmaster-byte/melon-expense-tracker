"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { carouselCards } from "@/lib/carousel/cards";
import { CarouselCard } from "./CarouselCard";
import { toast } from "sonner";
import type { CarouselCard as CardConfig } from "@/lib/carousel/cards";

const NEW_USER_DAYS = 7;

function dismissCard(cardId: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(`carousel_dismissed_${cardId}`, "true");
  }
}

export const HomeCarousel = () => {
  const router = useRouter();
  const { members, user, household } = useAppStore();
  const { isInstalled, canInstall, isIOS, promptInstall } = useInstallPrompt();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [, forceUpdate] = useState(0);
  // Track dismissed cards in state — read from localStorage only on mount
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const dismissed = new Set<string>();
    for (const card of carouselCards) {
      if (localStorage.getItem(`carousel_dismissed_${card.id}`) === "true") {
        dismissed.add(card.id);
      }
    }
    setDismissedIds(dismissed);
  }, []);

  // Determine which cards to show
  const isNewUser = useMemo(() => {
    const createdAt = household?.created_at;
    if (!createdAt) return false;
    const createdMs = createdAt.toMillis();
    return Date.now() - createdMs < NEW_USER_DAYS * 24 * 60 * 60 * 1000;
  }, [household?.created_at]);

  const visibleCards = useMemo(() => carouselCards.filter((card) => {
    if (dismissedIds.has(card.id)) return false;
    switch (card.showCondition) {
      case "not-installed":
        return !isInstalled;
      case "single-member":
        return members.length < 2;
      case "new-user":
        return isNewUser;
      case "always":
      default:
        return true;
    }
  }), [dismissedIds, isInstalled, members.length, isNewUser]);

  // Scroll observer for pagination dots
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setupObserver = useCallback(() => {
    if (!scrollRef.current) return;
    observerRef.current?.disconnect();

    const cards = scrollRef.current.querySelectorAll("[data-carousel-index]");
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.carouselIndex);
            setActiveIndex(idx);
          }
        }
      },
      { root: scrollRef.current, threshold: 0.6 }
    );

    cards.forEach((card) => observerRef.current!.observe(card));
    return () => observerRef.current?.disconnect();
  }, []);

  useEffect(() => {
    const cleanup = setupObserver();
    return cleanup;
  }, [visibleCards.length, setupObserver]);

  const handleAction = async (card: CardConfig) => {
    if (card.ctaAction === "install") {
      if (canInstall) {
        const accepted = await promptInstall();
        if (accepted) toast.success("Melon installed!");
      } else if (isIOS) {
        router.push("/settings");
      }
    } else if (card.ctaAction === "navigate" && card.ctaTarget) {
      router.push(card.ctaTarget);
    }
  };

  const handleDismiss = (card: CardConfig) => {
    dismissCard(card.id);
    setDismissedIds((prev) => new Set(prev).add(card.id));
  };

  if (visibleCards.length === 0) return null;

  return (
    <div data-testid="home-carousel">
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {visibleCards.map((card, i) => (
          <div key={card.id} data-carousel-index={i}>
            <CarouselCard
              card={card}
              onAction={() => handleAction(card)}
              onDismiss={card.dismissible ? () => handleDismiss(card) : undefined}
            />
          </div>
        ))}
      </div>
      {/* Pagination dots */}
      {visibleCards.length > 1 && (
        <div className="flex justify-center gap-1.5 pt-2">
          {visibleCards.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === activeIndex ? "bg-blue-400" : "bg-slate-700"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
