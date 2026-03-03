import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppNav } from "@/components/layout/AppNav";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { ReminderBanner } from "@/components/layout/ReminderBanner";
import { TourProvider } from "@/components/tour/TourProvider";
import { FeedbackProvider } from "@/components/feedback/FeedbackProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <TourProvider>
        <FeedbackProvider>
          <OfflineBanner />
          <ReminderBanner />
          <AppNav />
          <main className="pb-24 pt-2 px-4 max-w-2xl mx-auto">{children}</main>
        </FeedbackProvider>
      </TourProvider>
    </AuthGuard>
  );
}
