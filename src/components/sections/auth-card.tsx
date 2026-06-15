import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AuthCardProps = {
  mode: "login" | "signup" | "forgot" | "otp";
};

const copy = {
  login: {
    title: "Welcome back",
    subtitle: "Continue your goals, streaks, courses, and AI-guided study plan.",
    primary: "Login",
    footer: "New to GaugeHow?",
    link: "Create account",
    href: "/signup",
  },
  signup: {
    title: "Create your learning OS",
    subtitle: "Start with goals, courses, notes, tests, and AI mentor support.",
    primary: "Create account",
    footer: "Already have an account?",
    link: "Login",
    href: "/login",
  },
  forgot: {
    title: "Reset password",
    subtitle: "Enter your email and we will send a verification code.",
    primary: "Send OTP",
    footer: "Remembered it?",
    link: "Back to login",
    href: "/login",
  },
  otp: {
    title: "Verify OTP",
    subtitle: "Enter the 6-digit code sent to your email to continue.",
    primary: "Verify code",
    footer: "Wrong email?",
    link: "Edit email",
    href: "/forgot-password",
  },
};

export function AuthCard({ mode }: AuthCardProps) {
  const data = copy[mode];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-[1fr_0.9fr]">
        <section className="hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <BrandLogo className="text-white" />
          <div className="max-w-xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-orange-200">
              <ShieldCheck className="size-4" />
              Frontend prototype
            </div>
            <h1 className="text-5xl font-bold tracking-normal">
              Your Learning. Measured.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              A focused workspace where students turn goals into weekly study
              momentum with courses, notes, tests, and AI assistance.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["23-day streak", "68% goal", "12.4k XP"].map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">{item}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between">
              <BrandLogo />
              <Button asChild variant="ghost" size="sm">
                <Link href="/">
                  <ArrowLeft />
                  Home
                </Link>
              </Button>
            </div>
            <Card>
              <CardContent className="space-y-6 p-6 sm:p-8">
                <div>
                  <h1 className="text-2xl font-bold tracking-normal text-slate-950">
                    {data.title}
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{data.subtitle}</p>
                </div>
                <div className="space-y-4">
                  {mode === "signup" && <Input placeholder="Full name" />}
                  {mode !== "otp" ? (
                    <Input type="email" placeholder="Email address" />
                  ) : (
                    <div className="grid grid-cols-6 gap-2">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <Input
                          key={index}
                          maxLength={1}
                          className="px-0 text-center text-lg font-bold"
                          defaultValue={index < 2 ? String(index + 2) : ""}
                        />
                      ))}
                    </div>
                  )}
                  {(mode === "login" || mode === "signup") && (
                    <Input type="password" placeholder="Password" />
                  )}
                  {mode === "login" && (
                    <div className="flex justify-end">
                      <Link
                        href="/forgot-password"
                        className="text-sm font-semibold text-orange-600 hover:text-orange-700"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  )}
                </div>
                <Button asChild className="w-full">
                  <Link href={mode === "otp" ? "/dashboard" : mode === "forgot" ? "/otp" : "/dashboard"}>
                    {mode === "forgot" && <Mail />}
                    {data.primary}
                  </Link>
                </Button>
                <p className="text-center text-sm text-slate-500">
                  {data.footer}{" "}
                  <Link href={data.href} className="font-semibold text-orange-600">
                    {data.link}
                  </Link>
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}

