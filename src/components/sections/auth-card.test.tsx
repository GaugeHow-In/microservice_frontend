import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthCard } from "@/components/sections/auth-card";

describe("AuthCard", () => {
  it("renders the login flow fields and links", () => {
    render(createElement(AuthCard, { mode: "login" }));

    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/dashboard");
  });

  it("renders the signup flow with the full name field", () => {
    render(createElement(AuthCard, { mode: "signup" }));

    expect(screen.getByPlaceholderText("Full name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login");
  });

  it("renders the forgot password flow without the password input", () => {
    render(createElement(AuthCard, { mode: "forgot" }));

    expect(screen.getByRole("heading", { name: "Reset password" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Password")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Send OTP" })).toHaveAttribute("href", "/otp");
  });

  it("renders the OTP flow with six code inputs", () => {
    render(createElement(AuthCard, { mode: "otp" }));

    expect(screen.getByRole("heading", { name: "Verify OTP" })).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
    expect(screen.queryByPlaceholderText("Email address")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Verify code" })).toHaveAttribute("href", "/dashboard");
  });
});
