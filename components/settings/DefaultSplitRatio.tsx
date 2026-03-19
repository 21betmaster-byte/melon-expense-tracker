"use client";
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { SlidersHorizontal } from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { toast } from "sonner";

export const DefaultSplitRatio = () => {
  const { household, setHousehold, user, members } = useAppStore();

  const currentRatio = household?.default_split_ratio;
  const initialPct = currentRatio != null ? Math.round(currentRatio * 100) : 50;

  const [pct, setPct] = useState(initialPct);
  const [saving, setSaving] = useState(false);

  const partnerPct = 100 - pct;

  // Resolve display names
  const currentUser = members.find((m) => m.uid === user?.uid);
  const partner = members.find((m) => m.uid !== user?.uid);
  const userName = currentUser?.name ?? "You";
  const partnerName = partner?.name ?? "Your partner";

  const currency = household?.currency ?? "INR";
  const currencySymbol =
    currency === "INR" ? "\u20B9" : currency === "USD" ? "$" : currency === "EUR" ? "\u20AC" : currency === "GBP" ? "\u00A3" : currency;

  const hasChanged = pct !== initialPct;

  const handleSave = async () => {
    if (!household?.id) return;
    setSaving(true);
    try {
      const decimalValue = pct / 100;
      await updateDoc(doc(db, "households", household.id), { default_split_ratio: decimalValue });
      setHousehold({ ...household, default_split_ratio: decimalValue });
      toast.success("Default split ratio updated.");
    } catch {
      toast.error("Failed to update split ratio.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
          <SlidersHorizontal className="w-4 h-4 text-blue-400" />
          Default Split Ratio
          <InfoTooltip text="Set the default split percentage for new joint expenses. Example: If set to 70:30, when you add a joint expense, it will automatically split 70% to the payer and 30% to the partner. You can always override this on individual expenses." />
        </CardTitle>
        <CardDescription className="text-slate-400 text-xs">
          Pre-fill the split slider when creating new joint expenses.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Split label */}
        <p className="text-sm text-slate-300">
          {userName}: {pct}% &middot; {partnerName}: {partnerPct}%
        </p>

        {/* Slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-8 text-right">0%</span>
          <Slider
            min={0}
            max={100}
            step={5}
            value={[pct]}
            onValueChange={([v]) => setPct(v)}
            data-testid="default-split-slider"
          />
          <span className="text-xs text-slate-500 w-8">100%</span>
        </div>

        {/* Dynamic example */}
        <p className="text-xs text-slate-500">
          Example: If {userName} pays {currencySymbol}1,000 for groceries with a {pct}:{partnerPct} split, {userName} covers {currencySymbol}{pct * 10} and {partnerName} covers {currencySymbol}{partnerPct * 10}.
        </p>

        {/* Save button */}
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !hasChanged}
          className="w-full"
          data-testid="save-split-ratio-btn"
        >
          {saving ? "Saving\u2026" : "Save Split Ratio"}
        </Button>
      </CardContent>
    </Card>
  );
};
