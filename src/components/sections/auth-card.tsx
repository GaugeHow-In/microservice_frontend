"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, LoaderCircle, Mail, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AuthApiError } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type AuthCardProps = {
  mode: "login" | "signup" | "forgot" | "verify" | "reset";
  initialEmail?: string;
};

type FormField = "displayName" | "email" | "password" | "code" | "newPassword";
type FieldErrors = Partial<Record<FormField, string>>;

const PASSWORD_REQUIREMENTS = [
  { key: "length", label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { key: "uppercase", label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { key: "lowercase", label: "One lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { key: "number", label: "One number", test: (value: string) => /\d/.test(value) },
  { key: "special", label: "One special character", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
] as const;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getPasswordChecks(password: string) {
  return PASSWORD_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    passed: requirement.test(password),
  }));
}

function getPasswordStrength(password: string) {
  const checks = getPasswordChecks(password);
  const passedCount = checks.filter((check) => check.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);
  if (!password) {
    return { label: "Not set", score: 0, tone: "bg-slate-300" };
  }
  if (passedCount <= 2) {
    return { label: "Weak", score, tone: "bg-rose-500" };
  }
  if (passedCount <= 4) {
    return { label: "Good", score, tone: "bg-amber-500" };
  }
  return { label: "Strong", score: 100, tone: "bg-emerald-500" };
}

function validatePasswordField(password: string) {
  if (!password) {
    return "Enter your password.";
  }
  const unmetRequirements = getPasswordChecks(password).some((check) => !check.passed);
  if (unmetRequirements) {
    return "Use 8+ characters with uppercase, lowercase, number, and special character.";
  }
  return null;
}

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const activePassword = mode === "reset" ? newPassword : password;
  const passwordChecks = getPasswordChecks(activePassword);
  const passwordStrength = getPasswordStrength(activePassword);

  const setFieldValue = (field: FormField, value: string) => {
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setError(null);
    if (field === "displayName") setDisplayName(value);
    if (field === "email") setEmail(value);
    if (field === "password") setPassword(value);
    if (field === "code") setCode(value);
    if (field === "newPassword") setNewPassword(value);
  };

  const validateForm = () => {
    const nextErrors: FieldErrors = {};

    if (mode === "signup") {
      if (displayName.trim().length < 2) {
        nextErrors.displayName = "Enter your full name.";
      }
      if (!isValidEmail(email.trim())) {
        nextErrors.email = "Enter a valid email address.";
      }
      const passwordError = validatePasswordField(password);
      if (passwordError) {
        nextErrors.password = passwordError;
      }
    }

    if (mode === "login") {
      if (!isValidEmail(email.trim())) {
        nextErrors.email = "Enter a valid email address.";
      }
      if (!password) {
        nextErrors.password = "Enter your password.";
      }
    }

    if (mode === "forgot") {
      if (!isValidEmail(email.trim())) {
        nextErrors.email = "Enter a valid email address.";
      }
    }

    if (mode === "verify") {
      if (!isValidEmail(email.trim())) {
        nextErrors.email = "Enter a valid email address.";
      }
      if (!/^\d{6}$/.test(code.trim())) {
        nextErrors.code = "Enter the 6-digit verification code.";
      }
    }

    if (mode === "reset") {
      if (!isValidEmail(email.trim())) {
        nextErrors.email = "Enter a valid email address.";
      }
      if (!/^\d{6}$/.test(code.trim())) {
        nextErrors.code = "Enter the 6-digit verification code.";
      }
      const passwordError = validatePasswordField(newPassword);
      if (passwordError) {
        nextErrors.newPassword = passwordError;
      }
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async () => {
    if (!validateForm()) {
      return;
    }
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
      if (submissionError instanceof AuthApiError) {
        setFieldErrors((current) => ({ ...current, ...submissionError.fieldErrors }));
        if (submissionError.status === 401 && mode === "login") {
          setError("Incorrect email or password.");
        } else {
          setError(submissionError.message);
        }
      } else {
        setError(submissionError instanceof Error ? submissionError.message : "Something went wrong");
      }
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
                    <div className="space-y-2">
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(event) => setFieldValue("email", event.target.value)}
                        aria-invalid={Boolean(fieldErrors.email)}
                        className={fieldErrors.email ? "border-rose-300 focus:border-rose-300 focus:ring-rose-100" : undefined}
                      />
                      {fieldErrors.email ? <p className="text-sm text-rose-600">{fieldErrors.email}</p> : null}
                    </div>
                  )}
                  {mode === "signup" && (
                    <div className="space-y-2">
                      <Input
                        placeholder="Full name"
                        value={displayName}
                        onChange={(event) => setFieldValue("displayName", event.target.value)}
                        aria-invalid={Boolean(fieldErrors.displayName)}
                        className={fieldErrors.displayName ? "border-rose-300 focus:border-rose-300 focus:ring-rose-100" : undefined}
                      />
                      {fieldErrors.displayName ? <p className="text-sm text-rose-600">{fieldErrors.displayName}</p> : null}
                    </div>
                  )}
                  {(mode === "login" || mode === "signup") && (
                    <div className="space-y-3">
                      <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(event) => setFieldValue("password", event.target.value)}
                        aria-invalid={Boolean(fieldErrors.password)}
                        className={fieldErrors.password ? "border-rose-300 focus:border-rose-300 focus:ring-rose-100" : undefined}
                      />
                      {mode === "signup" ? (
                        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-700">Password strength</span>
                            <span className="font-semibold text-slate-900">{passwordStrength.label}</span>
                          </div>
                          <Progress value={passwordStrength.score} indicatorClassName={cn(passwordStrength.tone)} />
                          <div className="grid gap-2">
                            {passwordChecks.map((check) => (
                              <div key={check.key} className="flex items-center gap-2 text-sm text-slate-600">
                                {check.passed ? (
                                  <Check className="size-4 text-emerald-600" />
                                ) : (
                                  <X className="size-4 text-slate-400" />
                                )}
                                <span>{check.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {fieldErrors.password ? <p className="text-sm text-rose-600">{fieldErrors.password}</p> : null}
                    </div>
                  )}
                  {(mode === "verify" || mode === "reset") && (
                    <>
                      <div className="space-y-2">
                        <Input
                          type="email"
                          placeholder="Email address"
                          value={email}
                          onChange={(event) => setFieldValue("email", event.target.value)}
                          aria-invalid={Boolean(fieldErrors.email)}
                          className={fieldErrors.email ? "border-rose-300 focus:border-rose-300 focus:ring-rose-100" : undefined}
                        />
                        {fieldErrors.email ? <p className="text-sm text-rose-600">{fieldErrors.email}</p> : null}
                      </div>
                      <div className="space-y-2">
                        <Input
                          placeholder="6-digit code"
                          inputMode="numeric"
                          maxLength={6}
                          value={code}
                          onChange={(event) => setFieldValue("code", event.target.value.replace(/\D/g, ""))}
                          aria-invalid={Boolean(fieldErrors.code)}
                          className={fieldErrors.code ? "border-rose-300 focus:border-rose-300 focus:ring-rose-100" : undefined}
                        />
                        {fieldErrors.code ? <p className="text-sm text-rose-600">{fieldErrors.code}</p> : null}
                      </div>
                    </>
                  )}
                  {mode === "reset" && (
                    <div className="space-y-3">
                      <Input
                        type="password"
                        placeholder="New password"
                        value={newPassword}
                        onChange={(event) => setFieldValue("newPassword", event.target.value)}
                        aria-invalid={Boolean(fieldErrors.newPassword)}
                        className={fieldErrors.newPassword ? "border-rose-300 focus:border-rose-300 focus:ring-rose-100" : undefined}
                      />
                      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">Password strength</span>
                          <span className="font-semibold text-slate-900">{passwordStrength.label}</span>
                        </div>
                        <Progress value={passwordStrength.score} indicatorClassName={cn(passwordStrength.tone)} />
                        <div className="grid gap-2">
                          {passwordChecks.map((check) => (
                            <div key={check.key} className="flex items-center gap-2 text-sm text-slate-600">
                              {check.passed ? (
                                <Check className="size-4 text-emerald-600" />
                              ) : (
                                <X className="size-4 text-slate-400" />
                              )}
                              <span>{check.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {fieldErrors.newPassword ? <p className="text-sm text-rose-600">{fieldErrors.newPassword}</p> : null}
                    </div>
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
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => beginOAuth("google")}
                      disabled={isSubmitting}
                    >
                      Continue with Google
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
