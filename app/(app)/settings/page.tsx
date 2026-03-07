"use client";
import { GroupsManager } from "@/components/settings/GroupsManager";
import { CategoriesManager } from "@/components/settings/CategoriesManager";
import { InvitePartner } from "@/components/settings/InvitePartner";
import { CurrencySelector } from "@/components/settings/CurrencySelector";
import { HouseholdSwitcher } from "@/components/settings/HouseholdSwitcher";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { DangerZone } from "@/components/settings/DangerZone";
import { HelpContact } from "@/components/settings/HelpContact";
import { InstallApp } from "@/components/settings/InstallApp";
import { useAppStore } from "@/store/useAppStore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export default function SettingsPage() {
  const { user, members } = useAppStore();
  const router = useRouter();

  const handleReplayTour = () => {
    localStorage.removeItem("tour_completed");
    localStorage.setItem("onboarding_completed", "true");
    router.push("/dashboard");
  };

  return (
    <div className="space-y-5 pt-4 pb-8">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Settings</h1>
        <p className="text-xs text-slate-500">Manage your household preferences</p>
      </div>

      {/* Multi-household switcher (only visible with 2+ households) */}
      <HouseholdSwitcher />

      {/* Partner invite (hidden when household full) */}
      {members.length < 2 && <InvitePartner />}

      {/* Currency */}
      <CurrencySelector />

      {/* Install App */}
      <InstallApp />

      {/* Groups */}
      <GroupsManager />

      {/* Categories */}
      <CategoriesManager />

      {/* Push Notifications */}
      <NotificationSettings />

      {/* Help & Contact */}
      <HelpContact />

      {/* Danger Zone — Leave Household + Delete Account */}
      <DangerZone />

      {/* Account info + Replay Tour */}
      <div className="px-1 pt-2 border-t border-slate-800 space-y-3">
        <p className="text-xs text-slate-600">Signed in as {user?.email}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReplayTour}
          className="gap-1.5 text-slate-400"
          data-testid="replay-tour-btn"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Replay Feature Tour
        </Button>
      </div>
    </div>
  );
}
