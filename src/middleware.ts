import { NextResponse, type NextRequest } from "next/server";
import { updateSession, withSessionCookies } from "@/lib/supabase/middleware";

const AUTH_PATHS = new Set(["/login", "/signup"]);

export async function middleware(request: NextRequest) {
  const { response, isAuthed, configured } = await updateSession(request);
  const { pathname } = request.nextUrl;
  const isAuthPage = AUTH_PATHS.has(pathname);

  if (!configured) {
    if (isAuthPage) return response;
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    return withSessionCookies(redirect, response);
  }

  if (!isAuthed && !isAuthPage) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    return withSessionCookies(redirect, response);
  }

  if (isAuthed && isAuthPage) {
    const redirect = NextResponse.redirect(new URL("/", request.url));
    return withSessionCookies(redirect, response);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
