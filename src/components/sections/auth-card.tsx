"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AuthCardProps = {
  mode: "login" | "signup" | "forgot" | "verify" | "reset";
  initialEmail?: string;
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
    primary: "Send code",
    footer: "Remembered it?",
    link: "Back to login",
    href: "/login",
  },
  verify: {
    title: "Verify email",
    subtitle: "Enter the 6-digit code sent to your email to activate your account.",
    primary: "Verify email",
    footer: "Need another code?",
    link: "Resend verification",
    href: "#",
  },
  reset: {
    title: "Create a new password",
    subtitle: "Enter the verification code and choose a new password.",
    primary: "Reset password",
    footer: "Remembered it?",
    link: "Back to login",
    href: "/login",
  },
};

export function AuthCard({ mode, initialEmail = "" }: AuthCardProps) {
  const data = copy[mode];
  const router = useRouter();
  const { beginOAuth, forgotPassword, login, register, resendVerification, resetPassword, verifyEmail } =
    useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "login") {
        await login({ email, password });
        router.push("/dashboard");
      }

      if (mode === "signup") {
        await register({ displayName, email, password });
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      }

      if (mode === "forgot") {
        await forgotPassword(email);
        router.push(`/reset-password?email=${encodeURIComponent(email)}`);
      }

      if (mode === "verify") {
        await verifyEmail({ email, code });
        setMessage("Email verified. You can log in now.");
        router.push("/login");
      }

      if (mode === "reset") {
        await resetPassword({ email, code, newPassword });
        setMessage("Password reset successful.");
        router.push("/login");
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

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
                  {mode !== "verify" && (
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  )}
                  {mode === "signup" && (
                    <Input
                      placeholder="Full name"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                    />
                  )}
                  {(mode === "login" || mode === "signup") && (
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  )}
                  {(mode === "verify" || mode === "reset") && (
                    <>
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                      <Input
                        placeholder="6-digit code"
                        inputMode="numeric"
                        maxLength={6}
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                      />
                    </>
                  )}
                  {mode === "reset" && (
                    <Input
                      type="password"
                      placeholder="New password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
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
                  {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
                  {message ? <p className="text-sm font-medium text-emerald-600">{message}</p> : null}
                </div>
                <Button className="w-full" onClick={submit} disabled={isSubmitting}>
                  {isSubmitting ? <LoaderCircle className="animate-spin" /> : null}
                  {mode === "forgot" && !isSubmitting ? <Mail /> : null}
                  {data.primary}
                </Button>
                {(mode === "login" || mode === "signup") && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => beginOAuth("google")}
                      disabled={isSubmitting}
                    >
                      Google
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => beginOAuth("github")}
                      disabled={isSubmitting}
                    >
                      GitHub
                    </Button>
                  </div>
                )}
                {mode === "verify" && (
                  <button
                    type="button"
                    className="text-sm font-semibold text-orange-600 hover:text-orange-700"
                    onClick={async () => {
                      try {
                        await resendVerification(email);
                        setMessage("Verification code sent.");
                      } catch (resendError) {
                        setError(resendError instanceof Error ? resendError.message : "Unable to resend code");
                      }
                    }}
                  >
                    Resend verification code
                  </button>
                )}
                <p className="text-center text-sm text-slate-500">
                  {data.footer}{" "}
                  {mode === "verify" ? (
                    <span className="font-semibold text-orange-600">{data.link}</span>
                  ) : (
                    <Link href={data.href} className="font-semibold text-orange-600">
                      {data.link}
                    </Link>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
