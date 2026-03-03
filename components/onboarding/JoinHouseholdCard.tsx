"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getHouseholdByInviteCode, joinHousehold, getUserProfile } from "@/lib/firebase/firestore";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Users } from "lucide-react";

interface JoinHouseholdCardProps {
  onSuccess?: () => void;
}

export const JoinHouseholdCard = ({ onSuccess }: JoinHouseholdCardProps) => {
  const router = useRouter();
  const { firebaseUser, setUser } = useAppStore();
  const [inviteInput, setInviteInput] = useState("");
  const [loading, setLoading] = useState(false);

  const extractCode = (input: string): string => {
    const match = input.match(/\/invite\/([^/\s]+)/);
    return match ? match[1] : input.trim();
  };

  const handleJoin = async () => {
    if (!firebaseUser || !inviteInput.trim()) return;
    const code = extractCode(inviteInput);
    setLoading(true);

    try {
      const household = await getHouseholdByInviteCode(code);
      if (!household) {
        toast.error("This invite link is invalid or expired.");
        return;
      }

      const result = await joinHousehold(household.id, firebaseUser.uid);

      if (result === "success") {
        const updatedProfile = await getUserProfile(firebaseUser.uid);
        if (updatedProfile) setUser(updatedProfile);
        toast.success("Joined household successfully!");
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/dashboard");
        }
      } else if (result === "full") {
        toast.error("This household is already full (max 2 members).", {
          description: "Household full",
        });
      } else {
        toast.error("This invite link is invalid or expired.");
      }
    } catch {
      toast.error("Failed to join household. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-green-400" />
          Join a Household
        </CardTitle>
        <CardDescription className="text-slate-400">
          Paste the invite link or code shared by your partner.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          value={inviteInput}
          onChange={(e) => setInviteInput(e.target.value)}
          placeholder="Paste invite link or code…"
          className="bg-slate-800 border-slate-700"
          data-testid="invite-code-input"
        />
        <Button
          onClick={handleJoin}
          disabled={loading || !inviteInput.trim()}
          className="w-full"
          data-testid="join-household-btn"
        >
          {loading ? "Joining…" : "Join Household"}
        </Button>
      </CardContent>
    </Card>
  );
};
