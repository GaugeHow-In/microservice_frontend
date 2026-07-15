import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandLogo } from "@/components/shared/brand-logo";

describe("BrandLogo", () => {
  it("renders the full brand lockup by default", () => {
    render(createElement(BrandLogo));

    expect(screen.getByRole("link", { name: /gaugehowlearning os/i })).toHaveAttribute("href", "/");
    expect(screen.getByText("GaugeHow")).toBeInTheDocument();
    expect(screen.getByText("Learning OS")).toBeInTheDocument();
  });

  it("renders a compact variant without the text lockup", () => {
    render(createElement(BrandLogo, { compact: true }));

    expect(screen.getByRole("link")).toHaveAttribute("href", "/");
    expect(screen.queryByText("Learning OS")).not.toBeInTheDocument();
  });

  it("links wherever href points, so signed-in shells can target the dashboard", () => {
    render(createElement(BrandLogo, { href: "/dashboard" }));

    expect(screen.getByRole("link", { name: /gaugehowlearning os/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});
