"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Check, Envelope, Eye, EyeSlash, Gauge, Notebook, ShieldCheck, Sparkle, SpinnerGap, Wrench, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
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

type FormField =
  | "displayName"
  | "email"
  | "password"
  | "confirmPassword"
  | "code"
  | "newPassword"
  | "confirmNewPassword";
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

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export function AuthCard({ mode, initialEmail = "" }: AuthCardProps) {
  const data = copy[mode];
  const router = useRouter();
  const searchParams = useSearchParams();
  const { beginOAuth, forgotPassword, login, register, resendVerification, resetPassword, verifyEmail } =
    useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOAuthSubmitting, setIsOAuthSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);

  useEffect(() => {
    const oauthError = searchParams.get("oauth_error");
    if (!oauthError) return;
    const messageByReason: Record<string, string> = {
      cancelled: "Google sign-in was cancelled. Please try again.",
      access_denied: "Google sign-in was cancelled. Please try again.",
      failed: "We couldn't complete Google sign-in. Please try again.",
    };
    setError(messageByReason[oauthError] ?? "We couldn't complete Google sign-in. Please try again.");
    router.replace("/login");
  }, [searchParams, router]);

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
    if (field === "confirmPassword") setConfirmPassword(value);
    if (field === "code") setCode(value);
    if (field === "newPassword") setNewPassword(value);
    if (field === "confirmNewPassword") setConfirmNewPassword(value);
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
      if (!confirmPassword) {
        nextErrors.confirmPassword = "Confirm your password.";
      } else if (confirmPassword !== password) {
        nextErrors.confirmPassword = "Passwords do not match.";
      }
      if (!acceptedTerms) {
        setTermsError("Please accept the Terms and Privacy Policy to continue.");
      } else {
        setTermsError(null);
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
      if (!initialEmail && !isValidEmail(email.trim())) {
        nextErrors.email = "Enter a valid email address.";
      }
      if (!/^\d{6}$/.test(code.trim())) {
        nextErrors.code = "Enter the 6-digit verification code.";
      }
      const passwordError = validatePasswordField(newPassword);
      if (passwordError) {
        nextErrors.newPassword = passwordError;
      }
      if (!confirmNewPassword) {
        nextErrors.confirmNewPassword = "Confirm your new password.";
      } else if (confirmNewPassword !== newPassword) {
        nextErrors.confirmNewPassword = "Passwords do not match.";
      }
    }

    setFieldErrors(nextErrors);
    const termsBlocked = mode === "signup" && !acceptedTerms;
    return Object.keys(nextErrors).length === 0 && !termsBlocked;
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
        // /personalize shows the one-time survey for new learners and bounces
        // everyone else straight to the dashboard.
        router.push("/personalize");
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
        router.push("/personalize");
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

  const handleOAuthClick = async () => {
    setIsOAuthSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await beginOAuth("google");
    } catch (oauthError) {
      setError(oauthError instanceof Error ? oauthError.message : "Unable to start Google sign-in");
      setIsOAuthSubmitting(false);
    }
  };

  return (
    <main className="dark-system min-h-screen overflow-hidden bg-[#241a10] text-[#f0e9df]">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.08fr)_minmax(28rem,0.92fr)]">
        <section className="relative hidden overflow-hidden border-r border-white/10 bg-[#2e2117] p-10 text-[#f7f3ee] lg:flex lg:flex-col lg:justify-between">
          <div className="industrial-hero-media absolute inset-0 opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#241a10]/40 to-[#241a10]/90" />
          <div className="absolute inset-0 surface-grid opacity-20" />
          <div className="relative z-10">
            <BrandLogo />
          </div>
          <div className="relative z-10 max-w-2xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#fcbc6c]/25 bg-[#fcbc6c]/10 px-3 py-1 text-sm font-semibold text-[#fcd9a9] shadow-sm">
              <ShieldCheck className="size-4" />
              ISO 9001 Certified Learning
            </div>
            <h1 className="max-w-xl text-5xl font-extrabold leading-tight text-[#fcd9a9]">
              Master the mechanics of tomorrow.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#cbc0b3]/80">
              Join thousands of engineering students accelerating their careers with expert-led
              courses, verified certificates, and an AI study cockpit.
            </p>

            <div className="glass-card mt-8 max-w-xl rounded-xl p-4">
              <div className="rounded-xl bg-[#453320]/70 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-[#e8a855] text-[#2b2118]">
                    <Sparkle className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#f7f3ee]">Ask GaugeHow Mentor</p>
                    <p className="text-xs text-[#ad9e8f]">Explain, calculate, verify, and plan your next module.</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Calculate gear ratios", "Explain stress-strain", "Verify FEA mesh"].map((item) => (
                    <span
                      key={item}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#f0e9df]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="relative z-10 grid grid-cols-3 gap-3">
            {[
              { label: "CAD Pro", icon: Wrench },
              { label: "68% goal", icon: Gauge },
              { label: "Notes ready", icon: Notebook },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="glass-card rounded-xl p-4">
                  <Icon className="size-5 text-[#fcd9a9]" />
                  <p className="mt-3 text-sm font-semibold text-[#f7f3ee]">{item.label}</p>
                </div>
              );
            })}
          </div>
        </section>
        <section className="flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center">
              <BrandLogo />
            </div>
            <Card className="glass-card overflow-hidden rounded-xl bg-[#4a3826]/80 shadow-[0_0_44px_rgba(232,168,85,0.12)]">
              <CardContent className="space-y-6 p-6 sm:p-8">
                <div className="rounded-xl bg-[#453320] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-[#e8a855] text-[#2b2118]">
                      <BookOpen className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#f7f3ee]">GaugeHow workspace</p>
                      <p className="text-xs text-[#ad9e8f]">Courses, tests, mentor, and notes in one place.</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-normal text-[#f7f3ee]">
                    {data.title}
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-[#ad9e8f]">{data.subtitle}</p>
                </div>
                {(mode === "login" || mode === "signup") && (
                  <div className="space-y-4">
                    <Button
                      size="lg"
                      onClick={handleOAuthClick}
                      disabled={isSubmitting || isOAuthSubmitting}
                      className="w-full gap-3 rounded-xl bg-white py-6 text-base font-semibold text-[#1f2937] shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition hover:bg-white hover:shadow-[0_10px_30px_rgba(0,0,0,0.36)]"
                    >
                      {isOAuthSubmitting ? (
                        <SpinnerGap className="animate-spin" />
                      ) : (
                        <GoogleIcon className="!size-5" />
                      )}
                      Continue with Google
                    </Button>
                    <p className="text-center text-xs text-[#ad9e8f]">
                      {mode === "signup"
                        ? "Fastest way to start — no password to create."
                        : "One tap to pick up where you left off."}
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <span className="h-px flex-1 bg-white/15" />
                      <span className="text-xs font-medium uppercase tracking-wide text-[#8f8375]">
                        or use email
                      </span>
                      <span className="h-px flex-1 bg-white/15" />
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  {mode !== "verify" && mode !== "reset" && (
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
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          value={password}
                          onChange={(event) => setFieldValue("password", event.target.value)}
                          aria-invalid={Boolean(fieldErrors.password)}
                          className={fieldErrors.password ? "border-rose-300 pr-12 focus:border-rose-300 focus:ring-rose-100" : "pr-12"}
                        />
                        <button
                          type="button"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                          onClick={() => setShowPassword((value) => !value)}
                        >
                          {showPassword ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      {mode === "signup" ? (
                        <div className="space-y-3 rounded-lg bg-slate-50 p-4">
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
                      {mode === "signup" ? (
                        <>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm password"
                              value={confirmPassword}
                              onChange={(event) => setFieldValue("confirmPassword", event.target.value)}
                              aria-invalid={Boolean(fieldErrors.confirmPassword)}
                              className={fieldErrors.confirmPassword ? "border-rose-300 pr-12 focus:border-rose-300 focus:ring-rose-100" : "pr-12"}
                            />
                            <button
                              type="button"
                              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                              onClick={() => setShowConfirmPassword((value) => !value)}
                            >
                              {showConfirmPassword ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
                            </button>
                          </div>
                          {fieldErrors.confirmPassword ? (
                            <p className="text-sm text-rose-600">{fieldErrors.confirmPassword}</p>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  )}
                  {(mode === "verify" || mode === "reset") && (
                    <>
                      {mode === "verify" || !initialEmail ? (
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
                      ) : (
                        <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          Resetting password for <span className="font-semibold text-slate-950">{email}</span>
                        </div>
                      )}
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
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="New password"
                          value={newPassword}
                          onChange={(event) => setFieldValue("newPassword", event.target.value)}
                          aria-invalid={Boolean(fieldErrors.newPassword)}
                          className={fieldErrors.newPassword ? "border-rose-300 pr-12 focus:border-rose-300 focus:ring-rose-100" : "pr-12"}
                        />
                        <button
                          type="button"
                          aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                          onClick={() => setShowNewPassword((value) => !value)}
                        >
                          {showNewPassword ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      <div className="space-y-3 rounded-lg bg-slate-50 p-4">
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
                      <div className="relative">
                        <Input
                          type={showConfirmNewPassword ? "text" : "password"}
                          placeholder="Confirm new password"
                          value={confirmNewPassword}
                          onChange={(event) => setFieldValue("confirmNewPassword", event.target.value)}
                          aria-invalid={Boolean(fieldErrors.confirmNewPassword)}
                          className={fieldErrors.confirmNewPassword ? "border-rose-300 pr-12 focus:border-rose-300 focus:ring-rose-100" : "pr-12"}
                        />
                        <button
                          type="button"
                          aria-label={showConfirmNewPassword ? "Hide confirm new password" : "Show confirm new password"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                          onClick={() => setShowConfirmNewPassword((value) => !value)}
                        >
                          {showConfirmNewPassword ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      {fieldErrors.confirmNewPassword ? (
                        <p className="text-sm text-rose-600">{fieldErrors.confirmNewPassword}</p>
                      ) : null}
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
                  {mode === "signup" && (
                    <div className="space-y-2">
                      <label className="flex cursor-pointer items-start gap-3 text-sm text-[#cbc0b3]">
                        <input
                          type="checkbox"
                          checked={acceptedTerms}
                          onChange={(event) => {
                            setAcceptedTerms(event.target.checked);
                            if (event.target.checked) setTermsError(null);
                          }}
                          aria-invalid={Boolean(termsError)}
                          className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-white/20 bg-transparent accent-[#e8a855]"
                        />
                        <span>
                          I agree to the{" "}
                          <Link
                            href="/terms"
                            target="_blank"
                            className="font-semibold text-[#fcd9a9] underline underline-offset-2 hover:text-[#fce3bb]"
                          >
                            Terms &amp; Conditions
                          </Link>{" "}
                          and{" "}
                          <Link
                            href="/privacy"
                            target="_blank"
                            className="font-semibold text-[#fcd9a9] underline underline-offset-2 hover:text-[#fce3bb]"
                          >
                            Privacy Policy
                          </Link>
                          .
                        </span>
                      </label>
                      {termsError ? <p className="text-sm font-medium text-rose-400">{termsError}</p> : null}
                    </div>
                  )}
                  {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
                  {message ? <p className="text-sm font-medium text-emerald-600">{message}</p> : null}
                </div>
                <Button
                  variant={mode === "login" || mode === "signup" ? "secondary" : "default"}
                  className="w-full"
                  onClick={submit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <SpinnerGap className="animate-spin" /> : null}
                  {mode === "forgot" && !isSubmitting ? <Envelope /> : null}
                  {data.primary}
                </Button>
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
            <nav className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium text-[#8f8375]">
              <Link href="/about" className="transition hover:text-[#fcd9a9]">
                About Us
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/contact" className="transition hover:text-[#fcd9a9]">
                Contact Us
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/terms" className="transition hover:text-[#fcd9a9]">
                Terms
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/privacy" className="transition hover:text-[#fcd9a9]">
                Privacy
              </Link>
            </nav>
          </div>
        </section>
      </div>
    </main>
  );
}
