import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthCard } from "@/components/sections/auth-card";

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({
    beginOAuth: vi.fn(),
    forgotPassword: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    resendVerification: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
  }),
}));

describe("AuthCard", () => {
  it("renders the login flow fields and links", () => {
    render(createElement(AuthCard, { mode: "login" }));

    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });

  it("renders the signup flow with the full name field", () => {
    render(createElement(AuthCard, { mode: "signup" }));

    expect(screen.getByPlaceholderText("Full name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login");
  });

  it("renders the forgot password flow without the password input", () => {
    render(createElement(AuthCard, { mode: "forgot" }));

    expect(screen.getByRole("heading", { name: "Reset password" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Password")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send code" })).toBeInTheDocument();
  });

  it("renders the verify flow with code and email inputs", () => {
    render(createElement(AuthCard, { mode: "verify" }));

    expect(screen.getByRole("heading", { name: "Verify email" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("6-digit code")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verify email" })).toBeInTheDocument();
  });

  it("renders reset flow without asking for email twice when it is already known", () => {
    render(createElement(AuthCard, { mode: "reset", initialEmail: "learner@example.com" }));

    expect(screen.queryByPlaceholderText("Email address")).not.toBeInTheDocument();
    expect(screen.getByText(/resetting password for/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("New password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm new password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show new password" })).toBeInTheDocument();
  });
});
