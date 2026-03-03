"use client";
import { useState } from "react";
import { updateHouseholdCurrency } from "@/lib/firebase/firestore";
import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Coins } from "lucide-react";
import { toast } from "sonner";

const CURRENCIES = [
  { code: "INR", label: "₹ Indian Rupee (INR)" },
  { code: "USD", label: "$ US Dollar (USD)" },
  { code: "EUR", label: "€ Euro (EUR)" },
  { code: "GBP", label: "£ British Pound (GBP)" },
  { code: "AED", label: "AED UAE Dirham" },
  { code: "SGD", label: "SGD Singapore Dollar" },
  { code: "CAD", label: "CAD Canadian Dollar" },
  { code: "AUD", label: "AUD Australian Dollar" },
];

export const CurrencySelector = () => {
  const { household, setHousehold } = useAppStore();
  const [selected, setSelected] = useState(household?.currency ?? "INR");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!household?.id || selected === household.currency) return;
    setSaving(true);
    try {
      await updateHouseholdCurrency(household.id, selected);
      setHousehold({ ...household, currency: selected });
      toast.success(`Currency updated to ${selected}.`);
    } catch {
      toast.error("Failed to update currency.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
          <Coins className="w-4 h-4 text-yellow-400" />
          Currency
        </CardTitle>
        <CardDescription className="text-slate-400 text-xs">
          All expenses will be shown in this currency.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger
            className="bg-slate-800 border-slate-700"
            data-testid="currency-select"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map(({ code, label }) => (
              <SelectItem key={code} value={code}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || selected === household?.currency}
          className="w-full"
          data-testid="save-currency-btn"
        >
          {saving ? "Saving…" : "Save Currency"}
        </Button>
      </CardContent>
    </Card>
  );
};
