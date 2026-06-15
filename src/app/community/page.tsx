import { Award, MessageCircle, Sparkles, ThumbsUp, Trophy, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { communityPosts } from "@/lib/mock-data";

export default function CommunityPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Community"
          title="A focused peer space for doubts, progress, and wins."
          description="Feed, discussions, doubts, and achievements designed to feel motivating without becoming noisy."
          action={
            <Button>
              <MessageCircle />
              Ask doubt
            </Button>
          }
        />
        <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            {communityPosts.map((post) => (
              <Card key={post.text}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{post.author.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-bold text-slate-950">{post.author}</h2>
                      <Badge variant={post.badge === "Achievement" ? "green" : "orange"}>
                        {post.badge}
                      </Badge>
                    </div>
                  </div>
                  <p className="leading-7 text-slate-700">{post.text}</p>
                  <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-500">
                    <span className="flex items-center gap-1">
                      <MessageCircle className="size-4" />
                      {post.replies} replies
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="size-4" />
                      {post.xp} XP
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="size-4" />
                      Helpful
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <aside className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Gamified progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: Users, title: "Study circles", detail: "12 active" },
                  { icon: Award, title: "Weekly achievers", detail: "48 wins" },
                  { icon: Sparkles, title: "AI-reviewed doubts", detail: "93 solved" },
                ].map(({ icon: Icon, title, detail }) => (
                  <div key={title} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                    <Icon className="size-5 text-orange-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{title}</p>
                      <p className="text-xs text-slate-500">{detail}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
