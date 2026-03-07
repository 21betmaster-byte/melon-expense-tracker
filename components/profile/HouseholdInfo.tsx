"use client";
import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import Link from "next/link";

export const HouseholdInfo = () => {
  const { household, members, user } = useAppStore();

  if (!household) {
    return (
      <Card className="bg-slate-900 border-slate-800" data-testid="profile-household-card">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-slate-400" />
            Your Household
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400">
            No household yet.{" "}
            <Link href="/onboarding" className="text-blue-400 hover:underline">
              Set up your household
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-800" data-testid="profile-household-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
          <Users className="w-4 h-4 text-green-400" />
          Your Household
        </CardTitle>
        <Badge variant="secondary" className="text-xs bg-slate-800 text-slate-300">
          {household.currency}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {members.map((m) => (
          <div
            key={m.uid}
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {m.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-slate-200">
                {m.name}
                {m.uid === user?.uid && (
                  <span className="text-xs text-slate-500 ml-1.5">(you)</span>
                )}
              </p>
              <p className="text-xs text-slate-500">{m.email}</p>
            </div>
          </div>
        ))}
        {members.length < 2 && (
          <p className="text-xs text-slate-500 pt-1">
            No partner yet.{" "}
            <Link href="/settings" className="text-blue-400 hover:underline">
              Invite from Settings
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
};
