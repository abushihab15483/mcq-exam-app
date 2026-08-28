// Admin route protect — /dashboard আর /exams এর যেকোনো পেজে যাওয়ার আগে
// Supabase session আছে কিনা check করে, না থাকলে /login এ পাঠিয়ে দেয়।
//
// getSession() না, getUser() — cookie-তে যা আছে তাই getSession() না
// যাচাই করেই ফেরত দেয় (forged/hand-crafted cookie দিয়ে bypass সম্ভব —
// দেখো lib/api-auth.ts এর কমেন্ট)। getUser() প্রতিবার Supabase Auth
// server-এ গিয়ে token আসলেই বৈধ কিনা যাচাই করে, তাই এটাই একমাত্র
// trustworthy gate — page route protect করার জন্য এটাই ব্যবহার করা উচিত।
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requireEnv } from "@/lib/supabase/env";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });
  const path = request.nextUrl.pathname;
  const isAdminRoute =
    path.startsWith("/dashboard") || path.startsWith("/exams") || path.startsWith("/results") || path.startsWith("/messages");
  const isLoginRoute = path.startsWith("/login");

  try {
    const supabase = createServerClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request: { headers: request.headers } });
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isAdminRoute && !user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (isLoginRoute && user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return response;
  } catch (err) {
    // env var মিসিং, Supabase project pause (free tier কয়েকদিন idle থাকলে
    // নিজে থেকেই pause হয়ে যায়), বা network blip — আগে এই ক্ষেত্রে middleware
    // পুরো crash করে admin এর প্রতিটা রিকোয়েস্টে raw 500 দেখাত। এখন fail-closed:
    // auth যাচাই করতে না পারলে admin route এ ঢুকতে দেওয়া হবে না (নিরাপদ default),
    // কিন্তু অন্তত সাধারণ /login রিডাইরেক্ট দেখাবে, crash না।
    console.error("[middleware] Supabase auth check ব্যর্থ:", err);
    if (isAdminRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/exams/:path*", "/results/:path*", "/messages/:path*", "/login"],
};
