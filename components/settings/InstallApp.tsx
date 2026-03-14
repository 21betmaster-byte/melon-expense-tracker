"use client";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Share, PlusSquare, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export const InstallApp = () => {
  const { canInstall, isInstalled, isIOS, promptInstall } = useInstallPrompt();

  // Already installed
  if (isInstalled) {
    return (
      <Card className="bg-slate-900 border-slate-800" data-testid="install-app-card">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
            <Smartphone className="w-4 h-4 text-green-400" />
            Install Melon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="w-4 h-4" />
            <p className="text-sm">Melon is installed on your device.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // iOS — manual instructions
  if (isIOS) {
    return (
      <Card className="bg-slate-900 border-slate-800" data-testid="install-app-card">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
            <Smartphone className="w-4 h-4 text-blue-400" />
            Install Melon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3" data-testid="install-app-ios-instructions">
          <p className="text-sm text-slate-400">
            Install Melon for quick access from your home screen.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Share className="w-4 h-4 text-blue-400" />
              <span>1. Tap the Share button</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <PlusSquare className="w-4 h-4 text-blue-400" />
              <span>2. Select &quot;Add to Home Screen&quot;</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Android/Desktop — trigger beforeinstallprompt
  if (canInstall) {
    const handleInstall = async () => {
      const accepted = await promptInstall();
      if (accepted) {
        toast.success("Melon installed!");
      }
    };

    return (
      <Card className="bg-slate-900 border-slate-800" data-testid="install-app-card">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
            <Smartphone className="w-4 h-4 text-blue-400" />
            Install Melon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-400">
            Add Melon to your home screen for quick access.
          </p>
          <Button size="sm" onClick={handleInstall} data-testid="install-app-btn">
            Install
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Fallback — browser doesn't support beforeinstallprompt or prompt hasn't fired yet
  return (
    <Card className="bg-slate-900 border-slate-800" data-testid="install-app-card">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
          <Smartphone className="w-4 h-4 text-blue-400" />
          Install Melon
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-400">
          Install Melon for quick access from your home screen.
        </p>
        <div className="space-y-2">
          <p className="text-xs text-slate-500">
            Open this page in Chrome or Edge, then look for the install option
            in your browser&apos;s menu (⋮ &gt; &quot;Install app&quot; or
            &quot;Add to Home Screen&quot;).
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
