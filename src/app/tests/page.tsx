import Link from "next/link";
import { Activity, BarChart3, Clock, Target } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { performanceTrend, tests } from "@/lib/mock-data";

export default function TestsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Test platform"
          title="Practice, analyze, and improve with measurable feedback."
          description="Track active tests, previous tests, results, accuracy charts, topic analysis, and performance trends."
          action={
            <Button asChild>
              <Link href="/tests/analytics">
                <BarChart3 />
                Analytics
              </Link>
            </Button>
          }
        />
        <section className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Accuracy", value: "78%", icon: Target },
            { label: "Avg score", value: "132/180", icon: BarChart3 },
            { label: "Tests taken", value: "18", icon: Activity },
            { label: "Study time", value: "42h", icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
                </div>
                <Icon className="size-5 text-orange-500" />
              </CardContent>
            </Card>
          ))}
        </section>
        <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Active and previous tests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tests.map((test) => (
                <div key={test.title} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-bold text-slate-950">{test.title}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {test.questions} questions · {test.duration}
                      </p>
                    </div>
                    <Badge variant={test.status === "Completed" ? "green" : "orange"}>
                      {test.status}
                    </Badge>
                  </div>
                  {test.accuracy > 0 && <Progress value={test.accuracy} className="mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Performance trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-56 items-end gap-3">
                {performanceTrend.map((item) => (
                  <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                    <div className="w-full rounded-t-md bg-orange-500" style={{ height: `${item.value * 2}px` }} />
                    <span className="text-xs font-semibold text-slate-500">{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ["Active Tests", "/tests/active"],
            ["Previous Tests", "/tests/previous"],
            ["Results", "/tests/results"],
            ["Analytics", "/tests/analytics"],
          ].map(([label, href]) => (
            <Button key={label} asChild variant="secondary">
              <Link href={href}>{label}</Link>
            </Button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
