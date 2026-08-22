"use client";

import { createClient } from "@/lib/supabase/client";

export async function signInWithGoogle() {
  if (typeof window === "undefined") return { success: false, error: "Client-only action" };

  const supabase = createClient();
  const redirectTo = `${window.location.origin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, url: data.url };
}
