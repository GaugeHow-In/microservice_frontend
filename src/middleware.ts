import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  if (request.nextUrl.pathname === "/") {
    const destination = request.nextUrl.clone();
    destination.pathname = user ? "/dashboard" : "/login";
    const redirectResponse = NextResponse.redirect(destination);
    // updateSession may have rotated the auth cookies; without copying them the
    // refreshed session would be dropped on the redirect hop.
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
