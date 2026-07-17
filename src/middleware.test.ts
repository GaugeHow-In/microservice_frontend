import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { middleware } from "@/middleware";
import { updateSession } from "@/utils/supabase/middleware";

vi.mock("@/utils/supabase/middleware", () => ({
  updateSession: vi.fn(),
}));

const updateSessionMock = vi.mocked(updateSession);

function mockSession(user: { id: string } | null, cookies: Record<string, string> = {}) {
  const response = NextResponse.next();
  for (const [name, value] of Object.entries(cookies)) {
    response.cookies.set(name, value);
  }
  updateSessionMock.mockResolvedValue({
    response,
    user: user as Awaited<ReturnType<typeof updateSession>>["user"],
  });
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends signed-in visitors from the apex to the dashboard", async () => {
    mockSession({ id: "user-1" });

    const response = await middleware(new NextRequest("https://gaugehow.ai/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://gaugehow.ai/dashboard");
  });

  it("sends signed-out visitors from the apex to the login page", async () => {
    mockSession(null);

    const response = await middleware(new NextRequest("https://gaugehow.ai/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://gaugehow.ai/login");
  });

  it("carries refreshed auth cookies onto the redirect", async () => {
    mockSession({ id: "user-1" }, { "sb-access-token": "rotated" });

    const response = await middleware(new NextRequest("https://gaugehow.ai/"));

    expect(response.cookies.get("sb-access-token")?.value).toBe("rotated");
  });

  it("leaves every other route alone", async () => {
    mockSession({ id: "user-1" });

    const response = await middleware(new NextRequest("https://gaugehow.ai/courses"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
