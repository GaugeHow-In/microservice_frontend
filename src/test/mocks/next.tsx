import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { vi } from "vitest";

export const mockUsePathname = vi.fn(() => "/dashboard");
export const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string | { pathname?: string };
    children: ReactNode;
  } & AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const resolvedHref =
      typeof href === "string" ? href : (href as { pathname?: string }).pathname ?? "#";

    return createElement("a", { href: resolvedHref, ...props }, children);
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname,
  notFound: mockNotFound,
}));
