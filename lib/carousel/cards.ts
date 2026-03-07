export interface CarouselCard {
  id: string;
  type: "install" | "promo" | "feature" | "tip";
  title: string;
  subtitle: string;
  icon: string; // Lucide icon name
  gradient: string; // Tailwind gradient classes
  ctaLabel?: string;
  ctaAction?: "install" | "navigate" | "dismiss";
  ctaTarget?: string; // URL path for "navigate" action
  dismissible?: boolean;
  showCondition?: "always" | "not-installed" | "single-member" | "new-user";
}

export const carouselCards: CarouselCard[] = [
  {
    id: "install-app",
    type: "install",
    title: "Add Melon to your homescreen",
    subtitle: "Quick access — no app store needed",
    icon: "Smartphone",
    gradient: "from-blue-600/20 to-blue-500/5",
    ctaLabel: "Install",
    ctaAction: "install",
    dismissible: true,
    showCondition: "not-installed",
  },
  {
    id: "invite-partner",
    type: "promo",
    title: "Track expenses together",
    subtitle: "Invite your partner to split expenses",
    icon: "Users",
    gradient: "from-green-600/20 to-green-500/5",
    ctaLabel: "Invite",
    ctaAction: "navigate",
    ctaTarget: "/settings",
    dismissible: true,
    showCondition: "single-member",
  },
  {
    id: "quick-add-tip",
    type: "tip",
    title: "Quick-add expenses",
    subtitle: "Tap the + button to add expenses in seconds",
    icon: "Zap",
    gradient: "from-purple-600/20 to-purple-500/5",
    dismissible: true,
    showCondition: "new-user",
  },
];
