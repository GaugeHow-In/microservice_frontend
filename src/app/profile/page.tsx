import { BookOpen, Flame, GraduationCap, Settings, Target, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { ProgressRing } from "@/components/shared/progress-ring";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { achievements, courses, goals, student } from "@/lib/mock-data";

export default function ProfilePage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Profile"
          title="Learning identity, history, and achievements."
          description="Stats, learning history, certificates, goals, achievements, and preferences for the student profile."
          action={
            <Button variant="secondary">
              <Settings />
              Edit preferences
            </Button>
          }
        />
        <Card>
          <CardContent className="grid gap-6 p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
            <Avatar className="size-20">
              <AvatarFallback className="text-xl">{student.avatar}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-slate-950">{student.name}</h1>
              <p className="mt-1 text-slate-500">{student.role}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="orange">Level {student.level}</Badge>
                <Badge variant="green">{student.streak}-day streak</Badge>
                <Badge>{student.xp.toLocaleString()} XP</Badge>
              </div>
            </div>
            <ProgressRing value={student.goalCompletion} label="Goals" />
          </CardContent>
        </Card>
        <section className="grid gap-4 md:grid-cols-4">
          {[
            { icon: Flame, label: "Streak", value: `${student.streak} days` },
            { icon: Target, label: "Goals", value: `${goals.length} active` },
            { icon: GraduationCap, label: "Courses", value: `${courses.length} enrolled` },
            { icon: Trophy, label: "Certificates", value: "3 ready" },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label}>
              <CardContent className="p-5">
                <Icon className="size-5 text-orange-500" />
                <p className="mt-4 text-2xl font-bold text-slate-950">{value}</p>
                <p className="text-sm text-slate-500">{label}</p>
              </CardContent>
            </Card>
          ))}
        </section>
        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Learning history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {courses.map((course) => (
                <div key={course.slug} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <BookOpen className="size-5 text-orange-500" />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-950">{course.title}</p>
                      <Progress value={course.progress} className="mt-2" />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {achievements.map((achievement) => (
                <div key={achievement.title} className="rounded-lg border border-slate-200 p-4">
                  <achievement.icon className="size-6 text-orange-500" />
                  <p className="mt-3 font-bold text-slate-950">{achievement.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{achievement.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
