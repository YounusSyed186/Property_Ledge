import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Protected application routes
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/subscription') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/onboarding');

  // Auth pages (login, signup, etc.)
  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password');

  if (isProtectedRoute && !user) {
    const redirectTarget = pathname + url.search;
    url.pathname = '/login';
    url.search = `?redirectTo=${encodeURIComponent(redirectTarget)}`;
    return NextResponse.redirect(url);
  }

  if (isAuthPage && user) {
    const planParam = request.nextUrl.searchParams.get('plan');
    const defaultTarget = planParam ? `/checkout?plan=${planParam}` : '/dashboard';
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || defaultTarget;
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return supabaseResponse;
}
