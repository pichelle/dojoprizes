import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, checkPassword, expectedSessionToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/");

  const ok = await checkPassword(password);
  if (!ok) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", next);
    loginUrl.searchParams.set("error", "1");
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const token = await expectedSessionToken();
  const response = NextResponse.redirect(new URL(next || "/", request.url), {
    status: 303,
  });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return response;
}
