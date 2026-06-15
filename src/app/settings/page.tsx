import { Bell, Eye, Palette, Shield, Sparkles, User } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  const sections = [
    { icon: User, title: "Account", text: "Name, email, profile, and connected learning identity." },
    { icon: Bell, title: "Notifications", text: "Study reminders, goal alerts, streak nudges, and community replies." },
    { icon: Palette, title: "Appearance", text: "Theme preference, density, reading comfort, and accent choices." },
    { icon: Shield, title: "Privacy", text: "Profile visibility, progress sharing, and data export controls." },
    { icon: Sparkles, title: "AI preferences", text: "Preferred explanations, planning style, and recommendation tone." },
    { icon: Eye, title: "Gamification", text: "XP visibility, badges, streaks, leaderboards, and milestones." },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Settings"
          title="Control the learning environment."
          description="Account, notifications, appearance, privacy, AI preferences, and gamification settings for the prototype."
        />
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                    <Icon className="size-5" />
                  </div>
                  <Badge>Mock</Badge>
                </div>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-slate-600">{text}</p>
                <Button variant="secondary" className="mt-5 w-full">
                  Configure
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
